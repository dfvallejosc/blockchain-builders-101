import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentIssuer, Roles } from '../auth/decorators.js';
import type { Issuer } from '../issuers/issuer.entity.js';
import { CertificateIdParamDto } from './dto/certificate-id-param.dto.js';
import { IssueCertificateDto } from './dto/issue-certificate.dto.js';
import type { CertificateResponse } from './certificate-response.js';
import { CertificatesService } from './certificates.service.js';

@Controller('certificates')
@Roles('issuer')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  @HttpCode(201)
  create(
    @CurrentIssuer() issuer: Issuer,
    @Body() body: IssueCertificateDto,
  ): Promise<CertificateResponse> {
    return this.certificatesService.issue(issuer, body);
  }

  @Get()
  list(@CurrentIssuer() issuer: Issuer): Promise<CertificateResponse[]> {
    return this.certificatesService.list(issuer);
  }

  @Post(':id/annul')
  @HttpCode(200)
  annul(
    @CurrentIssuer() issuer: Issuer,
    @Param() params: CertificateIdParamDto,
  ): Promise<CertificateResponse> {
    return this.certificatesService.annul(issuer, params.id);
  }
}
