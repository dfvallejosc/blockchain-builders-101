import type { Repository } from 'typeorm';
import { Certificate } from '../certificates/certificate.entity.js';
import { CertificateType } from '../certificates/certificate-type.js';
import type {
  CertificateRegistry,
  RegistryVerdict,
} from '../certificates/certificate-registry.js';
import { FingerprintService } from '../fingerprint/fingerprint.service.js';
import type { Issuer } from '../issuers/issuer.entity.js';
import type { Worker } from '../workers/worker.entity.js';
import type { VerificationResult } from './verification-result.js';
import { VerificationService } from './verification.service.js';

const CERTIFICATE_ID = 'd1eb3fd0-3e55-467c-b877-1e7c97a00f94';
const ISSUER_ID = '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11';
const WORKER_ID = '5d29407a-f5e4-4af1-8dc2-91a22c0d81f0';
const SALT = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const UNKNOWN: VerificationResult = {
  status: 'invalid',
  reason: 'unknown-certificate',
};

const fingerprints = new FingerprintService();

const buildWorker = (overrides: Partial<Worker> = {}): Worker =>
  ({
    id: WORKER_ID,
    issuerId: ISSUER_ID,
    fullName: 'Ana María Pérez Gómez',
    documentType: 'cc',
    documentNumber: 'AB12345',
    ...overrides,
  }) as Worker;

const buildIssuer = (overrides: Partial<Issuer> = {}): Issuer =>
  ({
    id: ISSUER_ID,
    name: 'Salud Ocupacional del Valle',
    email: 'contacto-privado@example.com',
    phone: '310 555 0142',
    nit: '901.482.317-5',
    revokedAt: null,
    ...overrides,
  }) as Issuer;

const fingerprintFor = (certificate: Certificate): string =>
  fingerprints.compute({
    id: certificate.id,
    issuerId: certificate.issuerId,
    type: certificate.type,
    issuedAt: certificate.issuedAt,
    validUntil: certificate.validUntil,
    workerDocumentType: certificate.worker.documentType,
    workerDocumentNumber: certificate.worker.documentNumber,
    salt: certificate.salt,
  });

const buildCertificate = (
  overrides: Partial<Certificate> = {},
): Certificate => {
  const certificate = {
    id: CERTIFICATE_ID,
    number: 42,
    issuerId: ISSUER_ID,
    workerId: WORKER_ID,
    type: CertificateType.HeightWork,
    issuedAt: '2026-10-01',
    validUntil: '2027-10-01',
    annulledAt: null,
    salt: SALT,
    fingerprint: '',
    worker: buildWorker(),
    issuer: buildIssuer(),
    ...overrides,
  } as Certificate;
  if (certificate.worker) certificate.fingerprint = fingerprintFor(certificate);
  return certificate;
};

const setup = (
  options: { verdict?: RegistryVerdict; certificate?: Certificate | null } = {},
) => {
  const registry = {
    getVerdict: vi.fn().mockResolvedValue(options.verdict ?? 'valid'),
  };
  const repository = {
    findOne: vi
      .fn()
      .mockResolvedValue(
        'certificate' in options ? options.certificate : buildCertificate(),
      ),
  };
  const service = new VerificationService(
    registry as unknown as CertificateRegistry,
    repository as unknown as Repository<Certificate>,
    fingerprints,
  );
  return { service, registry, repository };
};

describe('VerificationService', () => {
  it.each([
    ['valid', { status: 'valid' }],
    ['expired', { status: 'expired' }],
    ['annulled', { status: 'annulled' }],
  ] as const)(
    'maps the registry %s verdict to the public result',
    async (verdict, expected) => {
      const { service } = setup({ verdict });

      await expect(service.verify(CERTIFICATE_ID)).resolves.toMatchObject(
        expected,
      );
    },
  );

  it('maps issuer-revoked to entity-revoked even when the local issuer is not revoked', async () => {
    const { service } = setup({ verdict: 'issuer-revoked' });

    await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual({
      status: 'invalid',
      reason: 'entity-revoked',
      entity: { name: 'Salud Ocupacional del Valle' },
    });
  });

  it('maps a not-found verdict to unknown-certificate', async () => {
    const { service } = setup({ verdict: 'not-found' });

    await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual(UNKNOWN);
  });

  it('recomputes the fingerprint from the current certificate row', async () => {
    const certificate = buildCertificate({ validUntil: '2099-01-01' });
    const { service, registry } = setup({ certificate });

    await service.verify(CERTIFICATE_ID);

    expect(registry.getVerdict).toHaveBeenCalledWith(
      fingerprintFor(certificate),
    );
  });

  it('answers the certificate, worker and entity for a valid verdict', async () => {
    const { service } = setup();

    await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual({
      status: 'valid',
      certificate: {
        id: CERTIFICATE_ID,
        type: 'height-work',
        issuedAt: '2026-10-01',
        validUntil: '2027-10-01',
      },
      worker: {
        fullName: 'Ana María Pérez Gómez',
        documentType: 'cc',
        documentNumber: 'AB12345',
      },
      entity: { name: 'Salud Ocupacional del Valle' },
    });
  });

  it('exposes nothing beyond what the coordinator needs', async () => {
    const certificate = buildCertificate();
    const { service } = setup({ certificate });

    const body = JSON.stringify(await service.verify(CERTIFICATE_ID));

    for (const secret of [
      SALT,
      certificate.fingerprint,
      ISSUER_ID,
      WORKER_ID,
      'contacto-privado',
      '310 555',
      '901.482.317',
    ]) {
      expect(body).not.toContain(secret);
    }
  });

  it.each([
    '',
    'not-a-uuid',
    '42',
    'HAB-2026-000042',
    `${CERTIFICATE_ID}x`,
    "' OR 1=1 --",
  ])(
    'answers unknown-certificate for malformed id %j without touching dependencies',
    async (id) => {
      const { service, registry, repository } = setup();

      await expect(service.verify(id)).resolves.toEqual(UNKNOWN);
      expect(registry.getVerdict).not.toHaveBeenCalled();
      expect(repository.findOne).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['the certificate row is missing', { certificate: null }],
    [
      'the worker is missing',
      { certificate: buildCertificate({ worker: null as unknown as Worker }) },
    ],
    [
      'the issuer is missing',
      { certificate: buildCertificate({ issuer: null as unknown as Issuer }) },
    ],
  ])('answers unknown-certificate when %s', async (_name, options) => {
    const { service, registry } = setup(options);

    await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual(UNKNOWN);
    expect(registry.getVerdict).not.toHaveBeenCalled();
  });

  it('does not swallow a registry failure', async () => {
    const { service, registry } = setup();
    const failure = new Error('registry down');
    registry.getVerdict.mockRejectedValue(failure);

    await expect(service.verify(CERTIFICATE_ID)).rejects.toBe(failure);
  });
});
