import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { getMe, type IssuerProfile } from '@/api/me'
import { resetState } from '@/data'
import { appRoutes } from '@/routes'
import { clerkSession, clerkUser } from '@/test/clerk'
import { createQueryWrapper } from '@/test/query'
import { installVerificationApi, VALID_ID, type VerificationApiStub } from '@/test/verification-api'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).sessionClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/issuers', () => ({
  listIssuers: vi.fn(async () => []),
  getIssuer: vi.fn(async (id: string) => ({
    id,
    name: 'Salud Laboral Río Claro',
    type: 'clinic',
    city: 'Medellín',
    registeredAt: '2026-09-01',
    revokedAt: null,
    certificateTypes: ['height-work'],
    nit: '901.482.317-5',
    contactName: 'Contacto de prueba',
    email: 'contacto@example.co',
    phone: '310 555 0142',
    ministryRegistration: '',
    issuedThisMonth: 0,
  })),
  registerIssuer: vi.fn(),
  revokeIssuer: vi.fn(),
}))
vi.mock('@/api/workers', () => ({
  listWorkers: async () => [
    {
      id: 'w-carlos',
      entityId: 'e-1',
      fullName: 'Carlos Andrés Ramírez Pineda',
      documentType: 'cc',
      documentNumber: '1020345678',
      registeredAt: '2026-09-01',
      consentedAt: '2026-09-01',
    },
  ],
  registerWorker: vi.fn(),
}))
vi.mock('@/api/certificates', () => ({
  listCertificates: async () => [
    {
      number: 4718,
      id: SHEET_ID,
      entityId: 'e-1',
      workerId: 'w-carlos',
      type: 'height-work',
      issuedAt: '2026-10-02',
      validUntil: '2027-10-02',
      annulledAt: null,
    },
  ],
}))

const { SHEET_ID } = vi.hoisted(() => ({ SHEET_ID: '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c' }))

const PROFILE: IssuerProfile = {
  id: 'e-1',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work'],
  nit: '901.482.317-5',
  city: 'Bogotá',
}

const signInIssuer = () => {
  clerkSession.signedIn = true
}

const renderAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
    { wrapper: createQueryWrapper() },
  )
  return router
}

