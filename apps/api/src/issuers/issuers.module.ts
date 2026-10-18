import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CertificatesModule } from '../certificates/certificates.module.js';
import { Issuer } from './issuer.entity.js';
import { IssuersController } from './issuers.controller.js';
import { IssuersService } from './issuers.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Issuer]), AuthModule, CertificatesModule],
  controllers: [IssuersController],
  providers: [IssuersService],
})
export class IssuersModule {}
