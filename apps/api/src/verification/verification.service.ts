import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import type { Repository } from 'typeorm';
import { Certificate } from '../certificates/certificate.entity.js';
import {
  CERTIFICATE_REGISTRY,
  type CertificateRegistry,
  type RegistryVerdict,
} from '../certificates/certificate-registry.js';
import {
  FingerprintInputError,
  FingerprintService,
} from '../fingerprint/fingerprint.service.js';
import type { VerificationResult } from './verification-result.js';

// One shared body for an unknown id, a malformed id and a fingerprint that does not match, so the answer gives
// no clue about which case it was. Response time is not equalized: a malformed id returns before any query.
const UNKNOWN_CERTIFICATE: VerificationResult = {
  status: 'invalid',
  reason: 'unknown-certificate',
};

@Injectable()
export class VerificationService {
  constructor(
    @Inject(CERTIFICATE_REGISTRY)
    private readonly registry: CertificateRegistry,
    @InjectRepository(Certificate)
    private readonly certificates: Repository<Certificate>,
    private readonly fingerprint: FingerprintService,
  ) {}

  async verify(id: string): Promise<VerificationResult> {
    if (!isUUID(id)) return UNKNOWN_CERTIFICATE;

    const certificate = await this.certificates.findOne({
      where: { id },
      relations: { worker: true, issuer: true },
    });
    if (!certificate?.worker || !certificate.issuer) return UNKNOWN_CERTIFICATE;

    const fingerprint = this.recomputeFingerprint(certificate);
    if (!fingerprint) return UNKNOWN_CERTIFICATE;

    return this.resultForVerdict(
      certificate,
      await this.registry.getVerdict(fingerprint),
    );
  }

  private resultForVerdict(
    certificate: Certificate,
    verdict: RegistryVerdict,
  ): VerificationResult {
    if (verdict === 'not-found') return UNKNOWN_CERTIFICATE;
    if (verdict === 'issuer-revoked') {
      return {
        status: 'invalid',
        reason: 'entity-revoked',
        entity: { name: certificate.issuer.name },
      };
    }

    return {
      status: verdict,
      certificate: {
        id: certificate.id,
        type: certificate.type,
        issuedAt: certificate.issuedAt,
        validUntil: certificate.validUntil,
      },
      worker: {
        fullName: certificate.worker.fullName,
        documentType: certificate.worker.documentType,
        documentNumber: certificate.worker.documentNumber,
      },
      entity: { name: certificate.issuer.name },
    };
  }

  // The registry verdict is requested for the current database row, including its salt and worker document.
  private recomputeFingerprint(certificate: Certificate): string | null {
    try {
      return this.fingerprint.compute({
        id: certificate.id,
        issuerId: certificate.issuerId,
        type: certificate.type,
        issuedAt: certificate.issuedAt,
        validUntil: certificate.validUntil,
        workerDocumentType: certificate.worker.documentType,
        workerDocumentNumber: certificate.worker.documentNumber,
        salt: certificate.salt,
      });
    } catch (error) {
      if (error instanceof FingerprintInputError) return null;
      throw error;
    }
  }
}
