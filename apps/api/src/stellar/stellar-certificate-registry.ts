import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Certificate } from '../certificates/certificate.entity.js';
import {
  type CertificateRegistry,
  type RegistryEntry,
  type RegistryStatus,
  type RegistryVerdict,
} from '../certificates/certificate-registry.js';
import { ContractError, toHttpException } from './contract-errors.js';
import { endOfDayInBogotaAsUnix } from './validity.js';
import type { StellarClient } from './stellar-client.js';

const CERTIFICATE_NOT_FOUND_MESSAGE = 'No se encontró el certificado indicado.';

export class StellarCertificateRegistry implements CertificateRegistry {
  constructor(
    private readonly postgres: CertificateRegistry,
    private readonly client: StellarClient,
    private readonly certificates: Repository<Certificate>,
  ) {}

  async register(entry: RegistryEntry): Promise<void> {
    try {
      await this.client.registerCertificate({
        issuerId: entry.issuerId,
        fingerprint: entry.fingerprint,
        validUntil: endOfDayInBogotaAsUnix(entry.validUntil),
      });
    } catch (error) {
      throw toHttpException(error);
    }

    await this.postgres.register(entry);
  }

  async annul(certificateId: string): Promise<void> {
    const certificate = await this.certificates.findOne({
      where: { id: certificateId },
    });
    if (!certificate) {
      throw new NotFoundException(CERTIFICATE_NOT_FOUND_MESSAGE);
    }

    try {
      await this.client.annulCertificate({
        issuerId: certificate.issuerId,
        fingerprint: certificate.fingerprint,
      });
    } catch (error) {
      if (!(error instanceof ContractError && error.code === 4)) {
        throw toHttpException(error);
      }
    }

    await this.postgres.annul(certificateId);
  }

  async authorizeIssuer(issuerId: string): Promise<void> {
    try {
      await this.client.ensureIssuerAccount(issuerId);
      await this.client.authorizeIssuer(issuerId);
    } catch (error) {
      throw toHttpException(error);
    }
  }

  async revokeIssuer(issuerId: string): Promise<void> {
    try {
      await this.client.revokeIssuer(issuerId);
    } catch (error) {
      // An issuer the contract never saw has nothing to revoke on the network, so the local revocation goes on.
      if (error instanceof ContractError && error.code === 7) return;
      throw toHttpException(error);
    }
  }

  getVerdict(fingerprint: string): Promise<RegistryVerdict> {
    return this.client.getVerdict(fingerprint).catch((error: unknown) => {
      throw toHttpException(error);
    });
  }

  getStatus(certificateId: string): Promise<RegistryStatus | null> {
    return this.postgres.getStatus(certificateId);
  }

  async extendTtl(certificateId: string): Promise<void> {
    const certificate = await this.certificates.findOne({
      where: { id: certificateId },
    });
    if (!certificate) {
      throw new NotFoundException(CERTIFICATE_NOT_FOUND_MESSAGE);
    }

    try {
      await this.client.extendTtl(certificate.fingerprint);
    } catch (error) {
      throw toHttpException(error);
    }
  }
}
