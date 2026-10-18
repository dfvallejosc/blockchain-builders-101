import { ClerkAPIResponseError } from '@clerk/react/errors'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, type IssuerProfile } from '@/api/me'
import { issuerRoutes } from '@/features/emisor/routes'
import { clerkSession, signUpControl } from '@/test/clerk'
import { createQueryWrapper } from '@/test/query'

const TICKET = 'dummy-invitation-ticket'
const renderInvitation = (entry = `/emisor/aceptar-invitacion?__clerk_ticket=${TICKET}`) => {
  const router = createMemoryRouter([...issuerRoutes, { path: '/', element: <p>Inicio</p> }], { initialEntries: [entry] })
  render(<RouterProvider router={router} />, { wrapper: createQueryWrapper() })
  return router
}

const fillPasswords = (password: string, confirmation: string) => {
  fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: password } })
  fireEvent.change(screen.getByLabelText(/^Repite la contraseña/), { target: { value: confirmation } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña' }))

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

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    signUpControl.status = 'complete'
    signUpControl.ticket.mockReset().mockResolvedValue({ error: null })
    signUpControl.create.mockReset().mockResolvedValue({ error: null })
    // Finalizing the sign-up is what opens the Clerk session that the mocked hooks report.
    signUpControl.finalize.mockReset().mockImplementation(async () => {
      clerkSession.signedIn = true
      return { error: null }
    })
    clerkSession.signedIn = false
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows the password form with visible labels', async () => {
    renderInvitation()

    expect(await screen.findByLabelText(/^Contraseña/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Crea tu contraseña' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Repite la contraseña/)).toBeInTheDocument()
  })

  it.each(['/emisor/aceptar-invitacion', '/emisor/aceptar-invitacion?__clerk_ticket=']) (
    'shows the single bad-link message without calling Clerk when the ticket is missing: %s',
    async (entry) => {
      renderInvitation(entry)

      expect(await screen.findByRole('heading', { name: 'Este enlace ya no sirve' })).toBeInTheDocument()
      expect(screen.getByText('Puede que haya vencido o que ya lo hayas usado. Si ya creaste tu contraseña, inicia sesión. Si no, pídele al equipo de HabilitApp una invitación nueva.')).toBeInTheDocument()
      expect(signUpControl.create).not.toHaveBeenCalled()
    },
  )

  it('creates the password and lands on the issuer panel', async () => {
    const router = renderInvitation()
    await screen.findByLabelText(/^Contraseña/)
    fillPasswords('una-clave-segura', 'una-clave-segura')

    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/certificados'))
    expect(signUpControl.create).toHaveBeenCalledWith({ strategy: 'ticket', ticket: TICKET, password: 'una-clave-segura' })
    expect(signUpControl.finalize).toHaveBeenCalledTimes(1)
  })

  it('treats an unverified password error code as a generic failure and preserves the form', async () => {
    signUpControl.create.mockResolvedValue({ error: clerkError('form_password_length_too_short') })
    renderInvitation()
    await screen.findByLabelText(/^Contraseña/)
    fillPasswords('corta', 'corta')

    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos crear tu contraseña. Inténtalo de nuevo en un momento.')
    expect(screen.getByLabelText(/^Contraseña/)).toHaveValue('corta')
    expect(screen.getByLabelText(/^Repite la contraseña/)).toHaveValue('corta')
    expect(screen.queryByText(/Clerk internal message|Clerk long message/)).not.toBeInTheDocument()
  })

  it('shows the bad-link view when Clerk rejects an invalid or used ticket', async () => {
    signUpControl.create.mockResolvedValue({ error: clerkError('ticket_invalid_code') })
    renderInvitation()
    await screen.findByLabelText(/^Contraseña/)
    fillPasswords('una-clave-segura', 'una-clave-segura')

    submit()

    expect(await screen.findByRole('heading', { name: 'Este enlace ya no sirve' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Contraseña/)).not.toBeInTheDocument()
  })

  it('links from the bad-link view to issuer sign-in', async () => {
    renderInvitation('/emisor/aceptar-invitacion?__clerk_ticket=')

    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/emisor/ingresar')
  })

  it('checks the ticket when the screen opens, before asking for a password', async () => {
    renderInvitation()

    expect(await screen.findByLabelText(/^Contraseña/)).toBeInTheDocument()
    expect(signUpControl.ticket).toHaveBeenCalledWith({ ticket: TICKET })
    expect(signUpControl.create).not.toHaveBeenCalled()
  })

  it.each(['invitation_already_accepted', 'ticket_invalid_code'])(
    'shows the bad-link view on open, without the password form, when Clerk rejects the ticket (%s)',
    async (code) => {
      signUpControl.ticket.mockResolvedValue({ error: clerkError(code) })
      renderInvitation()

      expect(await screen.findByRole('heading', { name: 'Este enlace ya no sirve' })).toBeInTheDocument()
      expect(screen.queryByLabelText(/^Contraseña/)).not.toBeInTheDocument()
      expect(signUpControl.create).not.toHaveBeenCalled()
    },
  )

  it('does not check anything with Clerk when the ticket is missing', async () => {
    renderInvitation('/emisor/aceptar-invitacion')

    expect(await screen.findByRole('heading', { name: 'Este enlace ya no sirve' })).toBeInTheDocument()
    expect(signUpControl.ticket).not.toHaveBeenCalled()
  })

  it('offers to retry when the ticket check fails for another reason, and shows the form once it works', async () => {
    signUpControl.ticket.mockRejectedValueOnce(new Error('Failed to fetch: https://clerk.internal'))
    renderInvitation()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos revisar tu enlace. Inténtalo de nuevo en un momento.')
    expect(screen.queryByLabelText(/^Contraseña/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Clerk|clerk\.internal|Failed to fetch/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByLabelText(/^Contraseña/)).toBeInTheDocument()
    expect(signUpControl.ticket).toHaveBeenCalledTimes(2)
  })

  it('does not check the ticket while another Clerk session is open, and checks it after signing out', async () => {
    clerkSession.signedIn = true
    renderInvitation()

    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión y continuar' }))

    expect(await screen.findByLabelText(/^Contraseña/)).toBeInTheDocument()
    expect(signUpControl.ticket).toHaveBeenCalledTimes(1)
  })

  it('shows a generic failure and preserves the form after a network error', async () => {
    signUpControl.create.mockRejectedValue(new Error('Failed to fetch: https://clerk.internal'))
    renderInvitation()
    await screen.findByLabelText(/^Contraseña/)
    fillPasswords('clave-que-escribio', 'clave-que-escribio')

    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos crear tu contraseña. Inténtalo de nuevo en un momento.')
    expect(screen.getByLabelText(/^Contraseña/)).toHaveValue('clave-que-escribio')
    expect(screen.queryByText(/Clerk|clerk\.internal|Failed to fetch/)).not.toBeInTheDocument()
  })

  it('treats additional Clerk steps as a generic failure', async () => {
    signUpControl.status = 'missing_requirements'
    renderInvitation()
    await screen.findByLabelText(/^Contraseña/)
    fillPasswords('clave-que-escribio', 'clave-que-escribio')

    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos crear tu contraseña. Inténtalo de nuevo en un momento.')
    expect(signUpControl.finalize).not.toHaveBeenCalled()
  })

  it('shows a focused error summary with links to invalid fields without calling Clerk', async () => {
    renderInvitation()
    await screen.findByLabelText(/^Contraseña/)

    submit()

    const summaryText = await screen.findByText('Revisa 1 campo antes de continuar')
    const summary = summaryText.closest('[tabindex="-1"]')
    await waitFor(() => expect(summary).toHaveFocus())
    expect(screen.getByLabelText(/^Contraseña/)).toHaveAttribute('aria-invalid', 'true')
    fireEvent.click(within(summary as HTMLElement).getByRole('button', { name: 'Contraseña' }))
    await waitFor(() => expect(screen.getByLabelText(/^Contraseña/)).toHaveFocus())
    expect(screen.getByText('Escribe una contraseña.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Contraseña/)).toHaveAttribute('aria-invalid', 'true')
    fillPasswords('una-clave-segura', 'otra-clave')
    submit()
    expect(await screen.findByText('Revisa 1 campo antes de continuar')).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Repite la contraseña/)).toHaveAccessibleDescription('Las contraseñas no coinciden.')
    expect(signUpControl.create).not.toHaveBeenCalled()
  })

  it('disables the submit button while the invitation is being accepted', async () => {
    signUpControl.create.mockImplementation(() => new Promise(() => undefined))
    renderInvitation()
    await screen.findByLabelText(/^Contraseña/)
    fillPasswords('una-clave-segura', 'una-clave-segura')

    submit()

    const button = await screen.findByRole('button', { name: 'Creando contraseña…' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(signUpControl.create).toHaveBeenCalledTimes(1)
  })

  it('shows the session notice and continues with the same ticket after signing out', async () => {
    clerkSession.signedIn = true
    renderInvitation()

    expect(await screen.findByText('Ya hay una sesión abierta en este navegador. Para crear tu contraseña, cierra esa sesión primero.')).toBeInTheDocument()
    expect(signUpControl.create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión y continuar' }))

    await screen.findByLabelText(/^Contraseña/)
    fillPasswords('una-clave-segura', 'una-clave-segura')
    submit()
    await waitFor(() => expect(signUpControl.create).toHaveBeenCalledWith({ strategy: 'ticket', ticket: TICKET, password: 'una-clave-segura' }))
  })

  it('does not show any Clerk response text', async () => {
    signUpControl.create.mockResolvedValue({ error: clerkError('unknown_code') })
    renderInvitation()
    await screen.findByLabelText(/^Contraseña/)
    fillPasswords('una-clave-segura', 'una-clave-segura')

    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos crear tu contraseña. Inténtalo de nuevo en un momento.')
    expect(screen.queryByText(/Clerk internal message|Clerk long message/)).not.toBeInTheDocument()
  })
})
