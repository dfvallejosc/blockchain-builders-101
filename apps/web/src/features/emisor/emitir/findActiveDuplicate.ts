import { certificateStatus, type Certificate, type CertificateType } from '@/data'

export const findActiveDuplicate = (
  certificates: Certificate[],
  workerId: string,
  type: CertificateType,
  onDate: string,
): Certificate | null =>
  certificates
    .filter(
      (certificate) =>
        certificate.workerId === workerId &&
        certificate.type === type &&
        certificateStatus(certificate, onDate) === 'valid',
    )
    .reduce<Certificate | null>(
      (latest, certificate) =>
        latest === null || certificate.validUntil > latest.validUntil ? certificate : latest,
      null,
    )
