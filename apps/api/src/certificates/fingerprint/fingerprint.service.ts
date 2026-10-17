import type { CertificateTypeValue } from '../certificate-type.js';
import type { DocumentTypeValue } from '../../workers/document-type.js';

export const FINGERPRINT_SERVICE = Symbol('FINGERPRINT_SERVICE');

export interface FingerprintFields {
  certificateId: string;
  issuerId: string;
  type: CertificateTypeValue;
  issuedAt: string;
  validUntil: string;
  documentType: DocumentTypeValue;
  documentNumber: string;
}

export interface FingerprintService {
  generateSalt(): string;
  compute(fields: FingerprintFields, salt: string): string;
}
