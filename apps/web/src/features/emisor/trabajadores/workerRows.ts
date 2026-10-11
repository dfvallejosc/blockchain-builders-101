import type { Worker } from '@/data'
import { formatDocument } from '@/features/verificar/format'

export interface WorkerRow {
  id: string
  fullName: string
  document: string
  documentNumber: string
}

export const toWorkerRows = (workers: Worker[]): WorkerRow[] =>
  workers
    .map((worker) => ({
      id: worker.id,
      fullName: worker.fullName,
      document: formatDocument(worker.documentType, worker.documentNumber),
      documentNumber: worker.documentNumber,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))

const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const filterWorkerRows = (rows: WorkerRow[], query: string): WorkerRow[] => {
  const nameNeedle = fold(query).trim().replace(/\s+/g, ' ')
  if (nameNeedle === '') return rows
  const numberNeedle = nameNeedle.replace(/[\s.-]/g, '')

  return rows.filter(
    (row) =>
      fold(row.fullName).includes(nameNeedle) ||
      (numberNeedle !== '' && fold(row.documentNumber).includes(numberNeedle)),
  )
}
