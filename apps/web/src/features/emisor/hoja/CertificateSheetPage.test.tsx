import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listCertificates } from '@/api/certificates'
import { getMe, type IssuerProfile } from '@/api/me'
import { listWorkers } from '@/api/workers'
import type { Certificate, Worker } from '@/data/types'
import { issuerRoutes } from '@/features/emisor/routes'
import { createQueryWrapper } from '@/test/query'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).signedInClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/certificates', () => ({ listCertificates: vi.fn() }))
vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(), registerWorker: vi.fn() }))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

const VALID_ID = '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c'
const EXPIRED_ID = '4a3c8d2f-0e5b-4f7c-9b2d-6e8f0a1b2c3d'
const ANNULLED_ID = '5b4d9e30-1f6c-4a8d-8c3e-7f901b2c3d4e'
const UNKNOWN_ID = '11111111-2222-4333-8444-555555555555'

const PROFILE: IssuerProfile = {
  id: 'e-1',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work'],
  nit: '901.456.223-8',
  city: 'Medellín',
}

const WORKER: Worker = {
  id: 'w-carlos',
  entityId: 'e-1',
  fullName: 'Carlos Andrés Ramírez Pineda',
  documentType: 'cc',
  documentNumber: '1020345678',
  registeredAt: '2026-09-01',
  consentedAt: '2026-09-01',
}

const makeCertificate = (overrides: Partial<Certificate>): Certificate => ({
  number: 4718,
  id: VALID_ID,
  entityId: 'e-1',
  workerId: 'w-carlos',
  type: 'height-work',
  issuedAt: '2026-10-02',
  validUntil: '2027-10-02',
  annulledAt: null,
  ...overrides,
})

const CERTIFICATES: Certificate[] = [
  makeCertificate({}),
  makeCertificate({ id: EXPIRED_ID, number: 3981, issuedAt: '2025-09-22', validUntil: '2026-09-22' }),
  makeCertificate({ id: ANNULLED_ID, number: 4655, annulledAt: '2026-10-03' }),
]

const renderSheet = (id: string) => {
  const router = createMemoryRouter(issuerRoutes, { initialEntries: [`/emisor/certificados/${id}/hoja`] })
  render(<RouterProvider router={router} />, { wrapper: createQueryWrapper() })
  return router
}

describe('CertificateSheetPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    vi.mocked(listCertificates).mockReset().mockResolvedValue(CERTIFICATES)
    vi.mocked(listWorkers).mockReset().mockResolvedValue([WORKER])
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
    vi.spyOn(window, 'print').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the sheet of a valid certificate and prints it', async () => {
    renderSheet(VALID_ID)

    expect(await screen.findByRole('group', { name: 'Certificado HAB-2026-004718' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Hoja del certificado HAB-2026-004718' })).toBeInTheDocument()
    expect(screen.getByTestId('qr')).toHaveAttribute('data-value', `${window.location.origin}/c/${VALID_ID}`)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Descargar o imprimir/ }))

    expect(window.print).toHaveBeenCalledTimes(1)
    expect(document.title).toBe('Certificado HAB-2026-004718 · Carlos Andrés Ramírez Pineda')
  })

  it('takes the entity name, NIT and city from the profile of the API', async () => {
    renderSheet(VALID_ID)

    const sheet = await screen.findByRole('group', { name: 'Certificado HAB-2026-004718' })
    expect(sheet).toHaveTextContent('Centro de Entrenamiento Cumbre Firme')
    expect(sheet).toHaveTextContent('NIT 901.456.223-8 · Medellín')
    expect(getMe).toHaveBeenCalled()
  })

  it('shows the formatted code in the heading and title while the URLs keep the uuid', async () => {
    renderSheet(VALID_ID)

    await screen.findByRole('group', { name: 'Certificado HAB-2026-004718' })
    document.querySelectorAll('.sheet__url').forEach((url) => url.remove())
    expect(document.body.textContent).not.toContain(VALID_ID)
  })

  it('hides the bar and notices from the printed page', async () => {
    renderSheet(VALID_ID)
    const button = await screen.findByRole('button', { name: /Descargar o imprimir/ })

    expect(button.closest('.print\\:hidden')).not.toBeNull()
    expect(screen.getByRole('group').closest('.print\\:hidden')).toBeNull()
  })

  it('warns about an expired certificate but still lets you print it', async () => {
    renderSheet(EXPIRED_ID)

    expect(await screen.findByText('Este certificado venció el 22 de septiembre de 2026')).toBeInTheDocument()
    expect(screen.getByText('Este certificado venció el 22 de septiembre de 2026').closest('.print\\:hidden')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Descargar o imprimir/ })).toBeEnabled()
  })

  it('blocks an annulled certificate on screen and in print', async () => {
    renderSheet(ANNULLED_ID)

    expect(await screen.findByRole('alert')).toHaveTextContent('Este certificado está anulado')
    expect(screen.getByRole('alert')).toHaveTextContent('Nadie puede usarlo. No lo entregues al trabajador.')
    const button = screen.getByRole('button', { name: /Descargar o imprimir/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('No disponible: el certificado está anulado.')
    expect(screen.getByRole('group').closest('.print\\:hidden')).not.toBeNull()

    fireEvent.click(button)
    expect(window.print).not.toHaveBeenCalled()
  })

  it('treats an unknown certificate as not found', async () => {
    renderSheet(UNKNOWN_ID)

    expect(await screen.findByText('No encontramos este certificado')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Emitir un certificado' })).toHaveAttribute('href', '/emisor/emitir')
  })

  it('treats an id that is not a uuid as not found', async () => {
    renderSheet('no-es-uuid')

    expect(await screen.findByText('No encontramos este certificado')).toBeInTheDocument()
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()
  })

  it('replaces the worker name in the document title when the certificate is not found', async () => {
    const router = renderSheet(VALID_ID)

    await screen.findByRole('group', { name: 'Certificado HAB-2026-004718' })
    expect(document.title).toBe('Certificado HAB-2026-004718 · Carlos Andrés Ramírez Pineda')

    await router.navigate(`/emisor/certificados/${UNKNOWN_ID}/hoja`)

    expect(await screen.findByText('No encontramos este certificado')).toBeInTheDocument()
    expect(document.title).toBe(`Certificado ${UNKNOWN_ID}`)
  })

  it('shows an error with a retry when the data fails to load, and recovers', async () => {
    vi.mocked(listCertificates).mockRejectedValueOnce(new Error('boom'))
    renderSheet(VALID_ID)

    expect(await screen.findByText('No pudimos cargar el certificado')).toBeInTheDocument()
    expect(screen.queryByText('No encontramos este certificado')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('group', { name: 'Certificado HAB-2026-004718' })).toBeInTheDocument()
  })
})
