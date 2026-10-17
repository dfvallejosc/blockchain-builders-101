import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { annulCertificate, listCertificates } from '@/api/certificates'
import { getMe, type IssuerProfile } from '@/api/me'
import { listWorkers } from '@/api/workers'
import { ToastProvider } from '@/components/ui/toast'
import { DataError } from '@/data'
import type { Certificate, Worker } from '@/data/types'
import { issuerRoutes } from '@/features/emisor/routes'
import { createQueryWrapper } from '@/test/query'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).signedInClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/certificates', () => ({ listCertificates: vi.fn(), annulCertificate: vi.fn() }))
vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(), registerWorker: vi.fn() }))

const VALID_ID = '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c'
const SOON_ID = '6c5e0f41-2a7d-4b9e-9d4f-80a12c3d4e5f'
const EXPIRED_ID = '4a3c8d2f-0e5b-4f7c-9b2d-6e8f0a1b2c3d'
const ANNULLED_ID = '5b4d9e30-1f6c-4a8d-8c3e-7f901b2c3d4e'

const PROFILE: IssuerProfile = {
  id: 'e-1',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work'],
  nit: '901.456.223-8',
  city: 'Medellín',
}

const makeWorker = (id: string, fullName: string, documentNumber: string): Worker => ({
  id,
  entityId: 'e-1',
  fullName,
  documentType: 'cc',
  documentNumber,
  registeredAt: '2026-09-01',
  consentedAt: '2026-09-01',
})

const WORKERS: Worker[] = [
  makeWorker('w-carlos', 'Carlos Andrés Ramírez Pineda', '1020345678'),
  makeWorker('w-brayan', 'Brayan Stiven Escobar Mora', '1000912634'),
  makeWorker('w-paola', 'Paola Andrea Niño Vargas', '52418765'),
]

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
  makeCertificate({
    id: ANNULLED_ID,
    number: 4655,
    workerId: 'w-paola',
    issuedAt: '2026-09-01',
    validUntil: '2027-09-01',
    annulledAt: '2026-09-03',
  }),
  makeCertificate({
    id: SOON_ID,
    number: 4112,
    workerId: 'w-brayan',
    issuedAt: '2025-11-14',
    validUntil: '2026-11-14',
  }),
  makeCertificate({ id: EXPIRED_ID, number: 3981, issuedAt: '2025-09-22', validUntil: '2026-09-22' }),
]

const renderPage = () => {
  const router = createMemoryRouter(issuerRoutes, { initialEntries: ['/emisor/certificados'] })
  const Wrapper = createQueryWrapper()
  render(
    <Wrapper>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </Wrapper>,
  )
  return router
}

