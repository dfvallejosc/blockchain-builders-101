import { certificateStatus, type Certificate, type CertificateStatus, type Worker } from '@/data'
import { formatCertificateId } from '@/data/certificate-id'
import { today } from '@/data/clock'
import { certificateTypeLabel, formatDocument, formatShortDate } from '@/features/verificar/format'

export type NoteTone = 'neutral' | 'warning' | 'danger'

export interface CertificateRow {
  id: string
  code: string
  workerName: string
  workerDocument: string
  typeLabel: string
  issuedAt: string
  validUntil: string
  status: CertificateStatus
  validityNote: string
  noteTone: NoteTone
}

export const MISSING_WORKER_NAME = 'Trabajador no disponible'

export const STATUS_LABEL: Record<CertificateStatus, string> = {
  valid: 'Habilitado',
  expired: 'Vencido',
  annulled: 'Anulado',
}

const EXPIRING_SOON_DAYS = 60
const MS_PER_DAY = 86_400_000

const toUtcMs = (isoDate: string): number => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

const daysBetween = (from: string, to: string): number => Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY)

const days = (count: number): string => `${count} ${count === 1 ? 'día' : 'días'}`

const validityNote = (
  certificate: Certificate,
  status: CertificateStatus,
  onDate: string,
): { text: string; tone: NoteTone } => {
  if (status === 'annulled' && certificate.annulledAt !== null) {
    return { text: `Anulado el ${formatShortDate(certificate.annulledAt)}`, tone: 'danger' }
  }
  if (status === 'expired') {
    return { text: `Venció hace ${days(daysBetween(certificate.validUntil, onDate))}`, tone: 'warning' }
  }
  const remaining = daysBetween(onDate, certificate.validUntil)
  if (remaining === 0) return { text: 'Vence hoy', tone: 'neutral' }
  if (remaining <= EXPIRING_SOON_DAYS) return { text: `Vence en ${days(remaining)}`, tone: 'neutral' }
  return { text: 'Vigente', tone: 'neutral' }
}

export const toRows = (
  certificates: Certificate[],
  workers: Worker[],
  onDate: string = today(),
): CertificateRow[] => {
  const workersById = new Map(workers.map((worker) => [worker.id, worker]))

  return certificates.map((certificate) => {
    const worker = workersById.get(certificate.workerId)
    const status = certificateStatus(certificate, onDate)
    const note = validityNote(certificate, status, onDate)

    return {
      id: certificate.id,
      code: formatCertificateId(certificate.number, certificate.issuedAt),
      workerName: worker?.fullName ?? MISSING_WORKER_NAME,
      workerDocument: worker ? formatDocument(worker.documentType, worker.documentNumber) : '',
      typeLabel: certificateTypeLabel(certificate.type),
      issuedAt: certificate.issuedAt,
      validUntil: certificate.validUntil,
      status,
      validityNote: note.text,
      noteTone: note.tone,
    }
  })
}

const compact = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[\s.-]/g, '')

export const filterRows = (
  rows: CertificateRow[],
  query: string,
  statuses: ReadonlySet<CertificateStatus>,
): CertificateRow[] => {
  const needle = compact(query)

  return rows.filter((row) => {
    const matchesStatus = statuses.size === 0 || statuses.has(row.status)
    const matchesQuery =
      needle === '' || [row.workerName, row.workerDocument, row.code].some((field) => compact(field).includes(needle))
    return matchesStatus && matchesQuery
  })
}
