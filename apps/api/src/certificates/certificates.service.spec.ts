import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { IsNull, MoreThanOrEqual } from 'typeorm';
import { Issuer } from '../issuers/issuer.entity.js';
import { Worker } from '../workers/worker.entity.js';
import { Certificate } from './certificate.entity.js';
import { CertificateType } from './certificate-type.js';
import type { IssueCertificateDto } from './dto/issue-certificate.dto.js';
import type { FingerprintService } from './fingerprint/fingerprint.service.js';
import type { CertificateRegistry } from './certificate-registry.js';
import { toCertificateResponse } from './certificate-response.js';
import { CertificatesService } from './certificates.service.js';

const ISSUER_ID = '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11';
const OTHER_ISSUER_ID = '67c52ca1-b02b-4bad-a65a-f799e3aa64c2';
const WORKER_ID = '5d29407a-f5e4-4af1-8dc2-91a22c0d81f0';
const CERTIFICATE_ID = 'd1eb3fd0-3e55-467c-b877-1e7c97a00f94';
const TODAY = '2026-10-17';

const buildIssuer = (overrides: Partial<Issuer> = {}): Issuer =>
  ({
    id: ISSUER_ID,
    certificateTypes: [CertificateType.HeightWork],
    ...overrides,
  }) as Issuer;

const buildWorker = (overrides: Partial<Worker> = {}): Worker =>
  ({
    id: WORKER_ID,
    issuerId: ISSUER_ID,
    documentType: 'cc',
    documentNumber: 'AB12345',
    fullName: 'Ana María Pérez',
    ...overrides,
  }) as Worker;

const buildCertificate = (overrides: Partial<Certificate> = {}): Certificate =>
  ({
    id: CERTIFICATE_ID,
    number: 42,
    issuerId: ISSUER_ID,
    workerId: WORKER_ID,
    type: CertificateType.HeightWork,
    issuedAt: TODAY,
    validUntil: '2027-10-17',
    annulledAt: null,
    salt: 'private-salt',
    fingerprint: 'private-fingerprint',
    ...overrides,
  }) as Certificate;

const input: IssueCertificateDto = {
  workerId: WORKER_ID,
  type: CertificateType.HeightWork,
  issuedAt: TODAY,
  validUntil: '2027-10-17',
};

const buildInput = (
  overrides: Partial<IssueCertificateDto> = {},
): IssueCertificateDto => ({
  workerId: overrides.workerId ?? input.workerId,
  type: overrides.type ?? input.type,
  issuedAt: overrides.issuedAt ?? input.issuedAt,
  validUntil: overrides.validUntil ?? input.validUntil,
});

const buildHarness = () => {
  const manager = {
    query: vi.fn().mockResolvedValue(undefined),
    findOne: vi.fn(),
    save: vi.fn(),
  };
  const dataSource = {
    transaction: vi.fn(
      async (work: (transactionManager: EntityManager) => Promise<unknown>) =>
        work(manager as never),
    ),
  };
  const certificates = {
    find: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  };
  const register = vi.fn().mockResolvedValue(undefined);
  const annul = vi.fn().mockResolvedValue(undefined);
  const registry: CertificateRegistry = {
    register,
    getStatus: vi.fn(),
    annul,
  };
  const compute = vi.fn().mockReturnValue('private-fingerprint');
  const fingerprint: FingerprintService = {
    generateSalt: vi.fn().mockReturnValue('private-salt'),
    compute,
  };
  const service = new CertificatesService(
    dataSource as unknown as DataSource,
    certificates as unknown as Repository<Certificate>,
    registry,
    fingerprint,
  );

  return {
    service,
    manager,
    dataSource,
    certificates,
    registry,
    fingerprint,
    register,
    annul,
    compute,
  };
};

