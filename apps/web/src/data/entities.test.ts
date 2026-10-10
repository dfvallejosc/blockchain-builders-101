import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getEntity, listEntities, registerEntity, revokeEntity } from '@/data/entities'
import { DataError } from '@/data/errors'
import { resetState } from '@/data/storage'
import type { NewEntityInput } from '@/data/types'

const newEntity: NewEntityInput = {
  name: 'Centro Andino de Seguridad',
  type: 'training-center',
  city: 'Medellín',
  certificateTypes: ['height-work'],
  nit: '901.111.222-3',
  ministryRegistration: '',
  contactName: 'Ana Gómez',
  email: 'contacto@centroandino.co',
  phone: '300 555 0100',
}

describe('entities', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists the seed entities', async () => {
    expect(await listEntities()).toHaveLength(8)
  })

  it('finds one entity by id and returns null when it does not exist', async () => {
    expect((await getEntity('salud-laboral-rio-claro'))?.name).toBe('Salud Laboral Río Claro')
    expect(await getEntity('nope')).toBeNull()
  })

  it('registers an entity, active and first in the list', async () => {
    const entity = await registerEntity(newEntity)

    expect(entity).toMatchObject({
      id: 'centro-andino-de-seguridad',
      registeredAt: '2026-10-09',
      revokedAt: null,
      issuedThisMonth: 0,
    })
    expect((await listEntities())[0].id).toBe('centro-andino-de-seguridad')
  })

  it('rejects a repeated NIT, email or name', async () => {
    await registerEntity(newEntity)

    await expect(registerEntity({ ...newEntity, name: 'Otro', email: 'otro@x.co' })).rejects.toEqual(
      new DataError('duplicate'),
    )
    await expect(registerEntity({ ...newEntity, name: 'Otro', nit: '1' })).rejects.toEqual(
      new DataError('duplicate'),
    )
    await expect(registerEntity({ ...newEntity, nit: '2', email: 'otro@x.co' })).rejects.toEqual(
      new DataError('duplicate'),
    )
  })

  it('revokes an entity with today as the date', async () => {
    const revoked = await revokeEntity('salud-laboral-rio-claro')

    expect(revoked.revokedAt).toBe('2026-10-09')
    expect((await getEntity('salud-laboral-rio-claro'))?.revokedAt).toBe('2026-10-09')
  })

  it('fails to revoke an entity that does not exist', async () => {
    await expect(revokeEntity('nope')).rejects.toEqual(new DataError('not-found'))
  })
})
