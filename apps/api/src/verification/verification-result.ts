import type { CertificateTypeValue } from '../certificates/certificate-type.js';
import type { DocumentTypeValue } from '../workers/document-type.js';

export type CertificateStatus = 'valid' | 'expired' | 'annulled';

// Same shape as the front `VerificationResult`, so TA-27 only swaps the data source.
// It is a closed list on purpose: nothing medical, no salt, no fingerprint and no internal ids.
export type VerificationResult =
  | {
      status: CertificateStatus;
      certificate: { id: string; type: CertificateTypeValue; issuedAt: string; validUntil: string };
      worker: { fullName: string; documentType: DocumentTypeValue; documentNumber: string };
      entity: { name: string };
    }
  | { status: 'invalid'; reason: 'unknown-certificate' }
  | { status: 'invalid'; reason: 'entity-revoked'; entity: { name: string } };
