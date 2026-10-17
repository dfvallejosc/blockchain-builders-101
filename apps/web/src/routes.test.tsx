import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { resetState, signIn } from '@/data'
import { appRoutes } from '@/routes'

const renderAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  )
  return router
}

describe('routes', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
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

    it('shows the admin login without a session', async () => {
      renderAt('/admin/ingresar')
      expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
    })

    it('shows the verification page without any session, with the id in the address', async () => {
      renderAt('/c/HAB-2026-004718')

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
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      renderAt('/emisor/emitir')

      expect(await screen.findByRole('heading', { name: 'Emitir certificado' })).toBeInTheDocument()
      expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
      expect(within(screen.getByRole('navigation', { name: 'Secciones' })).getByRole('link', { name: 'Trabajadores' })).toHaveAttribute(
        'href',
        '/emisor/trabajadores',
      )
    })

    it('lists the certificates at /emisor/certificados, with no menu item to issue or register (they are reached from the lists)', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      renderAt('/emisor/certificados')

      expect(await screen.findByRole('heading', { level: 1, name: 'Certificados' })).toBeInTheDocument()
      const links = within(screen.getByRole('navigation', { name: 'Secciones' })).getAllByRole('link')
      expect(links.map((link) => link.textContent)).toEqual(['Certificados', 'Trabajadores'])
      expect(links[0]).toHaveAttribute('aria-current', 'page')
    })

    it('lists the workers at /emisor/trabajadores, with its menu item marked as current', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      renderAt('/emisor/trabajadores')

      expect(await screen.findByRole('heading', { level: 1, name: 'Trabajadores' })).toBeInTheDocument()
      const nav = within(screen.getByRole('navigation', { name: 'Secciones' }))
      expect(nav.getByRole('link', { name: 'Trabajadores' })).toHaveAttribute('aria-current', 'page')
      expect(nav.getByRole('link', { name: 'Trabajadores' })).toHaveAttribute('href', '/emisor/trabajadores')
    })

    it('shows the HabilitApp logo next to the name in the side bar', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      renderAt('/emisor/emitir')

      const brand = (await screen.findByRole('complementary')).querySelector('p')
      expect(brand).toHaveTextContent('HabilitApp')
      expect(brand?.querySelector('svg')).toBeInTheDocument()
    })

    it('redirects /emisor to the issue page', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      const router = renderAt('/emisor')

      expect(await screen.findByRole('heading', { name: 'Emitir certificado' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/emitir')
    })

    it.each([
      ['/emisor/trabajadores/nuevo', 'Registrar trabajador'],
      ['/emisor/certificados/HAB-2026-004718/hoja', 'Hoja del certificado HAB-2026-004718'],
    ])('renders %s when signed in', async (path, title) => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      renderAt(path)

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    })

    it('does not let an admin session in', async () => {
      await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
      const router = renderAt('/emisor/emitir')

      expect(await screen.findByRole('heading', { level: 1, name: 'Panel del emisor' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
    })

    it('signs out and goes back to the login', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
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
    it('sends a visitor without session to the admin login', async () => {
      const router = renderAt('/admin/emisores')

      expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/admin/ingresar')
    })

    it('shows the pages with the panel layout when signed in', async () => {
      await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
      renderAt('/admin/emisores')

      expect(await screen.findByRole('heading', { name: 'Emisores' })).toBeInTheDocument()
      expect(screen.getByText('Daniela Rojas')).toBeInTheDocument()
      expect(await within(screen.getByRole('main')).findByRole('link', { name: 'Registrar emisor' })).toHaveAttribute(
        'href',
        '/admin/emisores/nuevo',
      )
    })

    it('redirects /admin to the issuers list', async () => {
      await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
      const router = renderAt('/admin')

      expect(await screen.findByRole('heading', { name: 'Emisores' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/admin/emisores')
    })

    it('signs out from the top bar and goes back to the admin login', async () => {
      await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
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
      await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
      renderAt(path)

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    })

    it('does not let an issuer session in', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      const router = renderAt('/admin/emisores')

      expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/admin/ingresar')
    })
  })
})
