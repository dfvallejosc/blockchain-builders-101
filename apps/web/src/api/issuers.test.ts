import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIssuer, listIssuers, registerIssuer, revokeIssuer, toBogotaDate } from '@/api/issuers'
import type { Entity, NewEntityInput } from '@/data/types'
import { apiClient } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

const ENTITY: Entity = {
  id: '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11',
  name: 'Salud Ocupacional del Valle',
  type: 'clinic',
  city: 'Medellín',
  registeredAt: '2026-10-17T10:00:00.000Z',
  revokedAt: null,
  certificateTypes: ['occupational-medical'],
  nit: '901.482.317-5',
  contactName: 'Marcela Ríos',
  email: 'marcela@saludvalle.co',
  phone: '310 555 0142',
  ministryRegistration: 'REG-2024-118',
  issuedThisMonth: 4,
}

const NEW_ENTITY: NewEntityInput = {
  name: ENTITY.name,
  type: ENTITY.type,
  city: ENTITY.city,
  certificateTypes: ENTITY.certificateTypes,
  nit: ENTITY.nit,
  ministryRegistration: ENTITY.ministryRegistration,
  contactName: ENTITY.contactName,
  email: ENTITY.email,
  phone: ENTITY.phone,
}

describe('toBogotaDate', () => {
  it.each([
    ['2026-10-17T10:00:00.000Z', '2026-10-17'],
    // 03:00Z is still the 17th at 22:00 in Bogota (UTC-5).
    ['2026-10-18T03:00:00.000Z', '2026-10-17'],
    ['2026-10-18T05:00:00.000Z', '2026-10-18'],
    ['2026-12-31T23:30:00.000Z', '2026-12-31'],
  ])('turns %s into the Bogota date %s', (iso, date) => {
    expect(toBogotaDate(iso)).toBe(date)
  })
})

describe('issuers api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the issuers with GET /issuers and turns the dates into Bogota dates', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [ENTITY, { ...ENTITY, id: 'other', revokedAt: '2026-10-18T03:00:00.000Z' }],
    })

    const issuers = await listIssuers()

    expect(apiClient.get).toHaveBeenCalledWith('/issuers')
    expect(issuers.map((issuer) => [issuer.registeredAt, issuer.revokedAt])).toEqual([
      ['2026-10-17', null],
      ['2026-10-17', '2026-10-17'],
    ])
    expect(issuers[0]).toMatchObject({ name: ENTITY.name, nit: ENTITY.nit, issuedThisMonth: 4 })
  })

  it('gets one issuer with GET /issuers/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: ENTITY })

    await expect(getIssuer(ENTITY.id)).resolves.toMatchObject({ id: ENTITY.id, registeredAt: '2026-10-17' })
    expect(apiClient.get).toHaveBeenCalledWith(`/issuers/${ENTITY.id}`)
  })

  it('encodes an id that would change the path', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: ENTITY })

    await getIssuer('a/b c?x=1')

    expect(apiClient.get).toHaveBeenCalledWith('/issuers/a%2Fb%20c%3Fx%3D1')
  })

  it('registers an issuer with POST /issuers and the input body', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: ENTITY })

    await expect(registerIssuer(NEW_ENTITY)).resolves.toMatchObject({ id: ENTITY.id, registeredAt: '2026-10-17' })
    expect(apiClient.post).toHaveBeenCalledWith('/issuers', NEW_ENTITY)
  })

  it('revokes an issuer with POST /issuers/:id/revoke and keeps revokedAt as a Bogota date', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ...ENTITY, revokedAt: '2026-10-18T03:00:00.000Z' } })

    await expect(revokeIssuer(ENTITY.id)).resolves.toMatchObject({ revokedAt: '2026-10-17' })
    expect(apiClient.post).toHaveBeenCalledWith(`/issuers/${ENTITY.id}/revoke`)
  })
})
