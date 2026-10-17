import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CertificateType } from '../certificate-type.js';
import { CertificateIdParamDto } from './certificate-id-param.dto.js';
import { IssueCertificateDto } from './issue-certificate.dto.js';

describe('certificate DTOs', () => {
  it('accepts a valid issue certificate body', async () => {
    const dto = plainToInstance(IssueCertificateDto, {
      workerId: 'b54a7561-6b0f-4cc3-8225-bb5d3b75b6cc',
      type: CertificateType.HeightWork,
      issuedAt: '2026-10-17',
      validUntil: '2027-10-17',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    ['workerId no es UUID', { workerId: 'worker-1' }, 'Escribe un identificador de trabajador válido.'],
    ['type está fuera de CertificateType', { type: 'forklift' }, 'Elige un tipo de certificado válido.'],
    ['la fecha no existe', { issuedAt: '2026-02-30' }, 'Escribe una fecha válida en formato AAAA-MM-DD.'],
    ['la fecha usa barras', { issuedAt: '2026/10/17' }, 'Escribe una fecha válida en formato AAAA-MM-DD.'],
    ['la fecha está vacía', { validUntil: '' }, 'Escribe una fecha válida en formato AAAA-MM-DD.'],
  ])('rejects cuando %s con mensaje en español', async (_caseName, override, message) => {
    const dto = plainToInstance(IssueCertificateDto, {
      workerId: 'b54a7561-6b0f-4cc3-8225-bb5d3b75b6cc',
      type: CertificateType.HeightWork,
      issuedAt: '2026-10-17',
      validUntil: '2027-10-17',
      ...override,
    });

    const errors = await validate(dto);
    expect(errors.flatMap((error) => Object.values(error.constraints ?? {}))).toContain(message);
  });

  it('rejects a non-UUID certificate id', async () => {
    const dto = plainToInstance(CertificateIdParamDto, { id: 'certificate-1' });

    await expect(validate(dto)).resolves.toHaveLength(1);
  });
});
