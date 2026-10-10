import { formatCertificateId } from '@/data/certificate-id'
import { today } from '@/data/clock'
import { DataError } from '@/data/errors'
import { selectCertificates, selectEntities, selectWorkers } from '@/data/selectors'
import { readState, writeState } from '@/data/storage'
import type { Certificate, CertificateStatus, IssueCertificateInput } from '@/data/types'

export const certificateStatus = (certificate: Certificate, onDate: string = today()): CertificateStatus => {
  if (certificate.annulledAt !== null) return 'annulled'
  if (certificate.validUntil < onDate) return 'expired'
  return 'valid'
}

export const listCertificates = async (entityId: string): Promise<Certificate[]> =>
  selectCertificates(readState())
    .filter((certificate) => certificate.entityId === entityId)
    .sort((a, b) => b.number - a.number)

export const getCertificate = async (id: string): Promise<Certificate | null> =>
  selectCertificates(readState()).find((certificate) => certificate.id === id) ?? null

export const issueCertificate = async (
  entityId: string,
  input: IssueCertificateInput,
): Promise<Certificate> => {
  const state = readState()
  const entity = selectEntities(state).find((candidate) => candidate.id === entityId)
  if (!entity) throw new DataError('not-found')
  if (entity.revokedAt !== null) throw new DataError('entity-revoked')
  if (!entity.certificateTypes.includes(input.type)) throw new DataError('type-not-allowed')

  const worker = selectWorkers(state).find((candidate) => candidate.id === input.workerId)
  if (!worker || worker.entityId !== entityId) throw new DataError('not-found')
  if (input.validUntil <= input.issuedAt) throw new DataError('invalid-dates')

  const number = Math.max(...selectCertificates(state).map((certificate) => certificate.number)) + 1
  const certificate: Certificate = {
    number,
    id: formatCertificateId(number, input.issuedAt),
    entityId,
    workerId: worker.id,
    type: input.type,
    issuedAt: input.issuedAt,
    validUntil: input.validUntil,
    annulledAt: null,
  }
  writeState({ ...state, addedCertificates: [certificate, ...state.addedCertificates] })
  return certificate
}