const table = () => screen.getByRole('table', { name: 'Tabla de certificados' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const rowOf = (code: string) => {
  const row = bodyRows().find((candidate) => candidate.textContent?.includes(code))
  if (!row) throw new Error(`no row for ${code}`)
  return row
}
const waitForRows = async (count = CERTIFICATES.length) => {
  await screen.findByRole('table', { name: 'Tabla de certificados' })
  await waitFor(() => expect(bodyRows()).toHaveLength(count))
}

const openAnnulDialog = (code: string) =>
  fireEvent.click(within(rowOf(code)).getByRole('button', { name: `Anular el certificado ${code}` }))
const typeConfirmation = (text = 'anular') =>
  fireEvent.change(screen.getByLabelText('Escribe ANULAR para confirmar'), { target: { value: text } })
const confirmButton = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Anular certificado' })

describe('CertificatesPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    vi.mocked(listCertificates).mockReset().mockResolvedValue(CERTIFICATES)
    vi.mocked(listWorkers).mockReset().mockResolvedValue(WORKERS)
    vi.mocked(annulCertificate).mockReset()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('shows the certificates of the API with the count', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Certificados' })).toBeInTheDocument()
    await waitForRows()
    expect(bodyRows()[0]).toHaveTextContent('Carlos Andrés Ramírez Pineda')
    expect(bodyRows()[0]).toHaveTextContent('HAB-2026-004718')
    expect(screen.getByText('Mostrando 4 de 4 certificados')).toBeInTheDocument()
    expect(listCertificates).toHaveBeenCalledTimes(1)
    expect(listWorkers).toHaveBeenCalledTimes(1)
  })

  it('shows worker, document, type, number, dates and validity note in each row', async () => {
    renderPage()
    await waitForRows()

    const row = rowOf('HAB-2026-004718')
    expect(row).toHaveTextContent('C.C. 1.020.345.678')
    expect(row).toHaveTextContent('Trabajo en alturas')
    expect(row).toHaveTextContent('02 oct 2026')
    expect(row).toHaveTextContent('02 oct 2027')
    expect(row).toHaveTextContent('Vigente')
    expect(rowOf('HAB-2025-004112')).toHaveTextContent('Vence en 36 días')
    expect(rowOf('HAB-2025-003981')).toHaveTextContent('Venció hace 17 días')
    expect(rowOf('HAB-2026-004655')).toHaveTextContent('Anulado el 03 sep 2026')
  })

  it('tells every status with its word (the chip also carries an icon)', async () => {
    renderPage()
    await waitForRows()

    expect(within(table()).getAllByText('Habilitado')).toHaveLength(2)
    expect(within(table()).getAllByText('Vencido')).toHaveLength(1)
    expect(within(table()).getAllByText('Anulado')).toHaveLength(1)
    expect(rowOf('HAB-2026-004718').querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('links Ver hoja of each row to its sheet by uuid, with the code in its name', async () => {
    renderPage()
    await waitForRows()

    const link = within(rowOf('HAB-2026-004718')).getByRole('link', { name: 'Ver la hoja del certificado HAB-2026-004718' })
    expect(link).toHaveAttribute('href', `/emisor/certificados/${VALID_ID}/hoja`)
    expect(within(table()).getAllByRole('link', { name: /^Ver la hoja del certificado HAB-/ })).toHaveLength(4)
  })

  it('offers Anular on Habilitado and Vencido rows but not on Anulado ones', async () => {
    renderPage()
    await waitForRows()

    expect(within(rowOf('HAB-2026-004718')).getByRole('button', { name: 'Anular el certificado HAB-2026-004718' })).toBeInTheDocument()
    expect(within(rowOf('HAB-2025-003981')).getByRole('button', { name: 'Anular el certificado HAB-2025-003981' })).toBeInTheDocument()
    const annulled = rowOf('HAB-2026-004655')
    expect(within(annulled).queryByRole('button', { name: /Anular/ })).not.toBeInTheDocument()
    expect(within(annulled).getByRole('link', { name: /Ver la hoja/ })).toBeInTheDocument()
    expect(within(table()).getAllByRole('button', { name: /^Anular el certificado/ })).toHaveLength(3)
  })

  it('searches by worker ignoring accents and updates the count', async () => {
    renderPage()
    await waitForRows()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar certificados' }), { target: { value: 'ramirez' } })

    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByText('Mostrando 2 de 4 certificados')).toBeInTheDocument()
  })

  it('filters by one or more statuses and clears them', async () => {
    renderPage()
    await waitForRows()

    const annulled = screen.getByRole('button', { name: 'Anulado' })
    fireEvent.click(annulled)
    expect(annulled).toHaveAttribute('aria-pressed', 'true')
    expect(bodyRows()).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Vencido' }))
    expect(bodyRows()).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(bodyRows()).toHaveLength(4)
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('says nothing matched and lets the person see everything again, with the focus on the search', async () => {
    renderPage()
    await waitForRows()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(screen.getByText('No encontramos certificados')).toBeInTheDocument()
    expect(screen.getByText(/Ninguno coincide con “zzz”/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos los certificados' }))

    expect(bodyRows()).toHaveLength(4)
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })

  it('sorts by worker when the header is used', async () => {
    renderPage()
    await waitForRows()

    fireEvent.click(screen.getByRole('button', { name: /Trabajador/ }))

    expect(bodyRows()[0]).toHaveTextContent('Brayan Stiven Escobar Mora')
  })

  it('shows the empty state with the way to issue when the entity has no certificates', async () => {
    vi.mocked(listCertificates).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Aún no has emitido certificados')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Emitir certificado' })).toHaveAttribute(
      'href',
      '/emisor/emitir',
    )
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('shows the skeleton while loading', async () => {
    let release: (() => void) | undefined
    vi.mocked(listCertificates).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(CERTIFICATES)
        }),
    )
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Certificados' })
    expect(screen.getByRole('table', { name: 'Tabla de certificados' })).toHaveAttribute('aria-busy', 'true')
    if (release === undefined) throw new Error('expected the certificate load to be pending')
    release()
    await waitForRows()
  })

  it('shows an error with a retry instead of staying on the skeleton, and recovers', async () => {
    vi.mocked(listCertificates).mockRejectedValueOnce(new Error('boom'))
    renderPage()

    expect(await screen.findByText('No pudimos cargar tus certificados')).toBeInTheDocument()
    expect(within(table()).queryByRole('link', { name: /Ver la hoja/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitForRows()
  })

  it('shows one issue link in the header when there are certificates', async () => {
    renderPage()
    await waitForRows()

    expect(within(screen.getByRole('main')).getAllByRole('link', { name: 'Emitir certificado' })).toHaveLength(1)
  })

  it('never shows medical results, restrictions or diagnoses', async () => {
    renderPage()
    await waitForRows()

    expect(screen.queryByText(/diagnóstic|restricci|resultado/i)).not.toBeInTheDocument()
  })

  it('shows the formatted code and never the uuid in text or accessible names', async () => {
    renderPage()
    await waitForRows()

    expect(table().textContent).not.toContain(VALID_ID)
    expect(table().querySelector(`[aria-label*="${VALID_ID}"]`)).toBeNull()
  })

  describe('annulling', () => {
    it('opens the dialog for the row with its code and enables the red button after typing anular', async () => {
      renderPage()
      await waitForRows()

      openAnnulDialog('HAB-2026-004718')

      const dialog = screen.getByRole('dialog', { name: 'Anular certificado' })
      expect(dialog).toHaveTextContent('Vas a anular el certificado HAB-2026-004718. No se puede deshacer.')
      expect(dialog.textContent).not.toContain(VALID_ID)
      expect(confirmButton()).toBeDisabled()
      typeConfirmation('AnUlAr')
      expect(confirmButton()).toBeEnabled()
    })

    it('annuls once even on a double click, shows the toast and the row becomes Anulado after the refresh', async () => {
      vi.mocked(listCertificates)
        .mockResolvedValueOnce(CERTIFICATES)
        .mockResolvedValue(
          CERTIFICATES.map((certificate) =>
            certificate.id === VALID_ID ? { ...certificate, annulledAt: '2026-10-09' } : certificate,
          ),
        )
      let finish: (certificate: Certificate) => void = () => undefined
      vi.mocked(annulCertificate).mockReturnValue(new Promise((resolve) => (finish = resolve)))
      renderPage()
      await waitForRows()

      openAnnulDialog('HAB-2026-004718')
      typeConfirmation()
      const button = confirmButton()
      fireEvent.click(button)
      await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' })).toBeDisabled())
      fireEvent.click(button)
      finish({ ...CERTIFICATES[0], annulledAt: '2026-10-09' })

      expect(await screen.findByText('Certificado anulado')).toBeInTheDocument()
      expect(screen.getByText('HAB-2026-004718 ya no se puede usar.')).toBeInTheDocument()
      expect(annulCertificate).toHaveBeenCalledTimes(1)
      expect(annulCertificate).toHaveBeenCalledWith(VALID_ID)
      await waitFor(() => expect(rowOf('HAB-2026-004718')).toHaveTextContent('Anulado'))
      expect(within(rowOf('HAB-2026-004718')).queryByRole('button', { name: /Anular/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('says it was already annulled inside the dialog and refreshes the list on a 409', async () => {
      vi.mocked(annulCertificate).mockRejectedValue(new DataError('duplicate'))
      renderPage()
      await waitForRows()

      openAnnulDialog('HAB-2026-004718')
      typeConfirmation()
      fireEvent.click(confirmButton())

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
        'Este certificado ya estaba anulado.',
      )
      await waitFor(() => expect(listCertificates).toHaveBeenCalledTimes(2))
    })

    it('shows a generic message on any other error', async () => {
      vi.mocked(annulCertificate).mockRejectedValue(new DataError('unavailable'))
      renderPage()
      await waitForRows()

      openAnnulDialog('HAB-2025-003981')
      typeConfirmation()
      fireEvent.click(confirmButton())

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
        'No pudimos anular el certificado. Inténtalo de nuevo.',
      )
      expect(listCertificates).toHaveBeenCalledTimes(1)
    })

    it('does not close with Escape or the backdrop while the request is in flight', async () => {
      vi.mocked(annulCertificate).mockReturnValue(new Promise(() => undefined))
      renderPage()
      await waitForRows()

      openAnnulDialog('HAB-2026-004718')
      typeConfirmation()
      fireEvent.click(confirmButton())
      const dialog = screen.getByRole('dialog')
      await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled())
      fireEvent(dialog, new Event('cancel', { cancelable: true }))
      fireEvent.click(dialog)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    })

    it('closes with Cancelar without annulling', async () => {
      renderPage()
      await waitForRows()

      openAnnulDialog('HAB-2026-004718')
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(annulCertificate).not.toHaveBeenCalled()
    })
  })
})
