import type { Repository } from 'typeorm';
import { Certificate } from '../certificates/certificate.entity.js';
import { CertificateType } from '../certificates/certificate-type.js';
import type { CertificateRegistry, RegistryStatus } from '../certificates/certificate-registry.js';
import { FingerprintService } from '../fingerprint/fingerprint.service.js';
import type { Issuer } from '../issuers/issuer.entity.js';
import type { Worker } from '../workers/worker.entity.js';
import type { VerificationResult } from './verification-result.js';
import { VerificationService } from './verification.service.js';

const CERTIFICATE_ID = 'd1eb3fd0-3e55-467c-b877-1e7c97a00f94';
const ISSUER_ID = '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11';
const WORKER_ID = '5d29407a-f5e4-4af1-8dc2-91a22c0d81f0';
const SALT = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const TODAY = '2026-10-17';
const UNKNOWN: VerificationResult = { status: 'invalid', reason: 'unknown-certificate' };

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

const legitFingerprint = (validUntil: string): string =>
  fingerprints.compute(
    {
      id: CERTIFICATE_ID,
      issuerId: ISSUER_ID,
      type: CertificateType.HeightWork,
      issuedAt: '2026-10-01',
      validUntil,
      workerDocumentType: 'cc',
      workerDocumentNumber: 'AB12345',
      salt: SALT,
    },
  );

const buildCertificate = (overrides: Partial<Certificate> = {}): Certificate =>
  ({
    id: CERTIFICATE_ID,
    number: 42,
    issuerId: ISSUER_ID,
    workerId: WORKER_ID,
    type: CertificateType.HeightWork,
    issuedAt: '2026-10-01',
    validUntil: '2027-10-01',
    annulledAt: null,
    salt: SALT,
    fingerprint: legitFingerprint('2027-10-01'),
    worker: buildWorker(),
    issuer: buildIssuer(),
    ...overrides,
  }) as Certificate;

const buildStatus = (overrides: Partial<RegistryStatus> = {}): RegistryStatus => ({
  certificateId: CERTIFICATE_ID,
  issuerId: ISSUER_ID,
  fingerprint: legitFingerprint('2027-10-01'),
  issuedAt: '2026-10-01',
  validUntil: '2027-10-01',
  annulled: false,
  ...overrides,
});

const setup = (
  options: { status?: RegistryStatus | null; certificate?: Certificate | null } = {},
) => {
  const registry = {
    getStatus: vi.fn().mockResolvedValue('status' in options ? options.status : buildStatus()),
  };
  const repository = {
    findOne: vi.fn().mockResolvedValue('certificate' in options ? options.certificate : buildCertificate()),
  };
  const service = new VerificationService(
    registry as unknown as CertificateRegistry,
    repository as unknown as Repository<Certificate>,
    fingerprints,
  );
  return { service, registry, repository };
};

