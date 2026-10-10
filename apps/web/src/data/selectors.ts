import { today } from '@/data/clock'
import { SEED_CERTIFICATES, SEED_ENTITIES, SEED_WORKERS } from '@/data/seed'
import type { StoredState } from '@/data/storage'
import type { Certificate, Entity, Worker } from '@/data/types'

export const selectCertificates = (state: StoredState): Certificate[] => [
  ...state.addedCertificates,
  ...SEED_CERTIFICATES,
]

export const selectWorkers = (state: StoredState): Worker[] => [
  ...state.addedWorkers,
  ...SEED_WORKERS,
]

export const selectEntities = (state: StoredState): Entity[] => {
  const month = today().slice(0, 7)
  const addedCertificates = selectCertificates(state).filter(
    (certificate) => state.addedCertificates.includes(certificate) && certificate.issuedAt.startsWith(month),
  )

  return [...state.addedEntities, ...SEED_ENTITIES].map((entity) => ({
    ...entity,
    revokedAt: state.revokedEntities[entity.id] ?? entity.revokedAt,
    issuedThisMonth:
      entity.issuedThisMonth +
      addedCertificates.filter((certificate) => certificate.entityId === entity.id).length,
  }))
}
