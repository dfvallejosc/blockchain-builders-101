import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Certificate, Worker } from '@/data'
import { IssuedStep } from '@/features/emisor/emitir/IssuedStep'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

const CERTIFICATE: Certificate = {
  number: 4719,
  id: 'HAB-2026-004719',
  entityId: 'e',
  workerId: 'w',
  type: 'height-work',
  issuedAt: '2026-10-09',
  validUntil: '2027-10-09',
  annulledAt: null,
}
const WORKER = {
  id: 'w',
  fullName: 'Sandra Milena Lozano Pardo',
  documentType: 'cc',
  documentNumber: '1032774019',
} as Worker

describe('IssuedStep', () => {
  it('confirms the certificate was issued', () => {
    render(<IssuedStep certificate={CERTIFICATE} worker={WORKER} onIssueAnother={vi.fn()} />)

    expect(screen.getByText('Certificado emitido')).toBeInTheDocument()
    expect(
      screen.getByText(/HAB-2026-004719 de Sandra Milena Lozano Pardo quedó registrado y ya se puede comprobar/),
    ).toBeInTheDocument()
  })

  it('encodes only the public verification address with the certificate number', () => {
    render(<IssuedStep certificate={CERTIFICATE} worker={WORKER} onIssueAnother={vi.fn()} />)

    const value = screen.getByTestId('qr').getAttribute('data-value')

    expect(value).toBe(`${window.location.origin}/c/HAB-2026-004719`)
    expect(value).not.toMatch(/Sandra|1032774019|1\.032/)
  })

  it('opens the printable sheet in a new tab', () => {
    render(<IssuedStep certificate={CERTIFICATE} worker={WORKER} onIssueAnother={vi.fn()} />)

    const link = screen.getByRole('link', { name: /Descargar o imprimir/ })

    expect(link).toHaveAttribute('href', '/emisor/certificados/HAB-2026-004719/hoja')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('starts another certificate', () => {
    const onIssueAnother = vi.fn()
    render(<IssuedStep certificate={CERTIFICATE} worker={WORKER} onIssueAnother={onIssueAnother} />)

    fireEvent.click(screen.getByRole('button', { name: 'Emitir otro certificado' }))

    expect(onIssueAnother).toHaveBeenCalledTimes(1)
  })
})
