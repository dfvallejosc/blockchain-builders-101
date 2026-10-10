import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataError } from '@/data/errors'
import { resetState } from '@/data/storage'
import { listWorkers, registerWorker } from '@/data/workers'
import type { NewWorkerInput } from '@/data/types'

const CUMBRE = 'centro-entrenamiento-cumbre-firme'
const input: NewWorkerInput = {
  fullName: '  Laura Patricia Gómez Ríos ',
  documentType: 'cc',
  documentNumber: '1012345678',
  dataConsent: true,
}

describe('workers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists only the workers of the entity', async () => {
    expect(await listWorkers(CUMBRE)).toHaveLength(12)
    expect(await listWorkers('salud-laboral-rio-claro')).toEqual([])
  })

  it('registers a worker with the consent date', async () => {
    const worker = await registerWorker('salud-laboral-rio-claro', input)

    expect(worker).toMatchObject({
      entityId: 'salud-laboral-rio-claro',
      fullName: 'Laura Patricia Gómez Ríos',
      registeredAt: '2026-10-09',
      consentedAt: '2026-10-09',
    })
    expect(await listWorkers('salud-laboral-rio-claro')).toEqual([worker])
  })

  it('refuses to register without the data consent', async () => {
    await expect(registerWorker(CUMBRE, { ...input, dataConsent: false })).rejects.toEqual(
      new DataError('consent-required'),
    )
  })

  it('refuses a worker already registered by the same entity with the same document', async () => {
    await registerWorker(CUMBRE, input)

    await expect(registerWorker(CUMBRE, input)).rejects.toEqual(new DataError('duplicate'))
  })

  it('allows the same document in a different entity', async () => {
    await registerWorker(CUMBRE, input)

    await expect(registerWorker('salud-laboral-rio-claro', input)).resolves.toBeDefined()
  })

  it('refuses an entity that does not exist', async () => {
    await expect(registerWorker('nope', input)).rejects.toEqual(new DataError('not-found'))
  })

  it('gives different ids to workers registered one after another', async () => {
    const first = await registerWorker(CUMBRE, input)
    const second = await registerWorker(CUMBRE, { ...input, documentNumber: '1099999999' })

    expect(first.id).not.toBe(second.id)
  })
})
