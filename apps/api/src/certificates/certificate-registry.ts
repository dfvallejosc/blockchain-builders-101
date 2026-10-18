export const CERTIFICATE_REGISTRY = Symbol('CERTIFICATE_REGISTRY');

export interface RegistryEntry {
  certificateId: string;
  issuerId: string;
  fingerprint: string;
  issuedAt: string;
  validUntil: string;
}

export interface RegistryStatus extends RegistryEntry {
  annulled: boolean;
}

export type RegistryVerdict =
  'valid' | 'expired' | 'annulled' | 'issuer-revoked' | 'not-found';

// Thrown by `annul` when the certificate was already annulled, so concurrent annulments
// resolve to exactly one winner whatever the implementation.
export class CertificateAlreadyAnnulledError extends Error {
  constructor() {
    super('The certificate is already annulled');
    this.name = 'CertificateAlreadyAnnulledError';
  }
}

export interface CertificateRegistry {
  register(entry: RegistryEntry): Promise<void>;
  getStatus(certificateId: string): Promise<RegistryStatus | null>;
  getVerdict(fingerprint: string): Promise<RegistryVerdict>;
  authorizeIssuer(issuerId: string): Promise<void>;
  revokeIssuer(issuerId: string): Promise<void>;
  extendTtl(certificateId: string): Promise<void>;
  annul(certificateId: string): Promise<void>;
}
