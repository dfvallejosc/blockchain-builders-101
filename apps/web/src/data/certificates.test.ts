import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  certificateStatus,
  getCertificate,
  issueCertificate,
  listCertificates,
} from '@/data/certificates'
import { revokeEntity } from '@/data/entities'
import { DataError } from '@/data/errors'
import { resetState } from '@/data/storage'
import { registerWorker } from '@/data/workers'
import type { Certificate, IssueCertificateInput } from '@/data/types'

const CUMBRE = 'centro-entrenamiento-cumbre-firme'
const input: IssueCertificateInput = {
  workerId: 'w-sandra',
  type: 'height-work',
  issuedAt: '2026-10-09',
  validUntil: '2027-10-09',
}

const base: Certificate = {
  number: 1,
  id: 'HAB-2026-000001',
  entityId: CUMBRE,
  workerId: 'w-sandra',
  type: 'height-work',
  issuedAt: '2026-01-01',
  validUntil: '2026-12-31',
  annulledAt: null,
}

describe('certificateStatus', () => {
  it('is valid up to and including the last day', () => {
    expect(certificateStatus(base, '2026-12-31')).toBe('valid')
  })

  it('is expired the day after', () => {
    expect(certificateStatus(base, '2027-01-01')).toBe('expired')
  })

  it('is annulled even when it is also expired', () => {
    expect(certificateStatus({ ...base, annulledAt: '2026-03-01' }, '2027-06-01')).toBe('annulled')
  })
})

describe('certificates', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists the certificates of an entity, newest first', async () => {
    const list = await listCertificates(CUMBRE)

    expect(list).toHaveLength(18)
    expect(list[0].number).toBe(4718)
    expect(await listCertificates('salud-laboral-rio-claro')).toEqual([])
  })

  it('finds a certificate by its id and returns null when unknown', async () => {
    expect((await getCertificate('HAB-2026-004718'))?.number).toBe(4718)
    expect(await getCertificate('HAB-2026-999999')).toBeNull()
  })

  it('issues a certificate with the next number', async () => {
    const certificate = await issueCertificate(CUMBRE, input)

    expect(certificate).toMatchObject({
      number: 4719,
      id: 'HAB-2026-004719',
      entityId: CUMBRE,
      annulledAt: null,
    })
    expect((await listCertificates(CUMBRE))[0]).toEqual(certificate)
  })

  it('gives different numbers to certificates issued back to back', async () => {
    const first = await issueCertificate(CUMBRE, input)
    const second = await issueCertificate(CUMBRE, { ...input, type: 'confined-spaces' })

    expect(second.number).toBe(first.number + 1)
  })

  it('counts the new certificate in the entity monthly figure', async () => {
    const { listEntities } = await import('@/data/entities')
    const before = (await listEntities()).find((entity) => entity.id === CUMBRE)?.issuedThisMonth

    await issueCertificate(CUMBRE, input)

    const after = (await listEntities()).find((entity) => entity.id === CUMBRE)?.issuedThisMonth
    expect(after).toBe((before ?? 0) + 1)
  })

  it('refuses dates where the validity does not end after the issue date', async () => {
    await expect(issueCertificate(CUMBRE, { ...input, validUntil: '2026-10-09' })).rejects.toEqual(
      new DataError('invalid-dates'),
    )
    await expect(issueCertificate(CUMBRE, { ...input, validUntil: '2026-01-01' })).rejects.toEqual(
      new DataError('invalid-dates'),
    )
  })

  it('refuses a type the entity cannot issue', async () => {
    await expect(issueCertificate(CUMBRE, { ...input, type: 'occupational-medical' })).rejects.toEqual(
      new DataError('type-not-allowed'),
    )
  })

  it('refuses a worker of another entity', async () => {
    const worker = await registerWorker('centro-formacion-torre-andina', {
      fullName: 'Pedro Pérez Gil',
      documentType: 'cc',
      documentNumber: '1000000001',
      dataConsent: true,
    })

    await expect(issueCertificate(CUMBRE, { ...input, workerId: worker.id })).rejects.toEqual(
      new DataError('not-found'),
    )
  })

  it('refuses an entity that does not exist', async () => {
    await expect(issueCertificate('nope', input)).rejects.toEqual(new DataError('not-found'))
  })

  it('refuses to issue when the entity was revoked', async () => {
    await revokeEntity(CUMBRE)

    await expect(issueCertificate(CUMBRE, input)).rejects.toEqual(new DataError('entity-revoked'))
  })
})
