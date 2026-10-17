import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './certificate.entity.js';
import { CERTIFICATE_REGISTRY } from './certificate-registry.js';
import { CertificatesController } from './certificates.controller.js';
import { CertificatesService } from './certificates.service.js';
import { PostgresCertificateRegistry } from './postgres-certificate-registry.js';
import { FingerprintModule } from '../fingerprint/fingerprint.module.js';
import { Worker } from '../workers/worker.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, Worker]), FingerprintModule],
  controllers: [CertificatesController],
  providers: [
    CertificatesService,
    { provide: CERTIFICATE_REGISTRY, useClass: PostgresCertificateRegistry },
  ],
  // The public verification reads the same registry that issuing writes to.
  exports: [CERTIFICATE_REGISTRY],
})
export class CertificatesModule {}
