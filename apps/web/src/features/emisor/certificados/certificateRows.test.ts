import { describe, expect, it } from 'vitest'
import type { Certificate, CertificateStatus, Worker } from '@/data'
import {
  filterRows,
  MISSING_WORKER_NAME,
  STATUS_LABEL,
  toRows,
  type CertificateRow,
} from '@/features/emisor/certificados/certificateRows'

const TODAY = '2026-10-09'

const cert = (overrides: Partial<Certificate> & Pick<Certificate, 'number' | 'validUntil'>): Certificate => ({
  id: `HAB-2026-${String(overrides.number).padStart(6, '0')}`,
  entityId: 'e1',
  workerId: 'w1',
  type: 'height-work',
  issuedAt: '2026-01-10',
  annulledAt: null,
  ...overrides,
})

const WORKERS: Worker[] = [
  {
    id: 'w1',
    entityId: 'e1',
    fullName: 'Carlos Andrés Ramírez Pineda',
    documentType: 'cc',
    documentNumber: '1020345678',
    registeredAt: '2025-11-14',
    consentedAt: '2025-11-14',
  },
]

const rowFor = (overrides: Partial<Certificate> & Pick<Certificate, 'number' | 'validUntil'>): CertificateRow =>
  toRows([cert(overrides)], WORKERS, TODAY)[0]

describe('toRows', () => {
  it('joins each certificate with its worker and formats the document and type', () => {
    const row = rowFor({ number: 4718, validUntil: '2027-10-02' })

    expect(row).toMatchObject({
      id: 'HAB-2026-004718',
      workerName: 'Carlos Andrés Ramírez Pineda',
      workerDocument: 'C.C. 1.020.345.678',
      typeLabel: 'Trabajo en alturas',
      issuedAt: '2026-01-10',
      validUntil: '2027-10-02',
      status: 'valid',
    })
  })

  it('keeps the order it receives', () => {
    const rows = toRows([cert({ number: 2, validUntil: '2027-01-01' }), cert({ number: 1, validUntil: '2027-01-01' })], WORKERS, TODAY)

    expect(rows.map((row) => row.id)).toEqual(['HAB-2026-000002', 'HAB-2026-000001'])
  })

  it('shows a neutral name instead of breaking when the worker is not in the list', () => {
    const [row] = toRows([cert({ number: 9, validUntil: '2027-01-01', workerId: 'ghost' })], WORKERS, TODAY)

    expect(row.workerName).toBe(MISSING_WORKER_NAME)
    expect(row.workerDocument).toBe('')
  })

  describe('validity note', () => {
    it('says Vigente when more than 60 days remain', () => {
      expect(rowFor({ number: 1, validUntil: '2026-12-09' })).toMatchObject({ validityNote: 'Vigente', noteTone: 'neutral' })
    })

    it('counts down in the last 60 days, including exactly 60', () => {
      expect(rowFor({ number: 1, validUntil: '2026-12-08' }).validityNote).toBe('Vence en 60 días')
      expect(rowFor({ number: 1, validUntil: '2026-12-09' }).validityNote).toBe('Vigente')
    })

    it('uses the singular for one day and says hoy for the last day', () => {
      expect(rowFor({ number: 1, validUntil: '2026-10-10' }).validityNote).toBe('Vence en 1 día')
      expect(rowFor({ number: 1, validUntil: TODAY })).toMatchObject({ validityNote: 'Vence hoy', status: 'valid' })
    })

    it('says how long ago it expired, in warning tone', () => {
      expect(rowFor({ number: 1, validUntil: '2026-10-08' })).toMatchObject({
        status: 'expired',
        validityNote: 'Venció hace 1 día',
        noteTone: 'warning',
      })
      expect(rowFor({ number: 1, validUntil: '2026-09-22' }).validityNote).toBe('Venció hace 17 días')
    })

    it('says when it was annulled, in danger tone, even if it is also past its date', () => {
      expect(rowFor({ number: 1, validUntil: '2026-09-01', annulledAt: '2026-09-03' })).toMatchObject({
        status: 'annulled',
        validityNote: 'Anulado el 03 sep 2026',
        noteTone: 'danger',
      })
    })
  })
})

describe('STATUS_LABEL', () => {
  it('uses only the three words of the product', () => {
    expect(STATUS_LABEL).toEqual({ valid: 'Habilitado', expired: 'Vencido', annulled: 'Anulado' })
  })
})

describe('filterRows', () => {
  const OTHER: Worker = { ...WORKERS[0], id: 'w2', fullName: 'Paola Andrea Niño Vargas', documentNumber: '52418903' }
  const rows = toRows(
    [
      cert({ number: 4718, validUntil: '2027-10-02' }),
      cert({ number: 4702, validUntil: '2026-09-22', workerId: 'w2' }),
      cert({ number: 4655, validUntil: '2027-08-27', workerId: 'w2', annulledAt: '2026-09-03' }),
    ],
    [...WORKERS, OTHER],
    TODAY,
  )
  const none = new Set<CertificateStatus>()

  it('returns everything without query or statuses', () => {
    expect(filterRows(rows, '   ', none)).toHaveLength(3)
  })

  it('finds a worker ignoring case and accents', () => {
    expect(filterRows(rows, 'RAMIREZ', none).map((row) => row.id)).toEqual(['HAB-2026-004718'])
    expect(filterRows(rows, 'nino', none)).toHaveLength(2)
  })

  it('finds by document with or without dots', () => {
    expect(filterRows(rows, '1.020.345.678', none)).toHaveLength(1)
    expect(filterRows(rows, '1020345678', none)).toHaveLength(1)
    expect(filterRows(rows, '52418903', none)).toHaveLength(2)
  })

  it('finds by certificate number, short or complete', () => {
    expect(filterRows(rows, '4702', none).map((row) => row.id)).toEqual(['HAB-2026-004702'])
    expect(filterRows(rows, 'hab-2026-004655', none).map((row) => row.id)).toEqual(['HAB-2026-004655'])
  })

  it('keeps rows with any of the selected statuses', () => {
    expect(filterRows(rows, '', new Set<CertificateStatus>(['expired'])).map((row) => row.id)).toEqual(['HAB-2026-004702'])
    expect(filterRows(rows, '', new Set<CertificateStatus>(['expired', 'annulled']))).toHaveLength(2)
  })

  it('combines the search with the statuses', () => {
    expect(filterRows(rows, 'nino', new Set<CertificateStatus>(['annulled'])).map((row) => row.id)).toEqual(['HAB-2026-004655'])
    expect(filterRows(rows, 'ramirez', new Set<CertificateStatus>(['annulled']))).toEqual([])
  })

  it('searches by the visible code, not by the uuid', () => {
    const uuidRow = rowFor({ id: '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c', number: 4801, issuedAt: '2026-10-05', validUntil: '2027-10-05' })
    const none = new Set<CertificateStatus>()

    expect(uuidRow.code).toBe('HAB-2026-004801')
    expect(uuidRow.id).toBe('3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c')
    expect(filterRows([uuidRow], '004801', none)).toHaveLength(1)
    expect(filterRows([uuidRow], 'HAB-2026-004801', none)).toHaveLength(1)
    expect(filterRows([uuidRow], '9d4a', none)).toHaveLength(0)
  })
})
