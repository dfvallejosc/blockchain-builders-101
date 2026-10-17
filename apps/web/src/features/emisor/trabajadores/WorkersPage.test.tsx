import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, type IssuerProfile } from '@/api/me'
import { listWorkers } from '@/api/workers'
import type { Worker } from '@/data/types'
import { issuerRoutes } from '@/features/emisor/routes'
import { createQueryWrapper } from '@/test/query'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).signedInClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(), registerWorker: vi.fn() }))

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
  makeWorker('w-brayan', 'Brayan Stiven Escobar Mora', '1000912634'),
  makeWorker('w-carlos', 'Carlos Andrés Ramírez Pineda', '1020345678'),
  makeWorker('w-nicolas', 'Nicolás Arango Villegas', '1017234567'),
  makeWorker('w-paola', 'Paola Andrea Niño Vargas', '52418765'),
]

const renderPage = () => {
  const router = createMemoryRouter(issuerRoutes, { initialEntries: ['/emisor/trabajadores'] })
  render(<RouterProvider router={router} />, { wrapper: createQueryWrapper() })
  return router
}

const table = () => screen.getByRole('table', { name: 'Tabla de trabajadores' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const waitForRows = async (count = WORKERS.length) => {
  await screen.findByRole('table', { name: 'Tabla de trabajadores' })
  await waitFor(() => expect(bodyRows()).toHaveLength(count))
}

describe('WorkersPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    vi.mocked(listWorkers).mockReset().mockResolvedValue(WORKERS)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lists the workers of the API by name, with their document and the count', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Trabajadores' })).toBeInTheDocument()
    await waitForRows()
    expect(bodyRows()[0]).toHaveTextContent('Brayan Stiven Escobar Mora')
    expect(bodyRows()[0]).toHaveTextContent('C.C. 1.000.912.634')
    expect(screen.getByText('Mostrando 4 de 4 trabajadores')).toBeInTheDocument()
    expect(listWorkers).toHaveBeenCalledTimes(1)
  })

  it('repeats the document under the name so a narrow screen can drop the document column', async () => {
    renderPage()
    await waitForRows()

    const nameCell = within(bodyRows()[0]).getAllByRole('cell')[0]
    expect(nameCell).toHaveTextContent('Brayan Stiven Escobar MoraC.C. 1.000.912.634')
  })

  it('has a link to register a worker', async () => {
    renderPage()
    await waitForRows()

    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Registrar trabajador' })).toHaveAttribute(
      'href',
      '/emisor/trabajadores/nuevo',
    )
  })

  it('starts the issue flow with that worker chosen from each row', async () => {
    renderPage()
    await waitForRows()

    const link = within(table()).getByRole('link', { name: 'Emitir certificado a Carlos Andrés Ramírez Pineda' })
    expect(link).toHaveAttribute('href', '/emisor/emitir?trabajador=w-carlos')
    expect(link).toHaveTextContent('Emitir certificado')
  })

  it('finds workers by name or by document, and says so when nothing matches', async () => {
    renderPage()
    await waitForRows()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar trabajadores' }), { target: { value: 'nicolas' } })
    await waitFor(() => expect(bodyRows()).toHaveLength(1))
    expect(bodyRows()[0]).toHaveTextContent('Nicolás Arango Villegas')
    expect(screen.getByText('Mostrando 1 de 4 trabajadores')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar trabajadores' }), { target: { value: '52.418' } })
    await waitFor(() => expect(bodyRows()).toHaveLength(1))
    expect(bodyRows()[0]).toHaveTextContent('Paola Andrea Niño Vargas')

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar trabajadores' }), { target: { value: 'zzz' } })
    expect(await screen.findByText('No encontramos trabajadores')).toBeInTheDocument()
    expect(screen.getByText('Ninguno coincide con “zzz”.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos los trabajadores' }))
    await waitForRows()
  })

  it('shows an empty state with access to register a worker when the entity has none', async () => {
    vi.mocked(listWorkers).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Aún no has registrado trabajadores')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    const links = within(screen.getByRole('main')).getAllByRole('link', { name: 'Registrar trabajador' })
    expect(links.at(-1)).toHaveAttribute('href', '/emisor/trabajadores/nuevo')
  })

  it('shows the skeleton while loading', async () => {
    let release: (workers: Worker[]) => void = () => undefined
    vi.mocked(listWorkers).mockImplementation(
      () =>
        new Promise<Worker[]>((resolve) => {
          release = resolve
        }),
    )
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Trabajadores' })
    expect(table()).toHaveAttribute('aria-busy', 'true')
    release(WORKERS)
    await waitForRows()
  })

  it('shows an error with a retry instead of staying on the skeleton, and recovers', async () => {
    vi.mocked(listWorkers).mockRejectedValueOnce(new Error('boom'))
    renderPage()

    expect(await screen.findByText('No pudimos cargar tus trabajadores')).toBeInTheDocument()
    expect(within(table()).queryByRole('link', { name: /Emitir certificado/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitForRows()
  })
})
