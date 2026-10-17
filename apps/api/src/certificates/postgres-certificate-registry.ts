import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';
import { Certificate } from './certificate.entity.js';
import type { CertificateRegistry, RegistryEntry, RegistryStatus } from './certificate-registry.js';

@Injectable()
export class PostgresCertificateRegistry implements CertificateRegistry {
  constructor(@InjectRepository(Certificate) private readonly certificates: Repository<Certificate>) {}

  async register(entry: RegistryEntry): Promise<void> {
    // The certificate row with this fingerprint was already saved by the service in its transaction.
    void entry;
  }

  async getStatus(certificateId: string): Promise<RegistryStatus | null> {
    const certificate = await this.certificates.findOne({ where: { id: certificateId } });

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

  async annul(certificateId: string): Promise<void> {
    await this.certificates.update(
      { id: certificateId, annulledAt: IsNull() },
      { annulledAt: new Date() },
    );
  }
}
