export type EntityType = 'clinic' | 'training-center'

export type CertificateType =
  | 'height-work'
  | 'confined-spaces'
  | 'crane-operation'
  | 'occupational-medical'

export type DocumentType = 'cc' | 'ce' | 'ppt' | 'passport'

export type CertificateStatus = 'valid' | 'expired' | 'annulled'

export interface Entity {
  id: string
  name: string
  type: EntityType
  city: string
  registeredAt: string
  revokedAt: string | null
  certificateTypes: CertificateType[]
  nit: string
  contactName: string
  email: string
  phone: string
  ministryRegistration: string
  issuedThisMonth: number
}

export interface Worker {
  id: string
  entityId: string
  fullName: string
  documentType: DocumentType
  documentNumber: string
  registeredAt: string
  consentedAt: string
}

export interface Certificate {
  number: number
  id: string
  entityId: string
  workerId: string
  type: CertificateType
  issuedAt: string
  validUntil: string
  annulledAt: string | null
}

export interface IssuerSession {
  role: 'issuer'
  entityId: string
  entityName: string
  email: string
}

export interface AdminSession {
  role: 'admin'
  name: string
  email: string
}

export type Session = IssuerSession | AdminSession
export type Role = Session['role']

export interface NewEntityInput {
  name: string
  type: EntityType
  city: string
  certificateTypes: CertificateType[]
  nit: string
  ministryRegistration: string
  contactName: string
  email: string
  phone: string
}

export interface NewWorkerInput {
  fullName: string
  documentType: DocumentType
  documentNumber: string
  dataConsent: boolean
}

export interface IssueCertificateInput {
  workerId: string
  type: CertificateType
  issuedAt: string
  validUntil: string
}

export type VerificationResult =
  | {
      status: CertificateStatus
      certificate: { id: string; type: CertificateType; issuedAt: string; validUntil: string }
      worker: { fullName: string; documentType: DocumentType; documentNumber: string }
      entity: { name: string }
    }
  | { status: 'invalid'; reason: 'unknown-certificate' }
  | { status: 'invalid'; reason: 'entity-revoked'; entity: { name: string } }
