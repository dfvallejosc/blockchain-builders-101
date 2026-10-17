import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { annulCertificate } from '@/api/certificates'
import { ToastProvider } from '@/components/ui/toast'
import { DataError } from '@/data'
import type { Certificate } from '@/data/types'
import { AnnulDialog } from '@/features/emisor/certificados/AnnulDialog'
import { createQueryWrapper } from '@/test/query'

vi.mock('@/api/certificates', () => ({ listCertificates: vi.fn(), annulCertificate: vi.fn() }))

const ID = '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c'
const CODE = 'HAB-2026-004718'

const CERTIFICATE: Certificate = {
  number: 4718,
  id: ID,
  entityId: 'e-1',
  workerId: 'w-1',
  type: 'height-work',
  issuedAt: '2026-10-02',
  validUntil: '2027-10-02',
  annulledAt: null,
}

const renderDialog = (onClose = vi.fn()) => {
  const Wrapper = createQueryWrapper()
  render(
    <Wrapper>
      <ToastProvider>
        <AnnulDialog certificate={CERTIFICATE} code={CODE} open onClose={onClose} />
      </ToastProvider>
    </Wrapper>,
  )
  return onClose
}

const typeConfirmation = (text = 'anular') =>
  fireEvent.change(screen.getByLabelText('Escribe ANULAR para confirmar'), { target: { value: text } })
const confirmButton = () => screen.getByRole('button', { name: 'Anular certificado' })

describe('AnnulDialog', () => {
  beforeEach(() => {
    vi.mocked(annulCertificate).mockReset()
  })

  it('asks for confirmation with the formatted code and never shows the uuid', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Anular certificado' })).toBeInTheDocument()
    expect(screen.getByText(`Vas a anular el certificado ${CODE}. No se puede deshacer.`)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(ID)
    expect(confirmButton()).toBeDisabled()
  })

  it('enables the button once ANULAR is typed, in any case', () => {
    renderDialog()

    typeConfirmation('anular')
    expect(confirmButton()).toBeEnabled()
    typeConfirmation('Anul')
    expect(confirmButton()).toBeDisabled()
    typeConfirmation('AnUlAr')
    expect(confirmButton()).toBeEnabled()
  })

  it('annuls once even on a double click, shows the toast and closes', async () => {
    let finish: (certificate: Certificate) => void = () => undefined
    vi.mocked(annulCertificate).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const onClose = renderDialog()
    typeConfirmation()

    const button = confirmButton()
    fireEvent.click(button)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled())
    fireEvent.click(button)
    finish({ ...CERTIFICATE, annulledAt: '2026-10-09' })

    expect(await screen.findByText('Certificado anulado')).toBeInTheDocument()
    expect(screen.getByText(`${CODE} ya no se puede usar.`)).toBeInTheDocument()
    expect(annulCertificate).toHaveBeenCalledTimes(1)
    expect(annulCertificate).toHaveBeenCalledWith(ID)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cannot be closed while the request is in flight', async () => {
    vi.mocked(annulCertificate).mockReturnValue(new Promise(() => undefined))
    const onClose = renderDialog()
    typeConfirmation()
    fireEvent.click(confirmButton())

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled())
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('tells that it was already annulled inside the dialog and stays open', async () => {
    vi.mocked(annulCertificate).mockRejectedValue(new DataError('duplicate'))
    const onClose = renderDialog()
    typeConfirmation()

    fireEvent.click(confirmButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Este certificado ya estaba anulado.')
    expect(alert.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
    expect(screen.queryByText('Certificado anulado')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows a generic message without internals on any other error and lets the person retry', async () => {
    vi.mocked(annulCertificate).mockRejectedValueOnce(new DataError('unavailable')).mockResolvedValue(CERTIFICATE)
    const onClose = renderDialog()
    typeConfirmation()

    fireEvent.click(confirmButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos anular el certificado. Inténtalo de nuevo.')
    expect(alert).not.toHaveTextContent(/unavailable|DataError/)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(confirmButton())
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(annulCertificate).toHaveBeenCalledTimes(2)
  })

  it('cancels with the Cancelar button', () => {
    const onClose = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(annulCertificate).not.toHaveBeenCalled()
  })
})
