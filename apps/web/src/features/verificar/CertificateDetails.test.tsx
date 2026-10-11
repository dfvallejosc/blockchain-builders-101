import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CertificateDetails } from '@/features/verificar/CertificateDetails'

const certificate = { id: 'HAB-2026-004718', type: 'height-work' as const, issuedAt: '2026-10-02', validUntil: '2027-10-02' }
const worker = { fullName: 'Carlos Andrés Ramírez Pineda', documentType: 'cc' as const, documentNumber: '1020345678' }
const entity = { name: 'Centro de Entrenamiento Cumbre Firme' }
const queriedAt = new Date(2026, 9, 11, 14, 47)

describe('CertificateDetails', () => {
  it('shows worker, document, certificate, dates and entity for a valid certificate', () => {
    render(<CertificateDetails state={{ phase: 'done', result: { status: 'valid', certificate, worker, entity } }} queriedAt={queriedAt} />)

    expect(screen.getByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
    expect(screen.getByText('C.C. 1.020.345.678')).toBeInTheDocument()
    expect(screen.getByText('Trabajo en alturas')).toBeInTheDocument()
    expect(screen.getByText('HAB-2026-004718')).toBeInTheDocument()
    expect(screen.getByText('2 de octubre de 2026')).toBeInTheDocument()
    expect(screen.getByText('2 de octubre de 2027')).toBeInTheDocument()
    expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
    expect(screen.getByText('Habilitado')).toBeInTheDocument()
    expect(screen.getByText(/^Consulta: /)).toBeInTheDocument()
  })

  it('labels the end date "Venció" for an expired certificate', () => {
    render(<CertificateDetails state={{ phase: 'done', result: { status: 'expired', certificate, worker, entity } }} queriedAt={queriedAt} />)

    expect(screen.getByText('Venció')).toBeInTheDocument()
  })

  it('shows only the revoked entity, without the worker, when the entity was revoked', () => {
    render(<CertificateDetails state={{ phase: 'done', result: { status: 'invalid', reason: 'entity-revoked', entity } }} queriedAt={queriedAt} />)

    expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
    expect(screen.getByText('Revocado')).toBeInTheDocument()
    expect(screen.queryByText('Trabajador')).not.toBeInTheDocument()
  })

  it('shows nothing for an unknown certificate or a failed query', () => {
    const { container, rerender } = render(
      <CertificateDetails state={{ phase: 'done', result: { status: 'invalid', reason: 'unknown-certificate' } }} queriedAt={queriedAt} />,
    )
    expect(container).toBeEmptyDOMElement()

    rerender(<CertificateDetails state={{ phase: 'error' }} queriedAt={queriedAt} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows skeleton cards while loading', () => {
    const { container } = render(<CertificateDetails state={{ phase: 'loading' }} queriedAt={queriedAt} />)

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('Trabajador')).not.toBeInTheDocument()
  })
})
