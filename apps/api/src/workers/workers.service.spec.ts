import { ConflictException } from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';
import { Issuer } from '../issuers/issuer.entity.js';
import { DocumentType } from './document-type.js';
import type { Worker } from './worker.entity.js';
import { toWorkerResponse } from './worker-response.js';
import { escapeLikePrefix, WorkersService } from './workers.service.js';
import type { CreateWorkerDto } from './dto/create-worker.dto.js';
import type { ListWorkersQueryDto } from './dto/list-workers-query.dto.js';

const ISSUER_ID = '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11';
const WORKER_ID = '5d29407a-f5e4-4af1-8dc2-91a22c0d81f0';
const CREATED_AT = new Date('2026-10-17T10:00:00.000Z');
const CONSENTED_AT = new Date('2026-10-17T09:59:00.000Z');

const buildWorker = (overrides: Partial<Worker> = {}): Worker =>
  ({
    id: WORKER_ID,
    issuerId: ISSUER_ID,
    fullName: 'Ana María Pérez',
    documentType: DocumentType.Cc,
    documentNumber: 'AB12345',
    createdAt: CREATED_AT,
    consentedAt: CONSENTED_AT,
    updatedAt: new Date('2026-10-17T10:01:00.000Z'),
    deletedAt: null,
    ...overrides,
  }) as Worker;

const buildIssuer = (): Issuer => ({ id: ISSUER_ID }) as Issuer;

const buildRepository = () => ({
  create: vi.fn((input: Partial<Worker>) => input as Worker),
  save: vi.fn(),
  find: vi.fn(),
});

describe('worker response', () => {
  it('maps issuerId to entityId and createdAt to registeredAt without exposing other entity fields', () => {
    expect(toWorkerResponse(buildWorker())).toEqual({
      id: WORKER_ID,
      entityId: ISSUER_ID,
      fullName: 'Ana María Pérez',
      documentType: DocumentType.Cc,
      documentNumber: 'AB12345',
      registeredAt: '2026-10-17T10:00:00.000Z',
      consentedAt: '2026-10-17T09:59:00.000Z',
    });
  });
});

describe('escapeLikePrefix', () => {
  it('escapes percent, underscore, and backslash', () => {
    expect(escapeLikePrefix('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
  });
});

describe('WorkersService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers with the issuer id and server consent time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-17T12:00:00.000Z'));
    const repository = buildRepository();
    const worker = buildWorker({ consentedAt: new Date() });
    repository.save.mockResolvedValue(worker);
    const service = new WorkersService(repository as unknown as Repository<Worker>);
    const input = {
      fullName: 'Ana María Pérez',
      documentType: DocumentType.Cc,
      documentNumber: 'AB12345',
      dataConsent: true,
    } as CreateWorkerDto;

    await expect(service.register(buildIssuer(), input)).resolves.toEqual(toWorkerResponse(worker));
    expect(repository.create).toHaveBeenCalledWith({
      issuerId: ISSUER_ID,
      fullName: input.fullName,
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      consentedAt: new Date('2026-10-17T12:00:00.000Z'),
    });
  });

  it('turns the named worker uniqueness violation into a generic conflict', async () => {
    const driverError = Object.assign(new Error('duplicate'), {
      driverError: { code: '23505', constraint: 'uq_worker_issuer_document' },
    });
    const failure = new QueryFailedError('INSERT INTO worker', [], driverError);
    const repository = buildRepository();
    repository.save.mockRejectedValue(failure);
    const service = new WorkersService(repository as unknown as Repository<Worker>);
    const input = {
      fullName: 'Ana María Pérez',
      documentType: DocumentType.Cc,
      documentNumber: 'PRIVATE123',
      dataConsent: true,
    } as CreateWorkerDto;

    let error: unknown;
    try {
      await service.register(buildIssuer(), input);
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).message).toBe(
      'Ya registraste a un trabajador con ese tipo y número de documento.',
    );
    expect((error as ConflictException).message).not.toContain('PRIVATE123');
    expect((error as ConflictException).message).not.toContain('Ana María Pérez');
  });

  it('rethrows any other error unchanged', async () => {
    const driverError = Object.assign(new Error('duplicate'), {
      driverError: { code: '23505', constraint: 'uq_another_constraint' },
    });
    const failure = new QueryFailedError('INSERT INTO worker', [], driverError);
    const repository = buildRepository();
    repository.save.mockRejectedValue(failure);
    const service = new WorkersService(repository as unknown as Repository<Worker>);

    await expect(
      service.register(buildIssuer(), {
        fullName: 'Ana María Pérez',
        documentType: DocumentType.Cc,
        documentNumber: 'AB12345',
        dataConsent: true,
      } as CreateWorkerDto),
    ).rejects.toBe(failure);
  });

  it('lists only the issuer workers ordered by createdAt and id descending', async () => {
    const repository = buildRepository();
    repository.find.mockResolvedValue([buildWorker()]);
    const service = new WorkersService(repository as unknown as Repository<Worker>);

    await expect(service.list(buildIssuer(), {} as ListWorkersQueryDto)).resolves.toEqual([
      toWorkerResponse(buildWorker()),
    ]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { issuerId: ISSUER_ID },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  });

  it('filters by an escaped document prefix', async () => {
    const repository = buildRepository();
    repository.find.mockResolvedValue([]);
    const service = new WorkersService(repository as unknown as Repository<Worker>);

    await service.list(buildIssuer(), { documentNumber: 'AB_1' });

    const [options] = repository.find.mock.calls[0] ?? [];
    expect(options).toMatchObject({
      where: {
        issuerId: ISSUER_ID,
        documentNumber: { _type: 'like', _value: 'AB\\_1%' },
      },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  });
});
