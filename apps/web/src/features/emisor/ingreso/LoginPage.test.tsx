import { ClerkAPIResponseError } from '@clerk/react/errors'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, type IssuerProfile } from '@/api/me'
import { issuerRoutes } from '@/features/emisor/routes'
import { clerkSession, signInControl } from '@/test/clerk'
import { createQueryWrapper } from '@/test/query'

const renderLogin = (entry: string | { pathname: string; state: unknown } = '/emisor/ingresar') => {
  const router = createMemoryRouter([...issuerRoutes, { path: '/', element: <p>Inicio</p> }], { initialEntries: [entry] })
  render(<RouterProvider router={router} />, { wrapper: createQueryWrapper() })
  return router
}

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/Usuario/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: password } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).sessionClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(async () => []), registerWorker: vi.fn() }))
vi.mock('@/api/certificates', () => ({ listCertificates: vi.fn(async () => []), issueCertificate: vi.fn() }))

const PROFILE: IssuerProfile = {
  id: 'e-1',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work'],
  nit: '901.482.317-5',
  city: 'Bogotá',
}

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

const ISSUER_EMAIL = 'coordinacion@cumbrefirme.co'

describe('LoginPage', () => {
  beforeEach(() => {
    signInControl.status = 'complete'
    signInControl.password.mockReset().mockResolvedValue({ error: null })
    signInControl.finalize.mockReset()
    finalizeOpensSession()
    clerkSession.signedIn = false
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows the screen texts from the mockup', async () => {
    renderLogin()

    expect(await screen.findByRole('heading', { level: 1, name: 'Panel del emisor' })).toBeInTheDocument()
    expect(
      screen.getByText('Entra con el usuario y la contraseña de tu entidad para emitir y consultar certificados.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Usuario/)).toHaveAccessibleDescription('Es el correo con el que registramos a tu entidad.')
    expect(screen.getByText('Si no recuerdas tu contraseña, pídele ayuda al equipo de HabilitApp.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('is the main landmark of the page', async () => {
    renderLogin()

    expect(await screen.findByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }))
  })

  it('does not hint at any demo credentials', async () => {
    renderLogin()
    await screen.findByLabelText(/Usuario/)

    expect(screen.queryByText(/cumbrefirme/)).not.toBeInTheDocument()
  })

  it('signs in with Clerk using the trimmed email, finalizes and opens the issuer panel', async () => {
    const router = renderLogin()
    await screen.findByLabelText(/Usuario/)
    fill(`  ${ISSUER_EMAIL}  `, 'cualquier-cosa')

    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
    expect(signInControl.password).toHaveBeenCalledWith({ identifier: ISSUER_EMAIL, password: 'cualquier-cosa' })
    expect(signInControl.finalize).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('heading', { level: 1, name: 'Emitir certificado' })).toBeInTheDocument()
  })

  it.each(['form_identifier_not_found', 'form_password_incorrect'])(
    'shows the credentials alert without Clerk text when Clerk answers %s',
    async (code) => {
      signInControl.password.mockResolvedValue({ error: clerkError(code) })
      const router = renderLogin()
      await screen.findByLabelText(/Usuario/)
      fill('nadie@ejemplo.co', 'x')

      submit()

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('No pudimos iniciar tu sesión')
      expect(alert).toHaveTextContent('El usuario o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.')
      expect(screen.queryByText(/Clerk/)).not.toBeInTheDocument()
      expect(signInControl.finalize).not.toHaveBeenCalled()
      expect(router.state.location.pathname).toBe('/emisor/ingresar')
    },
  )

  it.each([
    ['a network failure', () => Promise.reject(new Error('Failed to fetch: https://clerk.internal'))],
    ['another Clerk error', async () => ({ error: clerkError('too_many_requests') })],
  ])('shows the generic alert on %s', async (_name, result) => {
    signInControl.password.mockImplementation(result)
    renderLogin()
    await screen.findByLabelText(/Usuario/)
    fill(ISSUER_EMAIL, 'x')

    submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos iniciar tu sesión')
    expect(alert).toHaveTextContent('Inténtalo de nuevo en un momento.')
    expect(alert).not.toHaveTextContent(/Clerk|clerk|fetch|coincid/)
  })

  it('shows the generic alert when the sign-in needs more steps', async () => {
    signInControl.status = 'needs_second_factor'
    renderLogin()
    await screen.findByLabelText(/Usuario/)
    fill(ISSUER_EMAIL, 'x')

    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Inténtalo de nuevo en un momento.')
    expect(signInControl.finalize).not.toHaveBeenCalled()
  })

  it('shows the generic alert when finalizing fails', async () => {
    signInControl.finalize.mockResolvedValue({ error: clerkError('session_exists') })
    renderLogin()
    await screen.findByLabelText(/Usuario/)
    fill(ISSUER_EMAIL, 'x')

    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Inténtalo de nuevo en un momento.')
  })

  it('disables the button and says it is signing in while Clerk responds', async () => {
    signInControl.password.mockImplementation(() => new Promise(() => undefined))
    renderLogin()
    await screen.findByLabelText(/Usuario/)
    fill(ISSUER_EMAIL, 'x')

    submit()

    const button = await screen.findByRole('button', { name: 'Iniciando sesión…' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(signInControl.password).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['expired', 'Tu sesión venció', 'Inicia sesión de nuevo.'],
    ['revoked', 'Tu entidad fue revocada', 'Tu entidad ya no puede usar HabilitApp.'],
    ['no-role', 'Tu cuenta no tiene un rol asignado', 'Pídele ayuda al equipo de HabilitApp.'],
    ['not-issuer', 'Esta cuenta no es de una entidad emisora', 'Entra con la cuenta de tu entidad.'],
  ])('explains why the session ended: %s', async (reason, title, text) => {
    renderLogin({ pathname: '/emisor/ingresar', state: { reason } })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(title)
    expect(alert).toHaveTextContent(text)
    expect(alert.querySelector('svg')).not.toBeNull()
  })

  it('ignores a reason that is not one of the known ones', async () => {
    renderLogin({ pathname: '/emisor/ingresar', state: { reason: '<b>hola</b>' } })
    await screen.findByLabelText(/Usuario/)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('replaces the reason alert with the credentials alert after a rejected sign-in', async () => {
    signInControl.password.mockResolvedValue({ error: clerkError('form_password_incorrect') })
    renderLogin({ pathname: '/emisor/ingresar', state: { reason: 'expired' } })
    await screen.findByLabelText(/Usuario/)
    fill(ISSUER_EMAIL, 'x')

    submit()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('El usuario o la contraseña no coinciden.'))
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('does not bring the session-ended reason back after a sign-in attempt, even when a field is edited', async () => {
    signInControl.password.mockResolvedValue({ error: clerkError('form_password_incorrect') })
    renderLogin({ pathname: '/emisor/ingresar', state: { reason: 'expired' } })
    await screen.findByLabelText(/Usuario/)
    fill(ISSUER_EMAIL, 'x')
    submit()
    await screen.findByText('El usuario o la contraseña no coinciden.', { exact: false })

    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'otra' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Tu sesión venció')).not.toBeInTheDocument()
  })

  it('hides the error alert as soon as the user edits a field', async () => {
    signInControl.password.mockResolvedValue({ error: clerkError('form_identifier_not_found') })
    renderLogin()
    await screen.findByLabelText(/Usuario/)
    fill('nadie@ejemplo.co', 'x')
    submit()
    await screen.findByRole('alert')

    fireEvent.change(screen.getByLabelText(/Usuario/), { target: { value: ISSUER_EMAIL } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an error under each empty field and does not try to sign in', async () => {
    renderLogin()
    await screen.findByLabelText(/Usuario/)

    submit()

    expect(await screen.findByText('Escribe el usuario, que es el correo de tu entidad.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Usuario/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Contraseña/)).toHaveAccessibleDescription('Escribe tu contraseña.')
    await waitFor(() => expect(screen.getByLabelText(/Usuario/)).toHaveFocus())
    expect(screen.queryByText('No pudimos iniciar tu sesión')).not.toBeInTheDocument()
    expect(signInControl.password).not.toHaveBeenCalled()
  })

  it('validates the email while filling it in', async () => {
    renderLogin()
    const user = await screen.findByLabelText(/Usuario/)

    fireEvent.change(user, { target: { value: 'cumbrefirme' } })
    fireEvent.blur(user)

    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument()
  })

  it('sends an issuer already signed in to Clerk straight to the panel', async () => {
    clerkSession.signedIn = true
    const router = renderLogin()

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
    expect(screen.queryByLabelText(/Usuario/)).not.toBeInTheDocument()
  })

  it('keeps the login open when a session ended with a reason, even if Clerk still has a session', async () => {
    clerkSession.signedIn = true
    const router = renderLogin({ pathname: '/emisor/ingresar', state: { reason: 'revoked' } })

    expect(await screen.findByLabelText(/Usuario/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Tu entidad fue revocada')
    expect(router.state.location.pathname).toBe('/emisor/ingresar')
  })

  it('goes back to the home page', async () => {
    const router = renderLogin()

    fireEvent.click(await screen.findByRole('link', { name: 'Volver al inicio' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
