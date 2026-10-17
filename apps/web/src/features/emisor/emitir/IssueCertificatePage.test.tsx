import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { issueCertificate, listCertificates } from '@/api/certificates'
import { getMe, type IssuerProfile } from '@/api/me'
import { listWorkers } from '@/api/workers'
import { DataError } from '@/data/errors'
import type { Certificate, Worker } from '@/data/types'
import { issuerRoutes } from '@/features/emisor/routes'
import { createQueryWrapper } from '@/test/query'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).signedInClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(), registerWorker: vi.fn() }))
vi.mock('@/api/certificates', () => ({ listCertificates: vi.fn(), issueCertificate: vi.fn() }))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

const PROFILE: IssuerProfile = {
  id: 'e-1',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work', 'confined-spaces'],
  nit: '901.482.317-5',
  city: 'Bogotá',
}
const SANDRA: Worker = {
  id: 'w-sandra',
  entityId: 'e-1',
  fullName: 'Sandra Milena Lozano Pardo',
  documentType: 'cc',
  documentNumber: '1032774019',
  registeredAt: '2026-09-01',
  consentedAt: '2026-09-01',
}
const CARLOS: Worker = { ...SANDRA, id: 'w-carlos', fullName: 'Carlos Andrés Ramírez Pineda', documentNumber: '1020345678' }
const CREATED: Certificate = {
  number: 4801,
  id: '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c',
  entityId: 'e-1',
  workerId: 'w-sandra',
  type: 'height-work',
  issuedAt: '2026-10-09',
  validUntil: '2027-10-09',
  annulledAt: null,
}
const CARLOS_VALID: Certificate = {
  ...CREATED,
  number: 10,
  id: '11111111-1111-4111-8111-111111111111',
  workerId: 'w-carlos',
  validUntil: '2027-01-01',
}

const renderAt = (path: string) => {
  const router = createMemoryRouter(issuerRoutes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { wrapper: createQueryWrapper() })
  return router
}

