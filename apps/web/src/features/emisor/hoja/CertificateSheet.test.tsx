import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Certificate, Entity, Worker } from '@/data'
import { CertificateSheet } from '@/features/emisor/hoja/CertificateSheet'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

const CERTIFICATE: Certificate = {
  number: 4718,
  id: 'HAB-2026-004718',
  entityId: 'e',
  workerId: 'w',
  type: 'height-work',
  issuedAt: '2026-10-02',
  validUntil: '2027-10-02',
  annulledAt: null,
}
const ENTITY = { id: 'e', name: 'Centro de Entrenamiento Cumbre Firme', nit: '901.456.223-8', city: 'Medellín' } as Entity
const WORKER = {
  id: 'w',
  fullName: 'Carlos Andrés Ramírez Pineda',
  documentType: 'cc',
  documentNumber: '1020345678',
} as Worker
const VERIFY_URL = 'https://verifica.example.co/c/HAB-2026-004718'

const renderSheet = () =>
  render(<CertificateSheet certificate={CERTIFICATE} entity={ENTITY} worker={WORKER} verifyUrl={VERIFY_URL} />)

describe('CertificateSheet', () => {
  it('shows the entity, certificate type, holder and both dates', () => {
    renderSheet()
    const sheet = screen.getByRole('group', { name: 'Certificado HAB-2026-004718' })

    expect(within(sheet).getByText('HAB-2026-004718')).toBeInTheDocument()
    expect(within(sheet).getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
    expect(within(sheet).getByText('NIT 901.456.223-8 · Medellín')).toBeInTheDocument()
    expect(within(sheet).getByText('Trabajo en alturas')).toBeInTheDocument()
    expect(within(sheet).getByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
    expect(within(sheet).getByText('C.C. 1.020.345.678')).toBeInTheDocument()
    expect(within(sheet).getByText('2 de octubre de 2026')).toBeInTheDocument()
    expect(within(sheet).getByText('2 de octubre de 2027')).toBeInTheDocument()
  })

  it('always renders in the light theme', () => {
    renderSheet()

    expect(screen.getByRole('group')).toHaveAttribute('data-theme', 'light')
  })

  it('encodes exactly the verification address, without personal data', () => {
    renderSheet()

    const value = screen.getByTestId('qr').getAttribute('data-value')

    expect(value).toBe(VERIFY_URL)
    expect(value).not.toMatch(/Carlos|1020345678|1\.020/)
  })

  it('prints the same address as the code, without the protocol', () => {
    renderSheet()

    expect(screen.getByText('verifica.example.co/c/HAB-2026-004718')).toBeInTheDocument()
    expect(screen.getByText('Comprueba este certificado escaneando el código.')).toBeInTheDocument()
  })

  it('states that it holds no medical results or diagnoses and shows none', () => {
    renderSheet()
    const sheet = screen.getByRole('group')

    expect(
      within(sheet).getByText(
        'Este certificado solo identifica al titular y registra el tipo y las fechas. No contiene resultados médicos ni diagnósticos.',
      ),
    ).toBeInTheDocument()
    expect(sheet.textContent).not.toMatch(/restricci|apto|no apto/i)
  })
})
