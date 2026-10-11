import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Certificate, Entity, Worker } from '@/data'
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
const ENTITY = {
  id: 'e',
  name: 'Centro de Entrenamiento Cumbre Firme',
  nit: '901.482.317-5',
  city: 'Bogotá',
} as Entity

describe('IssuedStep', () => {
  it('confirms the certificate was issued', () => {
    render(<IssuedStep certificate={CERTIFICATE} entity={ENTITY} worker={WORKER} onIssueAnother={vi.fn()} />)

    expect(screen.getByText('Certificado emitido')).toBeInTheDocument()
    expect(
      screen.getByText(/HAB-2026-004719 de Sandra Milena Lozano Pardo quedó registrado y ya se puede comprobar/),
    ).toBeInTheDocument()
  })

  it('encodes only the public verification address with the certificate number', () => {
    render(<IssuedStep certificate={CERTIFICATE} entity={ENTITY} worker={WORKER} onIssueAnother={vi.fn()} />)

    const codes = screen.getAllByTestId('qr')

    expect(codes).toHaveLength(2)
    codes.forEach((code) => {
      const value = code.getAttribute('data-value')

      expect(value).toBe(`${window.location.origin}/c/HAB-2026-004719`)
      expect(value).not.toMatch(/Sandra|1032774019|1\.032/)
    })
  })

  it('shows a preview of the certificate sheet next to the QR code', () => {
    render(<IssuedStep certificate={CERTIFICATE} entity={ENTITY} worker={WORKER} onIssueAnother={vi.fn()} />)

    const heading = screen.getByRole('heading', { name: 'Vista previa del certificado' })
    const sheet = screen.getByRole('group', { name: 'Certificado HAB-2026-004719' })

    expect(heading).toBeInTheDocument()
    expect(heading).not.toHaveAttribute('tabindex')
    expect(within(sheet).getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
    expect(within(sheet).getByText('NIT 901.482.317-5 · Bogotá')).toBeInTheDocument()
    expect(within(sheet).getByText('Trabajo en alturas')).toBeInTheDocument()
    expect(within(sheet).getByText('Sandra Milena Lozano Pardo')).toBeInTheDocument()
    expect(within(sheet).getByText('C.C. 1.032.774.019')).toBeInTheDocument()
    expect(within(sheet).getByText('9 de octubre de 2026')).toBeInTheDocument()
    expect(within(sheet).getByText('9 de octubre de 2027')).toBeInTheDocument()
    expect(sheet).toHaveAttribute('data-theme', 'light')
  })

  it('keeps the focus target on the QR heading', () => {
    render(<IssuedStep certificate={CERTIFICATE} entity={ENTITY} worker={WORKER} onIssueAnother={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Código QR' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('heading', { name: 'Vista previa del certificado' })).not.toHaveAttribute('tabindex')
  })

  it('opens the printable sheet in a new tab', () => {
    render(<IssuedStep certificate={CERTIFICATE} entity={ENTITY} worker={WORKER} onIssueAnother={vi.fn()} />)

    const link = screen.getByRole('link', { name: /Descargar o imprimir/ })

    expect(link).toHaveAttribute('href', '/emisor/certificados/HAB-2026-004719/hoja')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('starts another certificate', () => {
    const onIssueAnother = vi.fn()
    render(<IssuedStep certificate={CERTIFICATE} entity={ENTITY} worker={WORKER} onIssueAnother={onIssueAnother} />)

    fireEvent.click(screen.getByRole('button', { name: 'Emitir otro certificado' }))

    expect(onIssueAnother).toHaveBeenCalledTimes(1)
  })
})
