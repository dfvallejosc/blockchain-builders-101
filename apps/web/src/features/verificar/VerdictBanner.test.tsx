import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { VerificationResult } from '@/data'
import { VerdictBanner } from '@/features/verificar/VerdictBanner'
import type { VerificationState } from '@/features/verificar/useVerification'

const done = (result: VerificationResult): VerificationState => ({ phase: 'done', result })

const certificate = { id: 'HAB-2026-004718', type: 'height-work' as const, issuedAt: '2026-10-02', validUntil: '2027-10-02' }
const worker = { fullName: 'Carlos Andrés Ramírez Pineda', documentType: 'cc' as const, documentNumber: '1020345678' }
const entity = { name: 'Centro de Entrenamiento Cumbre Firme' }

describe('VerdictBanner', () => {
  it('says Habilitado with the validity date', () => {
    render(<VerdictBanner state={done({ status: 'valid', certificate, worker, entity })} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Habilitado' })).toBeInTheDocument()
    expect(screen.getByText('Vigente hasta el 2 de octubre de 2027.')).toBeInTheDocument()
  })

  it('says Vencido with the date it expired', () => {
    render(<VerdictBanner state={done({ status: 'expired', certificate, worker, entity })} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Vencido' })).toBeInTheDocument()
    expect(screen.getByText('Venció el 2 de octubre de 2027. No está habilitado hasta renovarlo.')).toBeInTheDocument()
  })

  it('says Anulado', () => {
    render(<VerdictBanner state={done({ status: 'annulled', certificate, worker, entity })} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Anulado' })).toBeInTheDocument()
    expect(screen.getByText('La entidad emisora anuló este certificado.')).toBeInTheDocument()
  })

  it('says No válido for an unknown certificate', () => {
    render(<VerdictBanner state={done({ status: 'invalid', reason: 'unknown-certificate' })} />)

    expect(screen.getByRole('heading', { level: 1, name: 'No válido' })).toBeInTheDocument()
    expect(screen.getByText('Este código QR no corresponde a ningún certificado.')).toBeInTheDocument()
  })

  it('says No válido for a revoked entity', () => {
    render(<VerdictBanner state={done({ status: 'invalid', reason: 'entity-revoked', entity })} />)

    expect(screen.getByRole('heading', { level: 1, name: 'No válido' })).toBeInTheDocument()
    expect(screen.getByText('La entidad que lo emitió fue revocada.')).toBeInTheDocument()
  })

  it('says Verificando while loading', () => {
    render(<VerdictBanner state={{ phase: 'loading' }} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Verificando…' })).toBeInTheDocument()
  })

  it('says Sin verificar, and not No válido, when the query failed', () => {
    render(<VerdictBanner state={{ phase: 'error' }} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Sin verificar' })).toBeInTheDocument()
    expect(screen.queryByText('No válido')).not.toBeInTheDocument()
    expect(screen.getByText(/esto no significa que sea inválido/)).toBeInTheDocument()
  })

  it('announces the verdict politely', () => {
    render(<VerdictBanner state={{ phase: 'loading' }} />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})
