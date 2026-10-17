import { ClerkAPIResponseError } from '@clerk/backend/errors';
import { ConflictException, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { QueryFailedError, type DataSource, type Repository } from 'typeorm';
import type { AccountsService } from '../auth/accounts.service.js';
import { CertificateType } from '../certificates/certificate-type.js';
import type { CreateIssuerDto } from './dto/create-issuer.dto.js';
import { Issuer } from './issuer.entity.js';
import { IssuerType } from './issuer-type.js';
import { toIssuerResponse } from './issuer-response.js';
import { IssuersService } from './issuers.service.js';

const ISSUER_ID = '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11';
const OTHER_ID = '5d29407a-f5e4-4af1-8dc2-91a22c0d81f0';

const input = {
  name: 'Salud Ocupacional del Valle',
  type: IssuerType.Clinic,
  city: 'Medellín',
  certificateTypes: [CertificateType.OccupationalMedical],
  nit: '901.482.317-5',
  ministryRegistration: 'REG-2024-118',
  contactName: 'Marcela Ríos',
  email: 'marcela@saludvalle.co',
  phone: '310 555 0142',
} satisfies CreateIssuerDto;

const buildIssuer = (overrides: Partial<Issuer> = {}): Issuer =>
  ({
    id: ISSUER_ID,
    ...input,
    revokedAt: null,
    createdAt: new Date('2026-10-17T10:00:00.000Z'),
    updatedAt: new Date('2026-10-17T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }) as Issuer;

const uniqueViolation = (constraint: string): QueryFailedError =>
  new QueryFailedError('INSERT ...', [], Object.assign(new Error('duplicate key'), { code: '23505', constraint }));

const clerkError = (status: number, code: string): ClerkAPIResponseError =>
  new ClerkAPIResponseError('clerk failure', { data: [{ code, message: 'm', long_message: 'm' }], status });

const setup = () => {
  const transactional = {
    create: vi.fn((value: Partial<Issuer>) => value as Issuer),
    save: vi.fn((value: Issuer) => Promise.resolve(buildIssuer(value))),
  };
  const repository = {
    find: vi.fn(),
    findOneBy: vi.fn(),
    update: vi.fn(),
  };
  // Mimics TypeORM: the callback's throw is the rollback, so the promise rejects with the same error.
  const dataSource = {
    transaction: vi.fn((work: (manager: unknown) => Promise<unknown>) =>
      work({ getRepository: () => transactional }),
    ),
    query: vi.fn().mockResolvedValue([]),
  };
  const accounts = { inviteIssuer: vi.fn().mockResolvedValue(undefined) };
  const service = new IssuersService(
    repository as unknown as Repository<Issuer>,
    dataSource as unknown as DataSource,
    accounts as unknown as AccountsService,
  );
  return { service, repository, transactional, dataSource, accounts };
};

describe('IssuersService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('register', () => {
    it('saves the issuer unrevoked, invites its contact email, and answers the Entity fields', async () => {
      const { service, transactional, accounts } = setup();

      const response = await service.register(input);

      expect(transactional.create).toHaveBeenCalledWith({ ...input, revokedAt: null });
      expect(accounts.inviteIssuer).toHaveBeenCalledWith(ISSUER_ID, input.email);
      expect(response).toEqual(toIssuerResponse(buildIssuer(), 0));
    });

    it('invites only after the row is saved, so the invitation can carry its id', async () => {
      const { service, transactional, accounts } = setup();

      await service.register(input);

      expect(transactional.save.mock.invocationCallOrder[0]).toBeLessThan(
        accounts.inviteIssuer.mock.invocationCallOrder[0] as number,
      );
    });

    it('answers 409 and never calls Clerk when the NIT is already registered', async () => {
      const { service, transactional, accounts } = setup();
      transactional.save.mockRejectedValue(uniqueViolation('uq_issuer_nit'));

      const result = service.register(input);

      await expect(result).rejects.toBeInstanceOf(ConflictException);
      await expect(result).rejects.toMatchObject({ message: 'Ya hay una entidad registrada con ese NIT.' });
      expect(accounts.inviteIssuer).not.toHaveBeenCalled();
    });

    it('rethrows an unrelated database failure unchanged', async () => {
      const { service, transactional } = setup();
      const failure = uniqueViolation('some_other_constraint');
      transactional.save.mockRejectedValue(failure);

      await expect(service.register(input)).rejects.toBe(failure);
    });

    it.each([
      ['an existing account', 'form_identifier_exists'],
      ['an existing invitation', 'duplicate_record'],
    ])('rolls back with 409 when the email already has %s in Clerk', async (_name, code) => {
      const { service, accounts } = setup();
      accounts.inviteIssuer.mockRejectedValue(clerkError(422, code));

      const result = service.register(input);

      await expect(result).rejects.toBeInstanceOf(ConflictException);
      await expect(result).rejects.toMatchObject({
        message: 'Ese correo ya tiene una cuenta o una invitación pendiente.',
      });
    });

    it('also recognizes the duplicate codes under another 4xx status', async () => {
      const { service, accounts } = setup();
      accounts.inviteIssuer.mockRejectedValue(clerkError(400, 'duplicate_record'));

      await expect(service.register(input)).rejects.toBeInstanceOf(ConflictException);
    });

    it('logs the Clerk status and codes, never the email or the Clerk message', async () => {
      const { service, accounts } = setup();
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      accounts.inviteIssuer.mockRejectedValue(clerkError(401, 'authentication_invalid'));

      await expect(service.register(input)).rejects.toBeInstanceOf(ServiceUnavailableException);

      const logged = warn.mock.calls.map((call) => String(call[0])).join('\n');
      expect(logged).toContain('401');
      expect(logged).toContain('authentication_invalid');
      expect(logged).not.toContain(input.email);
      expect(logged).not.toContain('clerk failure');
      warn.mockRestore();
    });

    it('logs an unexpected failure without its message', async () => {
      const { service, accounts } = setup();
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      accounts.inviteIssuer.mockRejectedValue(new Error(`timeout inviting ${input.email}`));

      await expect(service.register(input)).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).not.toContain(input.email);
      warn.mockRestore();
    });

    it.each([
      ['a Clerk server error', clerkError(500, 'unexpected')],
      ['a Clerk validation error of another kind', clerkError(422, 'form_param_format_invalid')],
      ['a network failure', new Error('connect ETIMEDOUT')],
    ])('rolls back with a generic 503 on %s', async (_name, failure) => {
      const { service, accounts } = setup();
      accounts.inviteIssuer.mockRejectedValue(failure);

      const result = service.register(input);

      await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(result).rejects.toMatchObject({ message: 'El servicio no está disponible.' });
    });

    it('keeps the 503 from AccountsService when Clerk is not configured', async () => {
      const { service, accounts } = setup();
      const unavailable = new ServiceUnavailableException('El servicio no está disponible.');
      accounts.inviteIssuer.mockRejectedValue(unavailable);

      await expect(service.register(input)).rejects.toBe(unavailable);
    });
  });

  describe('list', () => {
    it('answers every issuer newest first with its issued count for the current Bogota month', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-17T15:00:00.000Z'));
      const { service, repository, dataSource } = setup();
      const first = buildIssuer();
      const second = buildIssuer({ id: OTHER_ID, nit: '900.111.222-3' });
      repository.find.mockResolvedValue([first, second]);
      dataSource.query.mockResolvedValue([{ issuerId: OTHER_ID, count: 7 }]);

      const response = await service.list();

      expect(repository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC', id: 'DESC' } });
      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), ['2026-10-01', '2026-11-01', [ISSUER_ID, OTHER_ID]]);
      expect(response).toEqual([toIssuerResponse(first, 0), toIssuerResponse(second, 7)]);
    });

    it('answers an empty list without counting', async () => {
      const { service, repository, dataSource } = setup();
      repository.find.mockResolvedValue([]);

      await expect(service.list()).resolves.toEqual([]);
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('answers the issuer with its count', async () => {
      const { service, repository, dataSource } = setup();
      const issuer = buildIssuer();
      repository.findOneBy.mockResolvedValue(issuer);
      dataSource.query.mockResolvedValue([{ issuerId: ISSUER_ID, count: 3 }]);

      await expect(service.get(ISSUER_ID)).resolves.toEqual(toIssuerResponse(issuer, 3));
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: ISSUER_ID });
    });

    it('answers 404 when the issuer does not exist', async () => {
      const { service, repository } = setup();
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.get(ISSUER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('marks the issuer revoked with the server time and keeps its data', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-18T08:30:00.000Z'));
      const { service, repository } = setup();
      const revoked = buildIssuer({ revokedAt: new Date('2026-10-18T08:30:00.000Z') });
      repository.findOneBy.mockResolvedValueOnce(buildIssuer()).mockResolvedValueOnce(revoked);

      const response = await service.revoke(ISSUER_ID);

      expect(repository.update).toHaveBeenCalledWith(
        { id: ISSUER_ID, revokedAt: expect.objectContaining({ _type: 'isNull' }) },
        { revokedAt: new Date('2026-10-18T08:30:00.000Z') },
      );
      expect(response.revokedAt).toBe('2026-10-18T08:30:00.000Z');
      expect(response.nit).toBe(input.nit);
    });

    it('is idempotent: an already revoked issuer keeps its original date', async () => {
      const { service, repository } = setup();
      const revoked = buildIssuer({ revokedAt: new Date('2026-10-01T00:00:00.000Z') });
      repository.findOneBy.mockResolvedValue(revoked);

      const response = await service.revoke(ISSUER_ID);

      expect(repository.update).not.toHaveBeenCalled();
      expect(response.revokedAt).toBe('2026-10-01T00:00:00.000Z');
    });

    it('answers 404 when the issuer does not exist', async () => {
      const { service, repository } = setup();
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.revoke(ISSUER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
