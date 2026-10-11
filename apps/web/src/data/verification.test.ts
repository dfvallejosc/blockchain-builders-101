import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { issueCertificate } from '@/data/certificates'
import { revokeEntity } from '@/data/entities'
import { resetState } from '@/data/storage'
import { verifyCertificate } from '@/data/verification'

describe('verifyCertificate', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is valid for a current certificate and shows the worker and the entity', async () => {
    expect(await verifyCertificate('HAB-2026-004718')).toEqual({
      status: 'valid',
      certificate: {
        id: 'HAB-2026-004718',
        type: 'height-work',
        issuedAt: '2026-10-02',
        validUntil: '2027-10-02',
      },
      worker: { fullName: 'Carlos Andrés Ramírez Pineda', documentType: 'cc', documentNumber: '1020345678' },
      entity: { name: 'Centro de Entrenamiento Cumbre Firme' },
    })
  })

  it('is expired when the validity passed', async () => {
    expect((await verifyCertificate('HAB-2025-003981')).status).toBe('expired')
  })

  it('is annulled when the issuer annulled it', async () => {
    expect((await verifyCertificate('HAB-2026-004655')).status).toBe('annulled')
  })

  it('is invalid for an unknown or malformed id', async () => {
    const unknown = { status: 'invalid', reason: 'unknown-certificate' }

    expect(await verifyCertificate('HAB-2026-999999')).toEqual(unknown)
    expect(await verifyCertificate('')).toEqual(unknown)
    expect(await verifyCertificate('   ')).toEqual(unknown)
    expect(await verifyCertificate('not-an-id')).toEqual(unknown)
  })

  it('is invalid with the entity name, and without the worker, when the entity was revoked', async () => {
    await revokeEntity('centro-entrenamiento-cumbre-firme')

    expect(await verifyCertificate('HAB-2026-004718')).toEqual({
      status: 'invalid',
      reason: 'entity-revoked',
      entity: { name: 'Centro de Entrenamiento Cumbre Firme' },
    })
  })

  it('treats a revoked entity as invalid even for annulled or expired certificates', async () => {
    await revokeEntity('centro-entrenamiento-cumbre-firme')

    expect(await verifyCertificate('HAB-2026-004655')).toMatchObject({ reason: 'entity-revoked' })
    expect(await verifyCertificate('HAB-2025-003981')).toMatchObject({ reason: 'entity-revoked' })
  })

  it('verifies a certificate just issued', async () => {
    const certificate = await issueCertificate('centro-entrenamiento-cumbre-firme', {
      workerId: 'w-sandra',
      type: 'confined-spaces',
      issuedAt: '2026-10-09',
      validUntil: '2027-10-09',
    })

    expect((await verifyCertificate(certificate.id)).status).toBe('valid')
  })

  it('never exposes medical data: the result has no field beyond identity, type and dates', async () => {
    const result = await verifyCertificate('HAB-2026-004718')

    expect(Object.keys(result).sort()).toEqual(['certificate', 'entity', 'status', 'worker'])
    expect(Object.keys('worker' in result ? result.worker : {}).sort()).toEqual([
      'documentNumber',
      'documentType',
      'fullName',
    ])
  })
})
