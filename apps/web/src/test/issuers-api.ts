import { vi } from 'vitest'
import { today } from '@/data/clock'
import { DataError } from '@/data/errors'
import { SEED_ENTITIES } from '@/data/seed'
import type { Entity, NewEntityInput } from '@/data/types'

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

let issuers: Entity[] = []

const list = async (): Promise<Entity[]> => issuers.map((issuer) => ({ ...issuer }))

const get = async (id: string): Promise<Entity> => {
  const found = issuers.find((issuer) => issuer.id === id)
  if (!found) throw new DataError('not-found')
  return { ...found }
}

const register = async (input: NewEntityInput): Promise<Entity> => {
  const email = input.email.trim().toLowerCase()
  const id = slugify(input.name)
  const duplicate = issuers.some(
    (issuer) => issuer.id === id || issuer.nit === input.nit.trim() || issuer.email.toLowerCase() === email,
  )
  if (duplicate) throw new DataError('duplicate')
  const entity: Entity = {
    id,
    name: input.name.trim(),
    type: input.type,
    city: input.city,
    registeredAt: today(),
    revokedAt: null,
    certificateTypes: input.certificateTypes,
    nit: input.nit.trim(),
    contactName: input.contactName.trim(),
    email,
    phone: input.phone.trim(),
    ministryRegistration: input.ministryRegistration.trim(),
    issuedThisMonth: 0,
  }
  issuers = [entity, ...issuers]
  return { ...entity }
}

const revoke = async (id: string): Promise<Entity> => {
  const index = issuers.findIndex((issuer) => issuer.id === id)
  if (index === -1) throw new DataError('not-found')
  const revoked = { ...issuers[index]!, revokedAt: today() }
  issuers = issuers.map((issuer, position) => (position === index ? revoked : issuer))
  return { ...revoked }
}

// The same four calls as `@/api/issuers`, backed by an in-memory copy of the sample issuers.
export const issuersApi = {
  listIssuers: vi.fn(list),
  getIssuer: vi.fn(get),
  registerIssuer: vi.fn(register),
  revokeIssuer: vi.fn(revoke),
}

export const resetIssuersApi = (): void => {
  issuers = SEED_ENTITIES.map((issuer) => ({ ...issuer }))
  issuersApi.listIssuers.mockReset().mockImplementation(list)
  issuersApi.getIssuer.mockReset().mockImplementation(get)
  issuersApi.registerIssuer.mockReset().mockImplementation(register)
  issuersApi.revokeIssuer.mockReset().mockImplementation(revoke)
}
