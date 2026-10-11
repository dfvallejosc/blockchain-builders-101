import { describe, expect, it } from 'vitest'
import type { Worker } from '@/data'
import { filterWorkerRows, toWorkerRows } from '@/features/emisor/trabajadores/workerRows'

const worker = (id: string, fullName: string, documentType: Worker['documentType'], documentNumber: string): Worker => ({
  id,
  entityId: 'entity',
  fullName,
  documentType,
  documentNumber,
  registeredAt: '2026-01-01',
  consentedAt: '2026-01-01',
})

const WORKERS = [
  worker('w-carlos', 'Carlos Andrés Ramírez Pineda', 'cc', '1020345678'),
  worker('w-nicolas', 'Nicolás Arango Villegas', 'passport', 'PA7731905'),
  worker('w-paola', 'Paola Andrea Niño Vargas', 'cc', '52418903'),
]

describe('toWorkerRows', () => {
  it('gives each worker its name and a formatted document', () => {
    const rows = toWorkerRows(WORKERS)

    expect(rows[0]).toEqual({
      id: 'w-carlos',
      fullName: 'Carlos Andrés Ramírez Pineda',
      document: 'C.C. 1.020.345.678',
    })
  })

  it('orders workers by name', () => {
    expect(toWorkerRows(WORKERS).map((row) => row.id)).toEqual(['w-carlos', 'w-nicolas', 'w-paola'])
    expect(toWorkerRows([...WORKERS].reverse()).map((row) => row.id)).toEqual(['w-carlos', 'w-nicolas', 'w-paola'])
  })
})

describe('filterWorkerRows', () => {
  const rows = toWorkerRows(WORKERS)

  it('keeps every row when the query is blank', () => {
    expect(filterWorkerRows(rows, '   ')).toHaveLength(3)
  })

  it('matches by name ignoring case and accents', () => {
    expect(filterWorkerRows(rows, 'nicolas').map((row) => row.id)).toEqual(['w-nicolas'])
    expect(filterWorkerRows(rows, 'ANDRES').map((row) => row.id)).toEqual(['w-carlos'])
  })

  it('matches by document ignoring dots and spaces', () => {
    expect(filterWorkerRows(rows, '1.020.345').map((row) => row.id)).toEqual(['w-carlos'])
    expect(filterWorkerRows(rows, '52 418').map((row) => row.id)).toEqual(['w-paola'])
  })

  it('returns nothing when no worker matches', () => {
    expect(filterWorkerRows(rows, 'zzz')).toEqual([])
  })
})
