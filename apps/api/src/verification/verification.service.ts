import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import type { Repository } from 'typeorm';
import { Certificate } from '../certificates/certificate.entity.js';
import { CERTIFICATE_REGISTRY, type CertificateRegistry, type RegistryStatus } from '../certificates/certificate-registry.js';
import { todayInBogota } from '../certificates/dates.js';
import { FingerprintInputError, FingerprintService } from '../fingerprint/fingerprint.service.js';
import type { CertificateStatus, VerificationResult } from './verification-result.js';

// One shared body for an unknown id, a malformed id and a fingerprint that does not match, so the answer gives
// no clue about which case it was. Response time is not equalized: a malformed id returns before any query.
const UNKNOWN_CERTIFICATE: VerificationResult = { status: 'invalid', reason: 'unknown-certificate' };

@Injectable()
export class VerificationService {
  constructor(
    @Inject(CERTIFICATE_REGISTRY) private readonly registry: CertificateRegistry,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    private readonly fingerprint: FingerprintService,
  ) {}

  async verify(id: string): Promise<VerificationResult> {
    if (!isUUID(id)) return UNKNOWN_CERTIFICATE;

    const registered = await this.registry.getStatus(id);
    if (!registered) return UNKNOWN_CERTIFICATE;

    const certificate = await this.certificates.findOne({ where: { id }, relations: { worker: true, issuer: true } });
    if (!certificate?.worker || !certificate.issuer) return UNKNOWN_CERTIFICATE;

    if (!this.fingerprintMatches(certificate, registered)) return UNKNOWN_CERTIFICATE;

    if (certificate.issuer.revokedAt !== null) {
      return { status: 'invalid', reason: 'entity-revoked', entity: { name: certificate.issuer.name } };
    }

    return {
      status: this.statusOf(registered.annulled, registered.validUntil),
      certificate: {
        id: certificate.id,
        type: certificate.type,
        issuedAt: registered.issuedAt,
        validUntil: registered.validUntil,
      },
      worker: {
        fullName: certificate.worker.fullName,
        documentType: certificate.worker.documentType,
        documentNumber: certificate.worker.documentNumber,
      },
      entity: { name: certificate.issuer.name },
    };
  }

  // "Expired" is computed from today's date in Bogota and never stored.
  private statusOf(annulled: boolean, validUntil: string): CertificateStatus {
    if (annulled) return 'annulled';
    return validUntil < todayInBogota() ? 'expired' : 'valid';
  }

  // The hash is rebuilt from what the registry attests (issuer and dates) plus the salt and the worker
  // document kept here, so a change on one side only makes it differ. With the Postgres registry both sides are
  // the same row, so this does not stop someone who rewrites the dates and the fingerprint together: that
  // protection starts once the registry lives on the network.
  private fingerprintMatches(certificate: Certificate, registered: RegistryStatus): boolean {
    try {
      return this.fingerprint.verify(
        {
          id: certificate.id,
          issuerId: registered.issuerId,
          type: certificate.type,
          issuedAt: registered.issuedAt,
          validUntil: registered.validUntil,
          workerDocumentType: certificate.worker.documentType,
          workerDocumentNumber: certificate.worker.documentNumber,
          salt: certificate.salt,
        },
        registered.fingerprint,
      );
    } catch (error) {
      // Data the fingerprint module cannot canonicalize cannot match any fingerprint either.
      if (error instanceof FingerprintInputError) return false;
      throw error;
    }
  }
}
