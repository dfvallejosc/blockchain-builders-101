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

export interface CertificateRegistry {
  register(entry: RegistryEntry): Promise<void>;
  getStatus(certificateId: string): Promise<RegistryStatus | null>;
  annul(certificateId: string): Promise<void>;
}
