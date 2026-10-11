import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetState, signIn } from '@/data'
import { appRoutes } from '@/routes'

const renderAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('routes', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
  })

  describe('public pages', () => {
    it('shows the home page with the two panel entries', () => {
      renderAt('/')

      expect(screen.getByRole('link', { name: 'Panel del emisor' })).toHaveAttribute('href', '/emisor/ingresar')
      expect(screen.getByRole('link', { name: 'Panel de administración' })).toHaveAttribute(
        'href',
        '/admin/ingresar',
      )
    })

    it('shows the login placeholders without a session', () => {
      renderAt('/emisor/ingresar')
      expect(screen.getByRole('heading', { name: 'Ingreso del emisor' })).toBeInTheDocument()
    })

    it('shows the admin login placeholder without a session', () => {
      renderAt('/admin/ingresar')
      expect(screen.getByRole('heading', { name: 'Ingreso de administración' })).toBeInTheDocument()
    })

    it('shows the verification page without any session, with the id in the address', () => {
      renderAt('/c/HAB-2026-004718')

      expect(screen.getByRole('heading', { name: 'Verificación del certificado' })).toBeInTheDocument()
    })

    it('shows a not found page for an unknown address', () => {
      renderAt('/no-such-page')

      expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument()
    })
  })

  describe('issuer panel', () => {
    it('sends a visitor without session to the issuer login', async () => {
      const router = renderAt('/emisor/emitir')

      expect(await screen.findByRole('heading', { name: 'Ingreso del emisor' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
    })

    it('shows the pages with the panel layout when signed in', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      renderAt('/emisor/emitir')

      expect(await screen.findByRole('heading', { name: 'Emitir certificado' })).toBeInTheDocument()
      expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Registrar trabajador' })).toHaveAttribute(
        'href',
        '/emisor/trabajadores/nuevo',
      )
    })

    it('redirects /emisor to the issue page', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      const router = renderAt('/emisor')

      expect(await screen.findByRole('heading', { name: 'Emitir certificado' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/emitir')
    })

    it.each([
      ['/emisor/trabajadores/nuevo', 'Registrar trabajador'],
      ['/emisor/certificados/HAB-2026-004718/hoja', 'Hoja del certificado'],
    ])('renders %s when signed in', async (path, title) => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      renderAt(path)

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    })

    it('does not let an admin session in', async () => {
      await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
      const router = renderAt('/emisor/emitir')

      expect(await screen.findByRole('heading', { name: 'Ingreso del emisor' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
    })

    it('signs out and goes back to the login', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      const router = renderAt('/emisor/emitir')

      await screen.findByRole('button', { name: 'Cerrar sesión' })
      await act(async () => {
        screen.getByRole('button', { name: 'Cerrar sesión' }).click()
      })

      expect(await screen.findByRole('heading', { name: 'Ingreso del emisor' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
    })
  })

  describe('admin panel', () => {
    it('sends a visitor without session to the admin login', async () => {
      const router = renderAt('/admin/emisores')

      expect(await screen.findByRole('heading', { name: 'Ingreso de administración' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/admin/ingresar')
    })

    it('shows the pages with the panel layout when signed in', async () => {
      await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
      renderAt('/admin/emisores')

      expect(await screen.findByRole('heading', { name: 'Emisores' })).toBeInTheDocument()
      expect(screen.getByText('Daniela Rojas')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Registrar emisor' })).toHaveAttribute(
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

    it.each([
      ['/admin/emisores/nuevo', 'Registrar emisor'],
      ['/admin/emisores/salud-laboral-rio-claro', 'Detalle del emisor'],
    ])('renders %s when signed in', async (path, title) => {
      await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
      renderAt(path)

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    })

    it('does not let an issuer session in', async () => {
      await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
      const router = renderAt('/admin/emisores')

      expect(await screen.findByRole('heading', { name: 'Ingreso de administración' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/admin/ingresar')
    })
  })
})
