import { describe, expect, it } from 'vitest'
import { SEED_CERTIFICATES, SEED_ENTITIES, SEED_WORKERS } from '@/data/seed'

describe('seed data', () => {
  it('has unique ids', () => {
    const unique = (values: string[]) => new Set(values).size === values.length
    expect(unique(SEED_ENTITIES.map((entity) => entity.id))).toBe(true)
    expect(unique(SEED_WORKERS.map((worker) => worker.id))).toBe(true)
    expect(unique(SEED_CERTIFICATES.map((certificate) => certificate.id))).toBe(true)
  })

  it('only references existing entities and workers', () => {
    const entityIds = new Set(SEED_ENTITIES.map((entity) => entity.id))
    const workerIds = new Set(SEED_WORKERS.map((worker) => worker.id))
    expect(SEED_WORKERS.every((worker) => entityIds.has(worker.entityId))).toBe(true)
    expect(
      SEED_CERTIFICATES.every(
        (certificate) => entityIds.has(certificate.entityId) && workerIds.has(certificate.workerId),
      ),
    ).toBe(true)
  })

  it('only has certificates of a type their entity may issue', () => {
    const byId = new Map(SEED_ENTITIES.map((entity) => [entity.id, entity]))
    expect(
      SEED_CERTIFICATES.every((certificate) =>
        byId.get(certificate.entityId)?.certificateTypes.includes(certificate.type),
      ),
    ).toBe(true)
  })

  it('covers the four verification outcomes', () => {
    expect(SEED_ENTITIES.some((entity) => entity.revokedAt !== null)).toBe(true)
    expect(SEED_CERTIFICATES.some((certificate) => certificate.annulledAt !== null)).toBe(true)
  })
})
