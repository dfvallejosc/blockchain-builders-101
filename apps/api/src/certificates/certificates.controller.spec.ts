import { describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../auth/decorators.js';
import { Issuer } from '../issuers/issuer.entity.js';
import { CertificateType } from './certificate-type.js';
import type { CertificateIdParamDto } from './dto/certificate-id-param.dto.js';
import type { IssueCertificateDto } from './dto/issue-certificate.dto.js';
import type { CertificateResponse } from './certificate-response.js';
import { CertificatesController } from './certificates.controller.js';
import { CertificatesService } from './certificates.service.js';

const issuer = { id: 'issuer-1' } as Issuer;
const response: CertificateResponse = {
  number: 1,
  id: 'certificate-1',
  entityId: issuer.id,
  workerId: 'worker-1',
  type: CertificateType.HeightWork,
  issuedAt: '2026-10-17',
  validUntil: '2027-10-17',
  annulledAt: null,
};

describe('CertificatesController', () => {
  it('passes the issuer and body to the service and returns its response', async () => {
    const input: IssueCertificateDto = {
      workerId: 'worker-1',
      type: CertificateType.HeightWork,
      issuedAt: '2026-10-17',
      validUntil: '2027-10-17',
    };
    const issue = vi.fn<CertificatesService['issue']>().mockResolvedValue(response);
    const controller = new CertificatesController({ issue } as unknown as CertificatesService);

    await expect(controller.create(issuer, input)).resolves.toBe(response);
    expect(issue).toHaveBeenCalledWith(issuer, input);
  });

  it('passes the issuer to the service and returns its response list', async () => {
    const list = vi.fn<CertificatesService['list']>().mockResolvedValue([response]);
    const controller = new CertificatesController({ list } as unknown as CertificatesService);

    await expect(controller.list(issuer)).resolves.toEqual([response]);
    expect(list).toHaveBeenCalledWith(issuer);
  });

  it('passes the issuer and certificate id to the service and returns its response', async () => {
    const params: CertificateIdParamDto = { id: response.id };
    const annul = vi.fn<CertificatesService['annul']>().mockResolvedValue(response);
    const controller = new CertificatesController({ annul } as unknown as CertificatesService);

    await expect(controller.annul(issuer, params)).resolves.toBe(response);
    expect(annul).toHaveBeenCalledWith(issuer, params.id);
  });

  it('requires the issuer role at the controller level', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CertificatesController)).toEqual(['issuer']);
  });
});
