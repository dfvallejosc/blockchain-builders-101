import { today } from '@/data/clock'
import { DataError } from '@/data/errors'
import { selectEntities } from '@/data/selectors'
import { readState, writeState } from '@/data/storage'
import type { Entity, NewEntityInput } from '@/data/types'

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const listEntities = async (): Promise<Entity[]> => selectEntities(readState())

export const getEntity = async (id: string): Promise<Entity | null> =>
  selectEntities(readState()).find((entity) => entity.id === id) ?? null

export const registerEntity = async (input: NewEntityInput): Promise<Entity> => {
  const state = readState()
  const id = slugify(input.name)
  const email = input.email.trim().toLowerCase()
  const isDuplicate = selectEntities(state).some(
    (entity) => entity.id === id || entity.nit === input.nit.trim() || entity.email.toLowerCase() === email,
  )
  if (isDuplicate) throw new DataError('duplicate')

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
  writeState({ ...state, addedEntities: [entity, ...state.addedEntities] })
  return entity
}

export const revokeEntity = async (id: string): Promise<Entity> => {
  const state = readState()
  const entity = selectEntities(state).find((candidate) => candidate.id === id)
  if (!entity) throw new DataError('not-found')

  const revokedAt = today()
  writeState({ ...state, revokedEntities: { ...state.revokedEntities, [id]: revokedAt } })
  return { ...entity, revokedAt }
}
