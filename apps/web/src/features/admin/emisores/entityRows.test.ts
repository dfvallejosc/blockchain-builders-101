import { describe, expect, it } from 'vitest'
import { SEED_ENTITIES } from '@/data/seed'
import { filterEntityRows, toEntityRows } from '@/features/admin/emisores/entityRows'

const rows = toEntityRows(SEED_ENTITIES)
const ids = (list: typeof rows) => list.map((row) => row.id)

describe('toEntityRows', () => {
  it('orders the issuers by registration date, the most recent first', () => {
    expect(ids(rows)).toEqual([
      'centro-capacitacion-gruas-del-valle',
      'centro-entrenamiento-anclaje-caribe',
      'centro-formacion-torre-andina',
      'consultorio-ocupacional-altiplano-sur',
      'salud-laboral-rio-claro',
      'consultorio-ocupacional-lomas-del-sur',
      'consultorio-medico-bahia-norte',
      'centro-entrenamiento-cumbre-firme',
    ])
  })

  it('shows the type as a short label, and the status as valid or revoked', () => {
    expect(rows[0]).toEqual({
      id: 'centro-capacitacion-gruas-del-valle',
      name: 'Centro de Capacitación Grúas del Valle',
      typeLabel: 'Centro de entrenamiento',
      city: 'Manizales',
      status: 'valid',
      registeredAt: '2026-05-26',
      issuedThisMonth: 3,
    })
    expect(rows.find((row) => row.id === 'consultorio-medico-bahia-norte')).toMatchObject({
      typeLabel: 'Consultorio',
      status: 'revoked',
    })
  })
})

describe('filterEntityRows', () => {
  it('returns everything without a query or a status', () => {
    expect(filterEntityRows(rows, { query: '', statuses: [] })).toHaveLength(8)
    expect(filterEntityRows(rows, { query: '   ', statuses: [] })).toHaveLength(8)
  })

  it('finds an issuer by name ignoring accents, case and extra spaces', () => {
    expect(ids(filterEntityRows(rows, { query: 'rio claro', statuses: [] }))).toEqual(['salud-laboral-rio-claro'])
    expect(ids(filterEntityRows(rows, { query: 'GRÚAS', statuses: [] }))).toEqual(['centro-capacitacion-gruas-del-valle'])
    expect(ids(filterEntityRows(rows, { query: '  rio   claro ', statuses: [] }))).toEqual(['salud-laboral-rio-claro'])
  })

  it('keeps only the chosen status', () => {
    expect(ids(filterEntityRows(rows, { query: '', statuses: ['revoked'] }))).toEqual([
      'consultorio-ocupacional-altiplano-sur',
      'consultorio-medico-bahia-norte',
    ])
    expect(filterEntityRows(rows, { query: '', statuses: ['valid'] })).toHaveLength(6)
  })

  it('shows both statuses together when both are chosen', () => {
    expect(filterEntityRows(rows, { query: '', statuses: ['valid', 'revoked'] })).toHaveLength(8)
  })

  it('combines the query and the status', () => {
    expect(ids(filterEntityRows(rows, { query: 'ocupacional', statuses: ['revoked'] }))).toEqual([
      'consultorio-ocupacional-altiplano-sur',
    ])
  })
})