const chooseSandra = async () => {
  fireEvent.click(await screen.findByRole('radio', { name: 'Elegir a Sandra Milena Lozano Pardo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

const goToReview = async () => {
  await chooseSandra()
  fireEvent.change(await screen.findByLabelText(/Tipo de certificado/), { target: { value: 'height-work' } })
  fireEvent.change(screen.getByLabelText(/Vigente hasta/), { target: { value: '2027-10-09' } })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar resumen' }))
  await screen.findByRole('heading', { name: 'Revisa antes de emitir' })
}

describe('IssueCertificatePage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    vi.mocked(listWorkers).mockReset().mockResolvedValue([SANDRA, CARLOS])
    vi.mocked(listCertificates).mockReset().mockResolvedValue([CARLOS_VALID])
    vi.mocked(issueCertificate).mockReset().mockResolvedValue(CREATED)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('issues a certificate through the four steps and shows its code and QR', async () => {
    renderAt('/emisor/emitir')

    expect(await screen.findByRole('heading', { level: 1, name: 'Emitir certificado' })).toBeInTheDocument()
    await goToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))

    expect(await screen.findByText('Certificado emitido')).toBeInTheDocument()
    expect(issueCertificate).toHaveBeenCalledWith({
      workerId: 'w-sandra',
      type: 'height-work',
      issuedAt: '2026-10-09',
      validUntil: '2027-10-09',
    })
    expect(screen.getByText(/El certificado HAB-2026-004801 de Sandra Milena Lozano Pardo/)).toBeInTheDocument()
    const codes = screen.getAllByTestId('qr')
    expect(codes).toHaveLength(2)
    codes.forEach((code) => expect(code).toHaveAttribute('data-value', `${window.location.origin}/c/${CREATED.id}`))
    expect(screen.getByRole('heading', { name: 'Vista previa del certificado' })).toBeInTheDocument()
  })

  it('marks the current step and moves the focus to its heading', async () => {
    renderAt('/emisor/emitir')
    const steps = await screen.findByRole('list', { name: 'Pasos' })
    expect(within(steps).getAllByRole('listitem')).toHaveLength(4)

    await chooseSandra()

    const heading = await screen.findByRole('heading', { name: 'Datos del certificado' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(within(steps).getByText('Datos del certificado').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('offers only the types of the issuer profile', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: { ...PROFILE, certificateTypes: ['confined-spaces'] } })
    renderAt('/emisor/emitir')
    await chooseSandra()

    const options = within(await screen.findByLabelText(/Tipo de certificado/)).getAllByRole('option')

    expect(options.map((option) => option.textContent)).toEqual(['Elige un tipo', 'Espacios confinados'])
  })

  it('goes back to edit without losing what was typed', async () => {
    renderAt('/emisor/emitir')
    await goToReview()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a editar' }))

    expect(await screen.findByLabelText(/Vigente hasta/)).toHaveValue('2027-10-09')
  })

  it('starts on the details step with the worker from the address', async () => {
    renderAt('/emisor/emitir?trabajador=w-sandra&nuevo=1')

    expect(await screen.findByRole('heading', { name: 'Datos del certificado' })).toBeInTheDocument()
    expect(screen.getByText('Sandra Milena Lozano Pardo')).toBeInTheDocument()
    expect(screen.getByText('Trabajador registrado')).toBeInTheDocument()
  })

  it('shows "Trabajador registrado" only for the worker that came from the address', async () => {
    renderAt('/emisor/emitir?trabajador=w-sandra&nuevo=1')
    await screen.findByText('Trabajador registrado')

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar trabajador' }))
    fireEvent.click(await screen.findByRole('radio', { name: 'Elegir a Carlos Andrés Ramírez Pineda' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('heading', { name: 'Datos del certificado' })).toBeInTheDocument()
    expect(screen.queryByText('Trabajador registrado')).not.toBeInTheDocument()
  })

  it('falls back to the first step for an unknown worker', async () => {
    renderAt('/emisor/emitir?trabajador=w-nobody')

    expect(await screen.findByRole('heading', { name: 'Elige al trabajador' })).toBeInTheDocument()
  })

  it('shows a loading state and then a retry when the data cannot be loaded', async () => {
    vi.mocked(listWorkers).mockRejectedValueOnce(new DataError('unavailable')).mockResolvedValue([SANDRA, CARLOS])
    renderAt('/emisor/emitir')

    expect(await screen.findByText('No pudimos cargar tus datos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Elige al trabajador' })).toBeInTheDocument()
  })

  it('blocks a duplicate in the details step and offers to see the certificates', async () => {
    renderAt('/emisor/emitir?trabajador=w-carlos')

    fireEvent.change(await screen.findByLabelText(/Tipo de certificado/), { target: { value: 'height-work' } })

    expect(await screen.findByText(/ya tiene este certificado habilitado hasta el 1 de enero de 2027/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisar resumen' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Ver certificados' })).toHaveAttribute('href', '/emisor/certificados')
  })

  it('explains a duplicate rejected by the API and stays on the review step', async () => {
    vi.mocked(issueCertificate).mockRejectedValue(new DataError('duplicate'))
    renderAt('/emisor/emitir')
    await goToReview()

    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))

    expect(
      await screen.findByText(
        'Sandra Milena Lozano Pardo ya tiene este certificado habilitado. Podrás emitir otro cuando venza, o si lo anulas.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Revisa antes de emitir' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a editar' }))
    expect(await screen.findByRole('heading', { name: 'Datos del certificado' })).toBeInTheDocument()
  })

  it('blocks the duplicate in the details step after the API rejected it on issue', async () => {
    vi.mocked(issueCertificate).mockRejectedValue(new DataError('duplicate'))
    renderAt('/emisor/emitir')
    await goToReview()
    vi.mocked(listCertificates).mockResolvedValue([CARLOS_VALID, { ...CREATED, validUntil: '2027-03-01' }])

    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))
    await screen.findByText(/ya tiene este certificado habilitado\. Podrás/)
    fireEvent.click(screen.getByRole('button', { name: 'Volver a editar' }))

    expect(await screen.findByText(/ya tiene este certificado habilitado hasta el 1 de marzo de 2027/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisar resumen' })).toBeDisabled()
  })

  it.each([
    ['unauthorized', 'Tu sesión venció'],
    ['entity-revoked', 'Tu entidad fue revocada'],
  ] as const)('ends the session and goes to the login when issuing fails with %s', async (code, title) => {
    vi.mocked(issueCertificate).mockRejectedValue(new DataError(code))
    const router = renderAt('/emisor/emitir')
    await goToReview()

    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(title)
    expect(router.state.location.pathname).toBe('/emisor/ingresar')
    expect(screen.queryByText('No pudimos emitir el certificado')).not.toBeInTheDocument()
  })

  it('shows a generic error without details when issuing fails', async () => {
    vi.mocked(issueCertificate).mockRejectedValue(new DataError('invalid-input'))
    renderAt('/emisor/emitir')
    await goToReview()

    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))

    expect(await screen.findByText('No pudimos emitir el certificado')).toBeInTheDocument()
    expect(screen.getByText('Revisa los datos e inténtalo de nuevo.')).toBeInTheDocument()
  })

  it('issues another certificate from a clean first step that reflects the new one', async () => {
    renderAt('/emisor/emitir')
    await goToReview()
    vi.mocked(listCertificates).mockResolvedValue([CREATED, CARLOS_VALID])
    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))
    await screen.findByText('Certificado emitido')

    fireEvent.click(screen.getByRole('button', { name: 'Emitir otro certificado' }))

    expect(await screen.findByRole('heading', { name: 'Elige al trabajador' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Sandra Milena Lozano Pardo').closest('tr')).toHaveTextContent('1'))
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('uses no blockchain wording on any step', async () => {
    renderAt('/emisor/emitir')
    await goToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))
    await screen.findByText('Certificado emitido')

    expect(document.body.textContent).not.toMatch(/blockchain|hash|stellar|token|wallet|cadena de bloques/i)
  })
})
