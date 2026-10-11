import { certificateStatus } from '@/data/certificates'
import { selectCertificates, selectEntities, selectWorkers } from '@/data/selectors'
import { readState } from '@/data/storage'
import type { VerificationResult } from '@/data/types'

export const verifyCertificate = async (id: string): Promise<VerificationResult> => {
  const state = readState()
  const certificate = selectCertificates(state).find((candidate) => candidate.id === id)
  if (!certificate) return { status: 'invalid', reason: 'unknown-certificate' }

  const entity = selectEntities(state).find((candidate) => candidate.id === certificate.entityId)
  const worker = selectWorkers(state).find((candidate) => candidate.id === certificate.workerId)
  if (!entity || !worker) return { status: 'invalid', reason: 'unknown-certificate' }
  if (entity.revokedAt !== null) {
    return { status: 'invalid', reason: 'entity-revoked', entity: { name: entity.name } }
  }

  return {
    status: certificateStatus(certificate),
    certificate: {
      id: certificate.id,
      type: certificate.type,
      issuedAt: certificate.issuedAt,
      validUntil: certificate.validUntil,
    },
    worker: {
      fullName: worker.fullName,
      documentType: worker.documentType,
      documentNumber: worker.documentNumber,
    },
    entity: { name: entity.name },
  }
}