describe('routes', () => {
  let api: VerificationApiStub

  beforeEach(() => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    window.localStorage.clear()
    resetState()
    clerkSession.signedIn = false
    clerkUser.fullName = null
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    api = installVerificationApi()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    api.restore()
  })

  describe('public pages', () => {
    it('shows the landing page at the root', async () => {
      renderAt('/')

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Comprueba en segundos si un trabajador está habilitado.' }),
      ).toBeInTheDocument()
    })

    it('goes from the landing to the issuer login', async () => {
      const router = renderAt('/')

      fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
      const menu = screen.getByRole('group', { name: 'Elige cómo iniciar sesión' })
      fireEvent.click(within(menu).getByRole('link', { name: /Soy una entidad emisora/ }))

      expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
    })

    it('goes from the landing to the admin login', async () => {
      renderAt('/')

      fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
      const menu = screen.getByRole('group', { name: 'Elige cómo iniciar sesión' })
      fireEvent.click(within(menu).getByRole('link', { name: /Administración de HabilitApp/ }))

      expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
    })

    it('shows the issuer login without a session', async () => {
      renderAt('/emisor/ingresar')
      expect(await screen.findByRole('heading', { level: 1, name: 'Panel del emisor' })).toBeInTheDocument()
    })

    it('shows a configuration notice instead of the issuer login when there is no Clerk key', async () => {
      vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', '')
      renderAt('/emisor/ingresar')

      expect(await screen.findByRole('heading', { name: 'El ingreso no está configurado' })).toBeInTheDocument()
    })

    it('shows the admin login without a session', async () => {
      renderAt('/admin/ingresar')
      expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
    })

    it('shows the verification page without any session, with the id in the address', async () => {
      renderAt(`/c/${VALID_ID}`)

      expect(await screen.findByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
    })

    it.each(['/c', '/c/'])('shows No válido for an empty certificate id at %s', async (path) => {
      renderAt(path)

      expect(await screen.findByRole('heading', { name: 'No válido' })).toBeInTheDocument()
    })

    it('shows a not found page for an unknown address', () => {
      renderAt('/no-such-page')

      expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument()
    })
  })

  describe('issuer panel', () => {
    it('sends a visitor without session to the issuer login', async () => {
      const router = renderAt('/emisor/emitir')

      expect(await screen.findByRole('heading', { level: 1, name: 'Panel del emisor' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
    })

    it('shows the pages with the panel layout when signed in', async () => {
      signInIssuer()
      renderAt('/emisor/emitir')

      expect(await screen.findByRole('heading', { name: 'Emitir certificado' })).toBeInTheDocument()
      expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
      expect(within(screen.getByRole('navigation', { name: 'Secciones' })).getByRole('link', { name: 'Trabajadores' })).toHaveAttribute(
        'href',
        '/emisor/trabajadores',
      )
    })

    it('lists the certificates at /emisor/certificados, with no menu item to issue or register (they are reached from the lists)', async () => {
      signInIssuer()
      renderAt('/emisor/certificados')

      expect(await screen.findByRole('heading', { level: 1, name: 'Certificados' })).toBeInTheDocument()
      const links = within(screen.getByRole('navigation', { name: 'Secciones' })).getAllByRole('link')
      expect(links.map((link) => link.textContent)).toEqual(['Certificados', 'Trabajadores'])
      expect(links[0]).toHaveAttribute('aria-current', 'page')
    })

    it('lists the workers at /emisor/trabajadores, with its menu item marked as current', async () => {
      signInIssuer()
      renderAt('/emisor/trabajadores')

      expect(await screen.findByRole('heading', { level: 1, name: 'Trabajadores' })).toBeInTheDocument()
      const nav = within(screen.getByRole('navigation', { name: 'Secciones' }))
      expect(nav.getByRole('link', { name: 'Trabajadores' })).toHaveAttribute('aria-current', 'page')
      expect(nav.getByRole('link', { name: 'Trabajadores' })).toHaveAttribute('href', '/emisor/trabajadores')
    })

    it('shows the HabilitApp logo next to the name in the side bar', async () => {
      signInIssuer()
      renderAt('/emisor/emitir')

      const brand = (await screen.findByRole('complementary')).querySelector('p')
      expect(brand).toHaveTextContent('HabilitApp')
      expect(brand?.querySelector('svg')).toBeInTheDocument()
    })

    it('redirects /emisor to the certificate list', async () => {
      signInIssuer()
      const router = renderAt('/emisor')

      expect(await screen.findByRole('heading', { name: 'Certificados' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/certificados')
    })

    it.each([
      ['/emisor/trabajadores/nuevo', 'Registrar trabajador'],
      [`/emisor/certificados/${SHEET_ID}/hoja`, 'Hoja del certificado HAB-2026-004718'],
    ])('renders %s when signed in', async (path, title) => {
      signInIssuer()
      renderAt(path)

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    })

    it('does not let an admin account in: it ends the session and says the account is not an issuer', async () => {
      signInIssuer()
      vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })
      const router = renderAt('/emisor/emitir')

      expect(await screen.findByRole('heading', { level: 1, name: 'Panel del emisor' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
      expect(screen.getByRole('alert')).toHaveTextContent('Esta cuenta no es de una entidad emisora')
      expect(clerkSession.signedIn).toBe(false)
    })

    it('signs out and goes back to the login', async () => {
      signInIssuer()
      const router = renderAt('/emisor/emitir')

      await screen.findByRole('button', { name: 'Cerrar sesión' })
      await act(async () => {
        screen.getByRole('button', { name: 'Cerrar sesión' }).click()
      })

      expect(await screen.findByRole('heading', { level: 1, name: 'Panel del emisor' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
    })
  })

  describe('admin panel', () => {
    const signInAdmin = () => {
      clerkSession.signedIn = true
      clerkUser.fullName = 'Daniela Rojas'
      vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })
    }

    it('sends a visitor without session to the admin login', async () => {
      const router = renderAt('/admin/emisores')

      expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/admin/ingresar')
    })

    it('shows the pages with the panel layout when signed in, with the Clerk name in the top bar', async () => {
      signInAdmin()
      renderAt('/admin/emisores')

      expect(await screen.findByRole('heading', { name: 'Emisores' })).toBeInTheDocument()
      expect(screen.getByText('Daniela Rojas')).toBeInTheDocument()
      expect(await within(screen.getByRole('main')).findByRole('link', { name: 'Registrar emisor' })).toHaveAttribute(
        'href',
        '/admin/emisores/nuevo',
      )
    })

    it('redirects /admin to the issuers list', async () => {
      signInAdmin()
      const router = renderAt('/admin')

      expect(await screen.findByRole('heading', { name: 'Emisores' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/admin/emisores')
    })

    it('signs out from the top bar and goes back to the admin login', async () => {
      signInAdmin()
      const router = renderAt('/admin/emisores')
      await screen.findByRole('heading', { name: 'Emisores' })

      await act(async () => {
        screen.getByRole('button', { name: 'Cerrar sesión' }).click()
      })

      expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/admin/ingresar')
    })

    it.each([
      ['/admin/emisores/nuevo', 'Registrar emisor'],
      ['/admin/emisores/salud-laboral-rio-claro', 'Salud Laboral Río Claro'],
    ])('renders %s when signed in', async (path, title) => {
      signInAdmin()
      renderAt(path)

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    })

    it('ends the session of an issuer who opens the admin area, with the not-admin reason', async () => {
      signInIssuer()

      const router = renderAt('/admin/emisores')

      expect(await screen.findByText('Esta cuenta no es de administración')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Emisores' })).not.toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/admin/ingresar')
      expect(clerkSession.signedIn).toBe(false)
    })

    it('ends the session of an admin who opens the issuer area, with the not-issuer reason', async () => {
      signInAdmin()

      const router = renderAt('/emisor/emitir')

      expect(await screen.findByText('Esta cuenta no es de una entidad emisora')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
      expect(clerkSession.signedIn).toBe(false)
    })
  })
})
