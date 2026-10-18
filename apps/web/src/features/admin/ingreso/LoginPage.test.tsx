import { ClerkAPIResponseError } from '@clerk/react/errors'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/features/admin/ingreso/LoginPage'
import { clerkSession, signInControl } from '@/test/clerk'
import { createQueryWrapper } from '@/test/query'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).sessionClerkModule())

const renderLogin = (entry: string | { pathname: string; state: unknown } = '/admin/ingresar') => {
  const router = createMemoryRouter(
    [
      { path: '/admin/ingresar', element: <LoginPage /> },
      { path: '/admin', element: <p>Panel</p> },
      { path: '/', element: <p>Inicio</p> },
    ],
    { initialEntries: [entry] },
  )
  render(<RouterProvider router={router} />, { wrapper: createQueryWrapper() })
  return router
}

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: password } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

const clerkError = (code: string) =>
  new ClerkAPIResponseError('Request failed', {
    data: [{ code, message: 'Clerk internal message', long_message: 'Clerk long message' }],
    status: 422,
  })

// Finalizing the sign-in is what opens the Clerk session that the mocked hooks report.
const finalizeOpensSession = () =>
  signInControl.finalize.mockImplementation(async () => {
    clerkSession.signedIn = true
    return { error: null }
  })

const EMAIL = 'daniela.rojas@habilitapp.co'

describe('admin LoginPage', () => {
  beforeEach(() => {
    signInControl.status = 'complete'
    signInControl.password.mockReset().mockResolvedValue({ error: null })
    signInControl.finalize.mockReset()
    finalizeOpensSession()
    clerkSession.signedIn = false
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows the screen texts', async () => {
    renderLogin()

    expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
    expect(screen.getByText('Entra con el correo que el equipo de HabilitApp registró para ti.')).toBeInTheDocument()
    expect(screen.getByText('Uso interno del equipo de HabilitApp.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  it('signs in with the email and the password, finalizes the session and goes to the panel', async () => {
    const router = renderLogin()
    await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })

    fill(EMAIL, 'una-clave')
    submit()

    expect(await screen.findByText('Panel')).toBeInTheDocument()
    expect(signInControl.password).toHaveBeenCalledWith({ identifier: EMAIL, password: 'una-clave' })
    expect(signInControl.finalize).toHaveBeenCalledTimes(1)
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('shows the field errors and does not call Clerk when the form is empty', async () => {
    renderLogin()
    await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })

    submit()

    expect(await screen.findByText('Escribe tu correo.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
    expect(signInControl.password).not.toHaveBeenCalled()
  })

  it.each(['form_identifier_not_found', 'form_password_incorrect'])(
    'says the credentials do not match when Clerk answers %s, without Clerk messages',
    async (code) => {
      signInControl.password.mockResolvedValue({ error: clerkError(code) })
      renderLogin()
      await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })

      fill(EMAIL, 'mala-clave')
      submit()

      expect(await screen.findByText('No pudimos iniciar tu sesión')).toBeInTheDocument()
      expect(screen.getByText('El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.')).toBeInTheDocument()
      expect(document.body.textContent).not.toContain('Clerk')
    },
  )

  it.each([
    ['another Clerk error', { error: clerkError('something_else') }],
    ['an unexpected status', { error: null, status: 'needs_second_factor' }],
  ])('shows the generic failure on %s', async (_label, result) => {
    signInControl.password.mockResolvedValue({ error: result.error })
    if ('status' in result) signInControl.status = result.status as string
    renderLogin()
    await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })

    fill(EMAIL, 'una-clave')
    submit()

    expect(await screen.findByText('Inténtalo de nuevo en un momento.')).toBeInTheDocument()
    expect(screen.queryByText(/no coinciden/)).not.toBeInTheDocument()
  })

  it('shows the generic failure when Clerk throws', async () => {
    signInControl.password.mockRejectedValue(new Error('offline'))
    renderLogin()
    await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })

    fill(EMAIL, 'una-clave')
    submit()

    expect(await screen.findByText('Inténtalo de nuevo en un momento.')).toBeInTheDocument()
  })

  it.each([
    ['expired', 'Tu sesión venció', 'Inicia sesión de nuevo.'],
    ['no-role', 'Tu cuenta no tiene un rol asignado', 'Pídele ayuda al equipo de HabilitApp.'],
    ['not-admin', 'Esta cuenta no es de administración', 'Entra con la cuenta de administración.'],
  ])('explains why the session ended: %s', async (reason, title, text) => {
    renderLogin({ pathname: '/admin/ingresar', state: { reason } })

    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it.each([{ reason: 'revoked' }, { reason: 'made-up' }, { reason: 7 }, null])(
    'ignores a reason it does not know (%j)',
    async (state) => {
      renderLogin({ pathname: '/admin/ingresar', state })

      await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    },
  )

  it('goes to the panel when there is already a session and no reason', async () => {
    clerkSession.signedIn = true

    const router = renderLogin()

    expect(await screen.findByText('Panel')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })

  it('stays on the login when there is still a session but a reason says it ended', async () => {
    clerkSession.signedIn = true

    const router = renderLogin({ pathname: '/admin/ingresar', state: { reason: 'expired' } })

    expect(await screen.findByText('Tu sesión venció')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/ingresar')
  })
})
