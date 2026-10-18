import type { RegistryVerdict } from '../certificates/certificate-registry.js';

export const STELLAR_CLIENT = Symbol('STELLAR_CLIENT');

export interface StellarClient {
  ensureIssuerAccount(issuerId: string): Promise<void>;
  authorizeIssuer(issuerId: string): Promise<string>;
  revokeIssuer(issuerId: string): Promise<string>;
  registerCertificate(input: {
    issuerId: string;
    fingerprint: string;
    validUntil: number;
  }): Promise<string>;
  annulCertificate(input: {
    issuerId: string;
    fingerprint: string;
  }): Promise<string>;
  getVerdict(fingerprint: string): Promise<RegistryVerdict>;
  extendTtl(fingerprint: string): Promise<string>;
}