describe('CertificatesService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-17T17:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('issue', () => {
    it('registers the certificate and returns its public response without salt', async () => {
      const { service, manager, register, compute } = buildHarness();
      const worker = buildWorker();
      manager.findOne.mockResolvedValueOnce(worker).mockResolvedValue(null);
      manager.save.mockResolvedValue(buildCertificate());

      const response = await service.issue(buildIssuer(), input);

      expect(manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`${WORKER_ID}:${CertificateType.HeightWork}`],
      );
      expect(register).toHaveBeenCalledWith({
        certificateId: expect.any(String),
        issuerId: ISSUER_ID,
        fingerprint: 'private-fingerprint',
        issuedAt: TODAY,
        validUntil: '2027-10-17',
      });
      expect(manager.save).toHaveBeenCalledWith(
        Certificate,
        expect.objectContaining({
          issuerId: ISSUER_ID,
          workerId: WORKER_ID,
          type: CertificateType.HeightWork,
          id: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
          salt: 'private-salt',
          fingerprint: 'private-fingerprint',
        }),
      );
      expect(compute).toHaveBeenCalledWith(
        expect.objectContaining({
          issuerId: ISSUER_ID,
          type: CertificateType.HeightWork,
          issuedAt: TODAY,
          validUntil: '2027-10-17',
          documentType: 'cc',
          documentNumber: 'AB12345',
        }),
        'private-salt',
      );
      expect(response).toEqual(toCertificateResponse(buildCertificate()));
      expect(response).not.toHaveProperty('salt');
      expect(response).not.toHaveProperty('fingerprint');
    });

    it.each([
      ['equal dates', TODAY],
      ['expiration before issue date', '2026-10-16'],
    ])(
      'rejects %s before opening a transaction',
      async (_caseName, validUntil) => {
        const { service, dataSource } = buildHarness();

        await expect(
          service.issue(buildIssuer(), buildInput({ validUntil })),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(dataSource.transaction).not.toHaveBeenCalled();
      },
    );

    it('rejects an issue date after today in Bogotá before opening a transaction', async () => {
      const { service, dataSource } = buildHarness();

      await expect(
        service.issue(buildIssuer(), buildInput({ issuedAt: '2026-10-18' })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it.each([
      ['a missing worker', null],
      [
        'a worker owned by another issuer',
        buildWorker({ issuerId: OTHER_ISSUER_ID }),
      ],
    ])('rejects %s with NotFoundException', async (_caseName, worker) => {
      const { service, manager } = buildHarness();
      manager.findOne.mockResolvedValue(worker);

      await expect(service.issue(buildIssuer(), input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(manager.findOne).toHaveBeenCalledWith(Worker, {
        where: { id: WORKER_ID, issuerId: ISSUER_ID },
      });
    });

    it('rejects a certificate type the issuer does not support', async () => {
      const { service, manager } = buildHarness();
      manager.findOne.mockResolvedValue(buildWorker());

      await expect(
        service.issue(buildIssuer({ certificateTypes: [] }), input),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a current duplicate for the same issuer, worker, and type', async () => {
      const { service, manager } = buildHarness();
      manager.findOne
        .mockResolvedValueOnce(buildWorker())
        .mockResolvedValueOnce(buildCertificate());

      await expect(service.issue(buildIssuer(), input)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(manager.findOne).toHaveBeenNthCalledWith(2, Certificate, {
        where: {
          issuerId: ISSUER_ID,
          workerId: WORKER_ID,
          type: CertificateType.HeightWork,
          annulledAt: IsNull(),
          validUntil: MoreThanOrEqual(TODAY),
        },
      });
    });

    it('propagates a registry error so the transaction rejects', async () => {
      const { service, manager, dataSource, register } = buildHarness();
      const failure = new Error('registry unavailable');
      manager.findOne
        .mockResolvedValueOnce(buildWorker())
        .mockResolvedValue(null);
      manager.save.mockResolvedValue(buildCertificate());
      register.mockRejectedValue(failure);

      await expect(service.issue(buildIssuer(), input)).rejects.toBe(failure);
      expect(dataSource.transaction).toHaveBeenCalledOnce();
    });
  });

  describe('list', () => {
    it('lists issuer certificates ordered by number descending', async () => {
      const { service, certificates } = buildHarness();
      certificates.find.mockResolvedValue([buildCertificate()]);

      await expect(service.list(buildIssuer())).resolves.toEqual([
        toCertificateResponse(buildCertificate()),
      ]);
      expect(certificates.find).toHaveBeenCalledWith({
        where: { issuerId: ISSUER_ID },
        order: { number: 'DESC' },
      });
    });
  });

  describe('annul', () => {
    it.each([
      ['a missing certificate', null],
      [
        'a certificate owned by another issuer',
        buildCertificate({ issuerId: OTHER_ISSUER_ID }),
      ],
    ])('rejects %s with NotFoundException', async (_caseName, certificate) => {
      const { service, certificates, annul } = buildHarness();
      certificates.findOne.mockResolvedValue(certificate);

      await expect(
        service.annul(buildIssuer(), CERTIFICATE_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(annul).not.toHaveBeenCalled();
    });

    it('rejects an already annulled certificate without calling the registry', async () => {
      const { service, certificates, annul } = buildHarness();
      certificates.findOne.mockResolvedValue(
        buildCertificate({ annulledAt: new Date() }),
      );

      await expect(
        service.annul(buildIssuer(), CERTIFICATE_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(annul).not.toHaveBeenCalled();
    });

    it('annuls a certificate and returns its updated response', async () => {
      const { service, certificates, annul } = buildHarness();
      certificates.findOne.mockResolvedValue(buildCertificate());
      certificates.update.mockResolvedValue({ affected: 1 });
      const updated = buildCertificate({
        annulledAt: new Date('2026-10-17T17:00:00.000Z'),
      });
      certificates.findOne
        .mockResolvedValueOnce(buildCertificate())
        .mockResolvedValueOnce(updated);

      await expect(
        service.annul(buildIssuer(), CERTIFICATE_ID),
      ).resolves.toEqual(toCertificateResponse(updated));
      expect(certificates.update).toHaveBeenCalledWith(
        { id: CERTIFICATE_ID, issuerId: ISSUER_ID, annulledAt: IsNull() },
        { annulledAt: expect.any(Date) },
      );
      expect(annul).toHaveBeenCalledWith(CERTIFICATE_ID);
    });

    it('returns a conflict when another annulment wins the conditional update', async () => {
      const { service, certificates } = buildHarness();
      const certificate = buildCertificate();
      const updated = buildCertificate({
        annulledAt: new Date('2026-10-17T17:00:00.000Z'),
      });
      certificates.findOne
        .mockResolvedValueOnce(certificate)
        .mockResolvedValueOnce(certificate)
        .mockResolvedValueOnce(updated);
      certificates.update
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 });

      const results = await Promise.allSettled([
        service.annul(buildIssuer(), CERTIFICATE_ID),
        service.annul(buildIssuer(), CERTIFICATE_ID),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const rejected = results.find((result) => result.status === 'rejected');
      expect(rejected?.status).toBe('rejected');
      if (rejected?.status === 'rejected') {
        expect(rejected.reason).toBeInstanceOf(ConflictException);
      }
    });
  });
});