describe('VerificationService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T15:00:00.000Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers a valid certificate with the certificate, the worker and the entity name', async () => {
    const { service } = setup();

    await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual({
      status: 'valid',
      certificate: {
        id: CERTIFICATE_ID,
        type: 'height-work',
        issuedAt: '2026-10-01',
        validUntil: '2027-10-01',
      },
      worker: { fullName: 'Ana María Pérez Gómez', documentType: 'cc', documentNumber: 'AB12345' },
      entity: { name: 'Salud Ocupacional del Valle' },
    });
  });

  it('exposes nothing beyond what the coordinator needs', async () => {
    const { service } = setup();

    const body = JSON.stringify(await service.verify(CERTIFICATE_ID));

    for (const secret of [SALT, legitFingerprint('2027-10-01'), ISSUER_ID, WORKER_ID, 'contacto-privado', '310 555', '901.482']) {
      expect(body).not.toContain(secret);
    }
  });

  it('still answers valid on the last day of the validity', async () => {
    const validUntil = TODAY;
    const { service } = setup({
      status: buildStatus({ validUntil, fingerprint: legitFingerprint(validUntil) }),
      certificate: buildCertificate({ validUntil, fingerprint: legitFingerprint(validUntil) }),
    });

    await expect(service.verify(CERTIFICATE_ID)).resolves.toMatchObject({ status: 'valid' });
  });

  it('answers expired from today date and does not store it', async () => {
    const validUntil = '2026-10-16';
    const { service } = setup({
      status: buildStatus({ validUntil, fingerprint: legitFingerprint(validUntil) }),
      certificate: buildCertificate({ validUntil, fingerprint: legitFingerprint(validUntil) }),
    });

    await expect(service.verify(CERTIFICATE_ID)).resolves.toMatchObject({
      status: 'expired',
      certificate: { validUntil },
    });
  });

  it('uses the Bogota date, not UTC, to decide expiry', async () => {
    // 2026-10-18T03:00Z is still October 17th, 22:00, in Bogota.
    vi.setSystemTime(new Date('2026-10-18T03:00:00.000Z'));
    const validUntil = TODAY;
    const { service } = setup({
      status: buildStatus({ validUntil, fingerprint: legitFingerprint(validUntil) }),
      certificate: buildCertificate({ validUntil, fingerprint: legitFingerprint(validUntil) }),
    });

    await expect(service.verify(CERTIFICATE_ID)).resolves.toMatchObject({ status: 'valid' });
  });

  it('answers annulled, even when it is also past its validity', async () => {
    const validUntil = '2026-10-16';
    const { service } = setup({
      status: buildStatus({ annulled: true, validUntil, fingerprint: legitFingerprint(validUntil) }),
      certificate: buildCertificate({ validUntil, fingerprint: legitFingerprint(validUntil) }),
    });

    await expect(service.verify(CERTIFICATE_ID)).resolves.toMatchObject({ status: 'annulled' });
  });

  it('answers entity-revoked with only the entity name, over any other state', async () => {
    const { service } = setup({
      status: buildStatus({ annulled: true }),
      certificate: buildCertificate({ issuer: buildIssuer({ revokedAt: new Date('2026-10-10T00:00:00.000Z') }) }),
    });

    await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual({
      status: 'invalid',
      reason: 'entity-revoked',
      entity: { name: 'Salud Ocupacional del Valle' },
    });
  });

  describe('not valid without clues', () => {
    it('answers unknown-certificate for an id the registry does not have', async () => {
      const { service, repository } = setup({ status: null });

      await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual(UNKNOWN);
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it.each(['', 'not-a-uuid', '42', 'HAB-2026-000042', `${CERTIFICATE_ID}x`, "' OR 1=1 --"])(
      'answers unknown-certificate for the malformed id %j without touching the registry',
      async (id) => {
        const { service, registry, repository } = setup();

        await expect(service.verify(id)).resolves.toEqual(UNKNOWN);
        expect(registry.getStatus).not.toHaveBeenCalled();
        expect(repository.findOne).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['the certificate row is missing', { certificate: null }],
      ['the worker is missing', { certificate: buildCertificate({ worker: null as unknown as Worker }) }],
      ['the issuer is missing', { certificate: buildCertificate({ issuer: null as unknown as Issuer }) }],
    ])('answers unknown-certificate when %s', async (_name, options) => {
      const { service } = setup(options);

      await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual(UNKNOWN);
    });

    it.each([
      ['the registry fingerprint differs', { status: buildStatus({ fingerprint: 'f'.repeat(64) }) }],
      ['the registry fingerprint is not a hash', { status: buildStatus({ fingerprint: 'garbage' }) }],
      // The worker document changed after issuing, so the recomputed hash no longer matches.
      [
        'the stored worker document changed',
        { certificate: buildCertificate({ worker: buildWorker({ documentNumber: 'ZZ99999' }) }) },
      ],
      ['the salt changed', { certificate: buildCertificate({ salt: 'f'.repeat(64) }) }],
      // The fingerprint module rejects data it cannot canonicalize; that must not turn into a 500.
      ['the stored salt is not valid', { certificate: buildCertificate({ salt: 'short' }) }],
      [
        'the stored worker document cannot be hashed',
        { certificate: buildCertificate({ worker: buildWorker({ documentNumber: 'AB\n12345' }) }) },
      ],
      // The registry attests other dates than the ones the fingerprint was made from.
      ['the registry validity differs', { status: buildStatus({ validUntil: '2099-01-01' }) }],
      ['the registry issuer differs', { status: buildStatus({ issuerId: '67c52ca1-b02b-4bad-a65a-f799e3aa64c2' }) }],
    ])('answers unknown-certificate when %s', async (_name, options) => {
      const { service } = setup(options);

      await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual(UNKNOWN);
    });

    it('does not reveal the entity name of a certificate whose fingerprint does not match', async () => {
      const { service } = setup({
        status: buildStatus({ fingerprint: 'f'.repeat(64) }),
        certificate: buildCertificate({ issuer: buildIssuer({ revokedAt: new Date() }) }),
      });

      await expect(service.verify(CERTIFICATE_ID)).resolves.toEqual(UNKNOWN);
    });
  });

  it('does not swallow a registry failure', async () => {
    const { service, registry } = setup();
    const failure = new Error('registry down');
    registry.getStatus.mockRejectedValue(failure);

    await expect(service.verify(CERTIFICATE_ID)).rejects.toBe(failure);
  });
});
