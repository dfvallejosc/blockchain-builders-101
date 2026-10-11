import type { Worker } from '@/data'
import { formatDocument } from '@/features/verificar/format'

export interface WorkerRow {
  id: string
  fullName: string
  document: string
}

export const toWorkerRows = (workers: Worker[]): WorkerRow[] =>
  workers
    .map((worker) => ({
      id: worker.id,
      fullName: worker.fullName,
      document: formatDocument(worker.documentType, worker.documentNumber),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))

const compact = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[\s.-]/g, '')

export const filterWorkerRows = (rows: WorkerRow[], query: string): WorkerRow[] => {
  const needle = compact(query)
  if (needle === '') return rows
  return rows.filter((row) => [row.fullName, row.document].some((field) => compact(field).includes(needle)))
}
