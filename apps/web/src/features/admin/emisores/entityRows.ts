import type { Entity, EntityType } from '@/data'
import { fold } from '@/features/emisor/trabajadores/workerRows'

export type EntityStatus = 'valid' | 'revoked'

export interface EntityRow {
  id: string
  name: string
  typeLabel: string
  city: string
  status: EntityStatus
  registeredAt: string
  issuedThisMonth: number
}

export interface EntityFilters {
  query: string
  statuses: EntityStatus[]
}

export const TYPE_LABEL: Record<EntityType, string> = {
  clinic: 'Consultorio',
  'training-center': 'Centro de entrenamiento',
}

export const toEntityRows = (entities: Entity[]): EntityRow[] =>
  entities
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      typeLabel: TYPE_LABEL[entity.type],
      city: entity.city,
      status: entity.revokedAt === null ? ('valid' as const) : ('revoked' as const),
      registeredAt: entity.registeredAt,
      issuedThisMonth: entity.issuedThisMonth,
    }))
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt) || a.name.localeCompare(b.name, 'es'))

export const filterEntityRows = (rows: EntityRow[], { query, statuses }: EntityFilters): EntityRow[] => {
  const needle = fold(query).trim().replace(/\s+/g, ' ')

  return rows.filter(
    (row) =>
      (needle === '' || fold(row.name).includes(needle)) && (statuses.length === 0 || statuses.includes(row.status)),
  )
}
