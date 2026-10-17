import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetState, revokeEntity, signIn } from '@/data'
import * as certificatesModule from '@/data/certificates'
import { issuerRoutes } from '@/features/emisor/routes'

vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/data/certificates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/certificates')>()
  return { ...actual, listCertificates: vi.fn(actual.listCertificates) }
})

const CUMBRE = 'centro-entrenamiento-cumbre-firme'
const CUMBRE_EMAIL = 'coordinacion@cumbrefirme.co'
const LOMAS_EMAIL = 'consultorio@lomasdelsur.co'

const renderPage = async (email = CUMBRE_EMAIL) => {
  await signIn('issuer', email, 'x')
  const router = createMemoryRouter(issuerRoutes, { initialEntries: ['/emisor/certificados'] })
  render(<RouterProvider router={router} />)
  return router
}

const table = () => screen.getByRole('table', { name: 'Tabla de certificados' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const rowOf = (id: string) => {
  const row = bodyRows().find((candidate) => candidate.textContent?.includes(id))
  if (!row) throw new Error(`no row for ${id}`)
  return row
}
const waitForRows = async (count = 18) => {
  await screen.findByRole('table', { name: 'Tabla de certificados' })
  await waitFor(() => expect(bodyRows()).toHaveLength(count))
}

describe('CertificatesPage', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    window.localStorage.clear()
    resetState()
    const actual = await vi.importActual<typeof import('@/data/certificates')>('@/data/certificates')
    vi.mocked(certificatesModule.listCertificates).mockReset()
    vi.mocked(certificatesModule.listCertificates).mockImplementation(actual.listCertificates)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('shows the certificates of the signed-in entity, newest first, with the count', async () => {
    await renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Certificados' })).toBeInTheDocument()
    await waitForRows()
    expect(bodyRows()[0]).toHaveTextContent('Carlos Andrés Ramírez Pineda')
    expect(bodyRows()[0]).toHaveTextContent('HAB-2026-004718')
    expect(screen.getByText('Mostrando 18 de 18 certificados')).toBeInTheDocument()
    expect(certificatesModule.listCertificates).toHaveBeenCalledWith(CUMBRE)
  })

  it('shows worker, document, type, number, dates and validity note in each row', async () => {
    await renderPage()
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
    await renderPage()
    await waitForRows()

    expect(within(table()).getAllByText('Habilitado')).toHaveLength(9)
    expect(within(table()).getAllByText('Vencido')).toHaveLength(7)
    expect(within(table()).getAllByText('Anulado')).toHaveLength(2)
    expect(rowOf('HAB-2026-004718').querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('shows a Ver hoja button per row that is disabled and has its own name', async () => {
    await renderPage()
    await waitForRows()

    const buttons = within(table()).getAllByRole('button', { name: /^Ver la hoja del certificado HAB-/ })
    expect(buttons).toHaveLength(18)
    buttons.forEach((button) => expect(button).toBeDisabled())
    expect(within(table()).queryByRole('link')).not.toBeInTheDocument()
  })

  it('searches by worker ignoring accents and updates the count', async () => {
    await renderPage()
    await waitForRows()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar certificados' }), { target: { value: 'ramirez' } })

    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByText('Mostrando 2 de 18 certificados')).toBeInTheDocument()
  })

  it('filters by one or more statuses and clears them', async () => {
    await renderPage()
    await waitForRows()

    const annulled = screen.getByRole('button', { name: 'Anulado' })
    fireEvent.click(annulled)
    expect(annulled).toHaveAttribute('aria-pressed', 'true')
    expect(bodyRows()).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Vencido' }))
    expect(bodyRows()).toHaveLength(9)

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(bodyRows()).toHaveLength(18)
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('says nothing matched and lets the person see everything again, with the focus on the search', async () => {
    await renderPage()
    await waitForRows()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(screen.getByText('No encontramos certificados')).toBeInTheDocument()
    expect(screen.getByText(/Ninguno coincide con “zzz”/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos los certificados' }))

    expect(bodyRows()).toHaveLength(18)
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })

  it('sorts by worker when the header is used', async () => {
    await renderPage()
    await waitForRows()

    fireEvent.click(screen.getByRole('button', { name: /Trabajador/ }))

    expect(bodyRows()[0]).toHaveTextContent('Brayan Stiven Escobar Mora')
  })

  it('shows the empty state with the way to issue when the entity has no certificates', async () => {
    await renderPage(LOMAS_EMAIL)

    expect(await screen.findByText('Aún no has emitido certificados')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Emitir certificado' })).toHaveAttribute(
      'href',
      '/emisor/emitir',
    )
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Anulado' })).not.toBeInTheDocument()
  })

  it('shows the skeleton while loading', async () => {
    const actual = await vi.importActual<typeof import('@/data/certificates')>('@/data/certificates')
    let release: (() => void) | undefined
    vi.mocked(certificatesModule.listCertificates).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => {
            void actual.listCertificates(CUMBRE).then(resolve)
          }
        }),
    )
    await renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Certificados' })
    expect(screen.getByRole('table', { name: 'Tabla de certificados' })).toHaveAttribute('aria-busy', 'true')
    if (release === undefined) throw new Error('expected the certificate load to be pending')
    release()
    await waitForRows()
  })

  it('shows an error with a retry instead of staying on the skeleton, and recovers', async () => {
    vi.mocked(certificatesModule.listCertificates).mockRejectedValueOnce(new Error('boom'))
    await renderPage()

    expect(await screen.findByText('No pudimos cargar tus certificados')).toBeInTheDocument()
    expect(within(table()).queryByRole('button', { name: /Ver la hoja/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitForRows()
  })

  it('keeps the history visible when the entity is revoked, but blocks issuing with the reason', async () => {
    await signIn('issuer', CUMBRE_EMAIL, 'x')
    await revokeEntity(CUMBRE)
    const router = createMemoryRouter(issuerRoutes, { initialEntries: ['/emisor/certificados'] })
    render(<RouterProvider router={router} />)

    await waitForRows()
    expect(screen.getByRole('alert')).toHaveTextContent(/Tu entidad está revocada desde el/)
    const emit = screen.getByRole('button', { name: 'Emitir certificado' })
    expect(emit).toBeDisabled()
    expect(emit).toHaveAccessibleDescription('No disponible: tu entidad está revocada.')
    expect(within(screen.getByRole('main')).queryByRole('link', { name: 'Emitir certificado' })).not.toBeInTheDocument()
  })

  it('shows one issue link in the header when there are certificates', async () => {
    await renderPage()
    await waitForRows()

    expect(within(screen.getByRole('main')).getAllByRole('link', { name: 'Emitir certificado' })).toHaveLength(1)
  })

  it('never shows medical results, restrictions or diagnoses', async () => {
    await renderPage()
    await waitForRows()

    expect(screen.queryByText(/diagnóstic|restricci|resultado/i)).not.toBeInTheDocument()
  })

  it('shows the formatted code in each row and never the uuid', async () => {
    const actual = await vi.importActual<typeof import('@/data/certificates')>('@/data/certificates')
    const real = await actual.listCertificates(CUMBRE)
    const withUuid = real.map((certificate) =>
      certificate.number === 4718 ? { ...certificate, id: '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c' } : certificate,
    )
    vi.mocked(certificatesModule.listCertificates).mockResolvedValueOnce(withUuid)
    await renderPage()
    await waitForRows()

    const row = rowOf('HAB-2026-004718')
    expect(row).toHaveTextContent('HAB-2026-004718')
    expect(within(row).getByRole('button', { name: 'Ver la hoja del certificado HAB-2026-004718' })).toBeDisabled()
    expect(table().textContent).not.toContain('3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c')
    expect(table().querySelector('[aria-label*="3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c"]')).toBeNull()
  })
})
