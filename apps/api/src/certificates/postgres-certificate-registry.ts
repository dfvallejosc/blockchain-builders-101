import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';
import { Certificate } from './certificate.entity.js';
import {
  CertificateAlreadyAnnulledError,
  type CertificateRegistry,
  type RegistryEntry,
  type RegistryStatus,
  type RegistryVerdict,
} from './certificate-registry.js';
import { todayInBogota } from './dates.js';

@Injectable()
export class PostgresCertificateRegistry implements CertificateRegistry {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificates: Repository<Certificate>,
  ) {}

  async register(entry: RegistryEntry): Promise<void> {
    // The certificate row with this fingerprint was already saved by the service in its transaction.
    void entry;
  }

  async getStatus(certificateId: string): Promise<RegistryStatus | null> {
    const certificate = await this.certificates.findOne({
      where: { id: certificateId },
    });

    if (!certificate) {
      return null;
    }

    return {
      certificateId: certificate.id,
      issuerId: certificate.issuerId,
      fingerprint: certificate.fingerprint,
      issuedAt: certificate.issuedAt,
      validUntil: certificate.validUntil,
      annulled: certificate.annulledAt !== null,
    };
  }

  async getVerdict(fingerprint: string): Promise<RegistryVerdict> {
    const certificate = await this.certificates.findOne({
      where: { fingerprint },
      relations: { issuer: true },
    });

    if (!certificate) {
      return 'not-found';
    }
    if (certificate.issuer.revokedAt !== null) {
      return 'issuer-revoked';
    }
    if (certificate.annulledAt !== null) {
      return 'annulled';
    }
    if (certificate.validUntil < todayInBogota()) {
      return 'expired';
    }
    return 'valid';
  }

  async authorizeIssuer(issuerId: string): Promise<void> {
    void issuerId;
  }

  async revokeIssuer(issuerId: string): Promise<void> {
    void issuerId;
  }

  async extendTtl(certificateId: string): Promise<void> {
    void certificateId;
  }

  async annul(certificateId: string): Promise<void> {
    const result = await this.certificates.update(
      { id: certificateId, annulledAt: IsNull() },
      { annulledAt: new Date() },
    );
    if (result.affected !== 1) {
      throw new CertificateAlreadyAnnulledError();
    }
  }
}
