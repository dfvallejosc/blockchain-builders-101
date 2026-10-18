import { Module } from '@nestjs/common';
import { ConfigService, type ConfigType } from '@nestjs/config';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Certificate } from './certificate.entity.js';
import {
  CERTIFICATE_REGISTRY,
  type CertificateRegistry,
} from './certificate-registry.js';
import { CertificatesController } from './certificates.controller.js';
import { CertificatesService } from './certificates.service.js';
import { PostgresCertificateRegistry } from './postgres-certificate-registry.js';
import { FingerprintModule } from '../fingerprint/fingerprint.module.js';
import { stellarConfig } from '../config/stellar.config.js';
import { StellarCertificateRegistry } from '../stellar/stellar-certificate-registry.js';
import { StellarModule } from '../stellar/stellar.module.js';
import {
  STELLAR_CLIENT,
  type StellarClient,
} from '../stellar/stellar-client.js';
import { Worker } from '../workers/worker.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Worker]),
    FingerprintModule,
    StellarModule,
  ],
  controllers: [CertificatesController],
  providers: [
    CertificatesService,
    PostgresCertificateRegistry,
    {
      provide: CERTIFICATE_REGISTRY,
      inject: [
        ConfigService,
        PostgresCertificateRegistry,
        STELLAR_CLIENT,
        getRepositoryToken(Certificate),
      ],
      useFactory: (
        config: ConfigService,
        postgres: PostgresCertificateRegistry,
        client: StellarClient | undefined,
        certificates: Repository<Certificate>,
      ): CertificateRegistry => {
        const stellar =
          config.getOrThrow<ConfigType<typeof stellarConfig>>('stellar');
        if (stellar.driver === 'postgres') return postgres;
        if (!client) throw new Error('Stellar client is unavailable.');
        return new StellarCertificateRegistry(postgres, client, certificates);
      },
    },
  ],
  // The public verification reads the same registry that issuing writes to.
  exports: [CERTIFICATE_REGISTRY],
})
export class CertificatesModule {}
