import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetState, revokeEntity, signIn, verifyCertificate } from '@/data'
import { issuerRoutes } from '@/features/emisor/routes'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

const CUMBRE = 'centro-entrenamiento-cumbre-firme'

const renderAt = async (path: string) => {
  await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
  const router = createMemoryRouter(issuerRoutes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

const goToReview = async () => {
  fireEvent.click(await screen.findByRole('radio', { name: 'Elegir a Sandra Milena Lozano Pardo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  fireEvent.change(await screen.findByLabelText(/Tipo de certificado/), { target: { value: 'height-work' } })
  fireEvent.change(screen.getByLabelText(/Vigente hasta/), { target: { value: '2027-10-09' } })
  fireEvent.click(screen.getByRole('button', { name: 'Revisar resumen' }))
  await screen.findByRole('heading', { name: 'Revisa antes de emitir' })
}

describe('IssueCertificatePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('issues a certificate through the four steps and it can be verified', async () => {
    await renderAt('/emisor/emitir')

    expect(await screen.findByRole('heading', { level: 1, name: 'Emitir certificado' })).toBeInTheDocument()
    await goToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))

    expect(await screen.findByText('Certificado emitido')).toBeInTheDocument()
    const codes = screen.getAllByTestId('qr')
    expect(codes).toHaveLength(2)
    codes.forEach((code) =>
      expect(code).toHaveAttribute('data-value', `${window.location.origin}/c/HAB-2026-004719`),
    )
    expect(screen.getByRole('heading', { name: 'Vista previa del certificado' })).toBeInTheDocument()
    expect((await verifyCertificate('HAB-2026-004719')).status).toBe('valid')
  })

  it('marks the current step and moves the focus to its heading', async () => {
    await renderAt('/emisor/emitir')
    const steps = await screen.findByRole('list', { name: 'Pasos' })
    expect(within(steps).getAllByRole('listitem')).toHaveLength(4)

    fireEvent.click(await screen.findByRole('radio', { name: 'Elegir a Sandra Milena Lozano Pardo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    const heading = await screen.findByRole('heading', { name: 'Datos del certificado' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(within(steps).getByText('Datos del certificado').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('goes back to edit without losing what was typed', async () => {
    await renderAt('/emisor/emitir')
    await goToReview()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a editar' }))

    expect(await screen.findByLabelText(/Vigente hasta/)).toHaveValue('2027-10-09')
  })

  it('starts on the details step with the worker from the address', async () => {
    await renderAt('/emisor/emitir?trabajador=w-sandra&nuevo=1')

    expect(await screen.findByRole('heading', { name: 'Datos del certificado' })).toBeInTheDocument()
    expect(screen.getByText('Sandra Milena Lozano Pardo')).toBeInTheDocument()
    expect(screen.getByText('Trabajador registrado')).toBeInTheDocument()
  })

  it('shows "Trabajador registrado" only for the worker that came from the address', async () => {
    await renderAt('/emisor/emitir?trabajador=w-sandra&nuevo=1')
    await screen.findByText('Trabajador registrado')

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar trabajador' }))
    fireEvent.click(await screen.findByRole('radio', { name: 'Elegir a Carlos Andrés Ramírez Pineda' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('heading', { name: 'Datos del certificado' })).toBeInTheDocument()
    expect(screen.queryByText('Trabajador registrado')).not.toBeInTheDocument()
  })

  it('falls back to the first step for an unknown worker', async () => {
    await renderAt('/emisor/emitir?trabajador=w-nobody')

    expect(await screen.findByRole('heading', { name: 'Elige al trabajador' })).toBeInTheDocument()
  })

  it('issues another certificate from a clean first step that reflects the new one', async () => {
    await renderAt('/emisor/emitir')
    await goToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))
    await screen.findByText('Certificado emitido')

    fireEvent.click(screen.getByRole('button', { name: 'Emitir otro certificado' }))

    expect(await screen.findByRole('heading', { name: 'Elige al trabajador' })).toBeInTheDocument()
    const sandraRow = screen.getByText('Sandra Milena Lozano Pardo').closest('tr')
    expect(sandraRow).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('shows the revocation notice and blocks issuing when the entity is revoked', async () => {
    await revokeEntity(CUMBRE)
    await renderAt('/emisor/emitir')

    expect(await screen.findByText('Tu entidad está revocada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Registrar trabajador nuevo/ })).toBeDisabled()
    expect(screen.queryByRole('link', { name: /Registrar trabajador nuevo/ })).not.toBeInTheDocument()
  })

  it('shows the blocked state when the entity is revoked while reviewing', async () => {
    await renderAt('/emisor/emitir')
    await goToReview()
    await revokeEntity(CUMBRE)

    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))

    expect(await screen.findByText('Tu entidad está revocada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Emitir certificado' })).toBeDisabled()
    expect(screen.queryByText('No pudimos emitir el certificado')).not.toBeInTheDocument()
  })

  it('uses no blockchain wording on any step', async () => {
    await renderAt('/emisor/emitir')
    await goToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))
    await screen.findByText('Certificado emitido')

    expect(document.body.textContent).not.toMatch(/blockchain|hash|stellar|token|wallet|cadena de bloques/i)
  })
})
