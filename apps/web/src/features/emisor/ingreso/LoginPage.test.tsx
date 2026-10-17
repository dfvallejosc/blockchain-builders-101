import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSession, resetState, signIn } from '@/data'
import { issuerRoutes } from '@/features/emisor/routes'

const renderLogin = (path = '/emisor/ingresar') => {
  const router = createMemoryRouter([...issuerRoutes, { path: '/', element: <p>Inicio</p> }], { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/Usuario/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: password } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    window.localStorage.clear()
    resetState()
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

  it('signs in with valid demo credentials and opens the issuer panel', async () => {
    const router = renderLogin()
    await screen.findByLabelText(/Usuario/)
    fill('coordinacion@cumbrefirme.co', 'cualquier-cosa')

    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Emitir certificado' })).toBeInTheDocument()
    expect((await getSession('issuer'))?.role).toBe('issuer')
  })

  it('shows the error alert and does not enter with an unknown user', async () => {
    const router = renderLogin()
    await screen.findByLabelText(/Usuario/)
    fill('nadie@ejemplo.co', 'x')

    submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos iniciar tu sesión')
    expect(alert).toHaveTextContent('El usuario o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.')
    expect(router.state.location.pathname).toBe('/emisor/ingresar')
    expect(await getSession('issuer')).toBeNull()
  })

  it('hides the error alert as soon as the user edits a field', async () => {
    renderLogin()
    await screen.findByLabelText(/Usuario/)
    fill('nadie@ejemplo.co', 'x')
    submit()
    await screen.findByRole('alert')

    fireEvent.change(screen.getByLabelText(/Usuario/), { target: { value: 'coordinacion@cumbrefirme.co' } })

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
  })

  it('validates the email while filling it in', async () => {
    renderLogin()
    const user = await screen.findByLabelText(/Usuario/)

    fireEvent.change(user, { target: { value: 'cumbrefirme' } })
    fireEvent.blur(user)

    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument()
  })

  it('sends a signed-in issuer straight to the panel', async () => {
    await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
    const router = renderLogin()

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
    expect(screen.queryByLabelText(/Usuario/)).not.toBeInTheDocument()
  })

  it('goes back to the home page', async () => {
    const router = renderLogin()

    fireEvent.click(await screen.findByRole('link', { name: 'Volver al inicio' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
