import type { CertificateType, DocumentType } from '@/data'

const CERTIFICATE_LABELS: Record<CertificateType, string> = {
  'height-work': 'Trabajo en alturas',
  'confined-spaces': 'Espacios confinados',
  'crane-operation': 'Operación de grúa',
  'occupational-medical': 'Concepto médico ocupacional',
}

const DOCUMENT_PREFIXES: Record<DocumentType, string> = {
  cc: 'C.C.',
  ce: 'C.E.',
  ppt: 'PPT',
  passport: 'Pasaporte',
}

const withThousandDots = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const pad = (value: number): string => String(value).padStart(2, '0')

export const formatLongDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const formatDocument = (type: DocumentType, number: string): string => {
  const prefix = DOCUMENT_PREFIXES[type]
  return type === 'cc' || type === 'ce' ? `${prefix} ${withThousandDots(number)}` : `${prefix} ${number}`
}

export const certificateTypeLabel = (type: CertificateType): string => CERTIFICATE_LABELS[type]

export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
