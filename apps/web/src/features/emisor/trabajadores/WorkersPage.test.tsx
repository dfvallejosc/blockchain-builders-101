import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetState, revokeEntity, signIn } from '@/data'
import * as workersModule from '@/data/workers'
import { issuerRoutes } from '@/features/emisor/routes'
import { createQueryWrapper } from '@/test/query'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).demoClerkModule())
vi.mock('@/api/me', async () => (await import('@/test/clerk')).demoMeModule())

vi.mock('@/data/workers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/workers')>()
  return { ...actual, listWorkers: vi.fn(actual.listWorkers) }
})

const CUMBRE = 'centro-entrenamiento-cumbre-firme'
const CUMBRE_EMAIL = 'coordinacion@cumbrefirme.co'
const LOMAS_EMAIL = 'consultorio@lomasdelsur.co'

const renderPage = async (email = CUMBRE_EMAIL) => {
  await signIn('issuer', email, 'x')
  const router = createMemoryRouter(issuerRoutes, { initialEntries: ['/emisor/trabajadores'] })
  render(<RouterProvider router={router} />, { wrapper: createQueryWrapper() })
  return router
}

const table = () => screen.getByRole('table', { name: 'Tabla de trabajadores' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const waitForRows = async (count = 12) => {
  await screen.findByRole('table', { name: 'Tabla de trabajadores' })
  await waitFor(() => expect(bodyRows()).toHaveLength(count))
}

describe('WorkersPage', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    window.localStorage.clear()
    resetState()
    const actual = await vi.importActual<typeof import('@/data/workers')>('@/data/workers')
    vi.mocked(workersModule.listWorkers).mockReset()
    vi.mocked(workersModule.listWorkers).mockImplementation(actual.listWorkers)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lists the workers of the signed-in entity by name, with their document and the count', async () => {
    await renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Trabajadores' })).toBeInTheDocument()
    await waitForRows()
    expect(bodyRows()[0]).toHaveTextContent('Brayan Stiven Escobar Mora')
    expect(bodyRows()[0]).toHaveTextContent('C.C. 1.000.912.634')
    expect(screen.getByText('Mostrando 12 de 12 trabajadores')).toBeInTheDocument()
    expect(workersModule.listWorkers).toHaveBeenCalledWith(CUMBRE)
  })

  it('repeats the document under the name so a narrow screen can drop the document column', async () => {
    await renderPage()
    await waitForRows()

    const nameCell = within(bodyRows()[0]).getAllByRole('cell')[0]
    expect(nameCell).toHaveTextContent('Brayan Stiven Escobar MoraC.C. 1.000.912.634')
  })

  it('has a link to register a worker', async () => {
    await renderPage()
    await waitForRows()

    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Registrar trabajador' })).toHaveAttribute(
      'href',
      '/emisor/trabajadores/nuevo',
    )
  })

  it('starts the issue flow with that worker chosen from each row', async () => {
    await renderPage()
    await waitForRows()

    const link = within(table()).getByRole('link', { name: 'Emitir certificado a Carlos Andrés Ramírez Pineda' })
    expect(link).toHaveAttribute('href', '/emisor/emitir?trabajador=w-carlos')
    expect(link).toHaveTextContent('Emitir certificado')
  })

  it('finds workers by name or by document, and says so when nothing matches', async () => {
    await renderPage()
    await waitForRows()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar trabajadores' }), { target: { value: 'nicolas' } })
    await waitFor(() => expect(bodyRows()).toHaveLength(1))
    expect(bodyRows()[0]).toHaveTextContent('Nicolás Arango Villegas')
    expect(screen.getByText('Mostrando 1 de 12 trabajadores')).toBeInTheDocument()

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
    await renderPage(LOMAS_EMAIL)

    expect(await screen.findByText('Aún no has registrado trabajadores')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    const links = within(screen.getByRole('main')).getAllByRole('link', { name: 'Registrar trabajador' })
    expect(links.at(-1)).toHaveAttribute('href', '/emisor/trabajadores/nuevo')
  })

  it('shows the skeleton while loading', async () => {
    const actual = await vi.importActual<typeof import('@/data/workers')>('@/data/workers')
    let release: (() => void) | undefined
    vi.mocked(workersModule.listWorkers).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => {
            void actual.listWorkers(CUMBRE).then(resolve)
          }
        }),
    )
    await renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Trabajadores' })
    expect(table()).toHaveAttribute('aria-busy', 'true')
    if (release === undefined) throw new Error('expected the worker load to be pending')
    release()
    await waitForRows()
  })

  it('shows an error with a retry instead of staying on the skeleton, and recovers', async () => {
    vi.mocked(workersModule.listWorkers).mockRejectedValueOnce(new Error('boom'))
    await renderPage()

    expect(await screen.findByText('No pudimos cargar tus trabajadores')).toBeInTheDocument()
    expect(within(table()).queryByRole('link', { name: /Emitir certificado/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitForRows()
  })

  it('keeps the list visible when the entity is revoked, but blocks issuing and registering with the reason', async () => {
    await signIn('issuer', CUMBRE_EMAIL, 'x')
    await revokeEntity(CUMBRE)
    const router = createMemoryRouter(issuerRoutes, { initialEntries: ['/emisor/trabajadores'] })
    render(<RouterProvider router={router} />, { wrapper: createQueryWrapper() })

    await waitForRows()
    expect(screen.getByRole('alert')).toHaveTextContent(/Tu entidad está revocada desde el/)
    const register = screen.getByRole('button', { name: 'Registrar trabajador' })
    expect(register).toBeDisabled()
    expect(register).toHaveAccessibleDescription('No disponible: tu entidad está revocada.')
    const emit = within(table()).getByRole('button', { name: 'Emitir certificado a Carlos Andrés Ramírez Pineda' })
    expect(emit).toBeDisabled()
    expect(emit).toHaveAccessibleDescription('No disponible: tu entidad está revocada.')
    expect(within(screen.getByRole('main')).queryByRole('link', { name: /Emitir certificado/ })).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByRole('link', { name: 'Registrar trabajador' })).not.toBeInTheDocument()
  })
})
