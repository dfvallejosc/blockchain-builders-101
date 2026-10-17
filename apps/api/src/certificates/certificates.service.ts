import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common';
import { DataSource, IsNull, MoreThanOrEqual, type Repository } from 'typeorm';
import type { Issuer } from '../issuers/issuer.entity.js';
import { Worker } from '../workers/worker.entity.js';
import { Certificate } from './certificate.entity.js';
import type { CertificateRegistry } from './certificate-registry.js';
import { CERTIFICATE_REGISTRY } from './certificate-registry.js';
import {
  toCertificateResponse,
  type CertificateResponse,
} from './certificate-response.js';
import { datesAreOrdered, todayInBogota } from './dates.js';
import type { IssueCertificateDto } from './dto/issue-certificate.dto.js';
import type { FingerprintService } from './fingerprint/fingerprint.service.js';
import { FINGERPRINT_SERVICE } from './fingerprint/fingerprint.service.js';

const INVALID_DATE_ORDER_MESSAGE =
  'La fecha de vencimiento debe ser posterior a la fecha de emisión.';
const FUTURE_ISSUE_DATE_MESSAGE =
  'La fecha de emisión no puede ser posterior al día de hoy.';
const WORKER_NOT_FOUND_MESSAGE = 'No se encontró el trabajador indicado.';
const CERTIFICATE_TYPE_FORBIDDEN_MESSAGE =
  'Tu entidad no puede emitir este tipo de certificado.';
const DUPLICATE_CERTIFICATE_MESSAGE =
  'Ya existe un certificado vigente para este trabajador y tipo.';
const CERTIFICATE_NOT_FOUND_MESSAGE = 'No se encontró el certificado indicado.';
const CERTIFICATE_ALREADY_ANNULLED_MESSAGE = 'El certificado ya fue anulado.';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Certificate)
    private readonly certificates: Repository<Certificate>,
    @Inject(CERTIFICATE_REGISTRY)
    private readonly registry: CertificateRegistry,
    @Inject(FINGERPRINT_SERVICE)
    private readonly fingerprint: FingerprintService,
  ) {}

  async issue(
    issuer: Issuer,
    input: IssueCertificateDto,
  ): Promise<CertificateResponse> {
    const today = todayInBogota();

    if (!datesAreOrdered(input.issuedAt, input.validUntil)) {
      throw new BadRequestException(INVALID_DATE_ORDER_MESSAGE);
    }
    if (input.issuedAt > today) {
      throw new BadRequestException(FUTURE_ISSUE_DATE_MESSAGE);
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `${input.workerId}:${input.type}`,
      ]);

      const worker = await manager.findOne(Worker, {
        where: { id: input.workerId, issuerId: issuer.id },
      });
      if (!worker || worker.issuerId !== issuer.id) {
        throw new NotFoundException(WORKER_NOT_FOUND_MESSAGE);
      }

      if (!issuer.certificateTypes.includes(input.type)) {
        throw new ForbiddenException(CERTIFICATE_TYPE_FORBIDDEN_MESSAGE);
      }

      const existingCertificate = await manager.findOne(Certificate, {
        where: {
          issuerId: issuer.id,
          workerId: worker.id,
          type: input.type,
          annulledAt: IsNull(),
          validUntil: MoreThanOrEqual(today),
        },
      });
      if (existingCertificate) {
        throw new ConflictException(DUPLICATE_CERTIFICATE_MESSAGE);
      }

      const id = randomUUID();
      const salt = this.fingerprint.generateSalt();
      const fingerprint = this.fingerprint.compute(
        {
          certificateId: id,
          issuerId: issuer.id,
          type: input.type,
          issuedAt: input.issuedAt,
          validUntil: input.validUntil,
          documentType: worker.documentType,
          documentNumber: worker.documentNumber,
        },
        salt,
      );
      const certificate = await manager.save(
        Certificate,
        Object.assign(new Certificate(), {
          id,
          issuerId: issuer.id,
          workerId: worker.id,
          type: input.type,
          issuedAt: input.issuedAt,
          validUntil: input.validUntil,
          annulledAt: null,
          salt,
          fingerprint,
        }),
      );

      await this.registry.register({
        certificateId: certificate.id,
        issuerId: certificate.issuerId,
        fingerprint: certificate.fingerprint,
        issuedAt: certificate.issuedAt,
        validUntil: certificate.validUntil,
      });

      return toCertificateResponse(certificate);
    });
  }

  async list(issuer: Issuer): Promise<CertificateResponse[]> {
    const certificates = await this.certificates.find({
      where: { issuerId: issuer.id },
      order: { number: 'DESC' },
    });

    return certificates.map(toCertificateResponse);
  }

  async annul(issuer: Issuer, id: string): Promise<CertificateResponse> {
    const certificate = await this.certificates.findOne({
      where: { id, issuerId: issuer.id },
    });
    if (!certificate || certificate.issuerId !== issuer.id) {
      throw new NotFoundException(CERTIFICATE_NOT_FOUND_MESSAGE);
    }
    if (certificate.annulledAt) {
      throw new ConflictException(CERTIFICATE_ALREADY_ANNULLED_MESSAGE);
    }

    await this.registry.annul(id);
    const annulledCertificate = await this.certificates.findOne({
      where: { id, issuerId: issuer.id },
    });
    if (!annulledCertificate) {
      throw new NotFoundException(CERTIFICATE_NOT_FOUND_MESSAGE);
    }

    return toCertificateResponse(annulledCertificate);
  }
}
