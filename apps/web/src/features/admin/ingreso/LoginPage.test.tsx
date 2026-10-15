import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { getSession, resetState, signIn } from '@/data'
import { adminRoutes } from '@/features/admin/routes'

const renderLogin = (path = '/admin/ingresar') => {
  const router = createMemoryRouter([...adminRoutes, { path: '/', element: <p>Inicio</p> }], { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: password } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

describe('admin LoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
  })

  it('shows the screen texts from the mockup', async () => {
    renderLogin()

    expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
    expect(
      screen.getByText('Entra con el correo que el equipo de HabilitApp registró para ti.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Correo/)).toHaveAttribute('placeholder', 'nombre@habilitapp.co')
    expect(screen.getByText('Uso interno del equipo de HabilitApp.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('is the main landmark of the page', async () => {
    renderLogin()

    expect(await screen.findByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }))
  })

  it('does not hint at any demo credentials', async () => {
    renderLogin()
    await screen.findByLabelText(/Correo/)

    expect(screen.queryByText(/daniela/)).not.toBeInTheDocument()
  })

  it('signs in with the demo admin and opens the issuers list', async () => {
    const router = renderLogin()
    await screen.findByLabelText(/Correo/)
    fill('daniela.rojas@habilitapp.co', 'cualquier-cosa')

    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/emisores'))
    expect((await getSession('admin'))?.role).toBe('admin')
  })

  it('signs in when the email has spaces around it', async () => {
    const router = renderLogin()
    await screen.findByLabelText(/Correo/)
    fill('  daniela.rojas@habilitapp.co ', 'x')

    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/emisores'))
  })

  it('shows the error alert and does not enter with an unknown email', async () => {
    const router = renderLogin()
    await screen.findByLabelText(/Correo/)
    fill('nadie@ejemplo.co', 'x')

    submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos iniciar tu sesión')
    expect(alert).toHaveTextContent('El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.')
    expect(router.state.location.pathname).toBe('/admin/ingresar')
    expect(await getSession('admin')).toBeNull()
  })

  it('does not let an issuer email in', async () => {
    const router = renderLogin()
    await screen.findByLabelText(/Correo/)
    fill('coordinacion@cumbrefirme.co', 'x')

    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos iniciar tu sesión')
    expect(router.state.location.pathname).toBe('/admin/ingresar')
    expect(await getSession('admin')).toBeNull()
  })

  it('hides the error alert as soon as the user edits a field', async () => {
    renderLogin()
    await screen.findByLabelText(/Correo/)
    fill('nadie@ejemplo.co', 'x')
    submit()
    await screen.findByRole('alert')

    fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: 'daniela.rojas@habilitapp.co' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an error under each empty field and does not try to sign in', async () => {
    renderLogin()
    await screen.findByLabelText(/Correo/)

    submit()

    expect(await screen.findByText('Escribe tu correo.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Correo/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Contraseña/)).toHaveAccessibleDescription('Escribe tu contraseña.')
    await waitFor(() => expect(screen.getByLabelText(/Correo/)).toHaveFocus())
    expect(screen.queryByText('No pudimos iniciar tu sesión')).not.toBeInTheDocument()
  })

  it('treats a blank password as empty and does not sign in', async () => {
    renderLogin()
    await screen.findByLabelText(/Correo/)
    fill('daniela.rojas@habilitapp.co', '   ')

    submit()

    expect(await screen.findByText('Escribe tu contraseña.')).toBeInTheDocument()
    expect(await getSession('admin')).toBeNull()
  })

  it('validates the email while filling it in', async () => {
    renderLogin()
    const email = await screen.findByLabelText(/Correo/)

    fireEvent.change(email, { target: { value: 'daniela' } })
    fireEvent.blur(email)

    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument()
  })

  it('disables the button while signing in so a double click sends only once', async () => {
    renderLogin()
    await screen.findByLabelText(/Correo/)
    fill('daniela.rojas@habilitapp.co', 'x')
    const button = screen.getByRole('button', { name: 'Iniciar sesión' })

    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(button).toBeDisabled())
  })

  it('sends a signed-in admin straight to the panel', async () => {
    await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
    const router = renderLogin()

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/emisores'))
    expect(screen.queryByLabelText(/Correo/)).not.toBeInTheDocument()
  })

  it('goes back to the home page', async () => {
    const router = renderLogin()

    fireEvent.click(await screen.findByRole('link', { name: 'Volver al inicio' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
