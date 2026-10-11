import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetState, signIn } from '@/data'
import { issuerRoutes } from '@/features/emisor/routes'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

const renderSheet = async (id: string, email = 'coordinacion@cumbrefirme.co') => {
  await signIn('issuer', email, 'x')
  const router = createMemoryRouter(issuerRoutes, { initialEntries: [`/emisor/certificados/${id}/hoja`] })
  render(<RouterProvider router={router} />)
}

describe('CertificateSheetPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
    vi.spyOn(window, 'print').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the sheet of a valid certificate and prints it', async () => {
    await renderSheet('HAB-2026-004718')

    expect(await screen.findByRole('group', { name: 'Certificado HAB-2026-004718' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Hoja del certificado HAB-2026-004718' })).toBeInTheDocument()
    expect(screen.getByTestId('qr')).toHaveAttribute('data-value', `${window.location.origin}/c/HAB-2026-004718`)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Descargar o imprimir/ }))

    expect(window.print).toHaveBeenCalledTimes(1)
    expect(document.title).toBe('Certificado HAB-2026-004718 · Carlos Andrés Ramírez Pineda')
  })

  it('hides the bar and notices from the printed page', async () => {
    await renderSheet('HAB-2026-004718')
    const button = await screen.findByRole('button', { name: /Descargar o imprimir/ })

    expect(button.closest('.print\\:hidden')).not.toBeNull()
    expect(screen.getByRole('group').closest('.print\\:hidden')).toBeNull()
  })

  it('warns about an expired certificate but still lets you print it', async () => {
    await renderSheet('HAB-2025-003981')

    expect(await screen.findByText('Este certificado venció el 22 de septiembre de 2026')).toBeInTheDocument()
    expect(screen.getByText('Este certificado venció el 22 de septiembre de 2026').closest('.print\\:hidden')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Descargar o imprimir/ })).toBeEnabled()
  })

  it('blocks an annulled certificate on screen and in print', async () => {
    await renderSheet('HAB-2026-004655')

    expect(await screen.findByRole('alert')).toHaveTextContent('Este certificado está anulado')
    expect(screen.getByRole('alert')).toHaveTextContent('Nadie puede usarlo. No lo entregues al trabajador.')
    const button = screen.getByRole('button', { name: /Descargar o imprimir/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('No disponible: el certificado está anulado.')
    expect(screen.getByRole('group').closest('.print\\:hidden')).not.toBeNull()

    fireEvent.click(button)
    expect(window.print).not.toHaveBeenCalled()
  })

  it('treats an unknown certificate as not found', async () => {
    await renderSheet('HAB-2026-999999')

    expect(await screen.findByText('No encontramos este certificado')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Emitir un certificado' })).toHaveAttribute('href', '/emisor/emitir')
  })

  it('treats a certificate of another entity exactly like an unknown one', async () => {
    await renderSheet('HAB-2026-004718', 'consultorio@lomasdelsur.co')

    expect(await screen.findByText('No encontramos este certificado')).toBeInTheDocument()
    expect(screen.queryByText(/Carlos/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()
  })
})
