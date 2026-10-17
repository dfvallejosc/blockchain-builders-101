import type { Certificate } from './certificate.entity.js';
import type { CertificateTypeValue } from './certificate-type.js';

export interface CertificateResponse {
  number: number;
  id: string;
  entityId: string;
  workerId: string;
  type: CertificateTypeValue;
  issuedAt: string;
  validUntil: string;
  annulledAt: string | null;
}

export const toCertificateResponse = (certificate: Certificate): CertificateResponse => ({
  number: certificate.number,
  id: certificate.id,
  entityId: certificate.issuerId,
  workerId: certificate.workerId,
  type: certificate.type,
  issuedAt: certificate.issuedAt,
  validUntil: certificate.validUntil,
  annulledAt: certificate.annulledAt?.toISOString() ?? null,
});
