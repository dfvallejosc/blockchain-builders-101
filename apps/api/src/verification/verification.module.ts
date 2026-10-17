import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../certificates/certificate.entity.js';
import { CertificatesModule } from '../certificates/certificates.module.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate]), CertificatesModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
