import { randomBytes } from 'node:crypto';
import { ClerkAPIResponseError } from '@clerk/backend/errors';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response as SupertestResponse } from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { CLERK_CLIENT } from '../src/auth/accounts.service.js';
import { Certificate } from '../src/certificates/certificate.entity.js';
import { CertificateType } from '../src/certificates/certificate-type.js';
import { todayInBogota } from '../src/certificates/dates.js';
import { Issuer } from '../src/issuers/issuer.entity.js';
import { Worker } from '../src/workers/worker.entity.js';
import { createTokenSigner } from './support/token-signer.js';

const ALLOWED_ORIGIN = 'http://localhost:5173';
const ENTITY_FIELDS = [
  'certificateTypes',
  'city',
  'contactName',
  'email',
  'id',
  'issuedThisMonth',
  'ministryRegistration',
  'name',
  'nit',
  'phone',
  'registeredAt',
  'revokedAt',
  'type',
];

describe('Issuers (e2e)', () => {
  const signer = createTokenSigner();
  const runId = randomBytes(4).toString('hex');
  const createInvitation = vi.fn();
  let app: INestApplication;
  let dataSource: DataSource;
  const createdIds: string[] = [];
  let sequence = 0;

  // The run id is 32 random bits, so six digits of it plus the sequence keep NITs apart between runs.
  const nitFor = (tail: string): string => {
    const digits = `${String(Number.parseInt(runId, 16)).padStart(10, '0').slice(-6)}${tail}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-5`;
  };

  // Every run uses its own NITs and emails, so repeated or parallel runs rarely collide.
  const body = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
    sequence += 1;
    const tail = String(sequence).padStart(3, '0');
    return {
      name: `Entidad ${runId} ${tail}`,
      type: 'clinic',
      city: 'Medellín',
      certificateTypes: ['occupational-medical', 'height-work'],
      nit: nitFor(tail),
      ministryRegistration: `REG-${runId}-${tail}`,
      contactName: 'Marcela Ríos',
      email: `issuers-e2e-${runId}-${tail}@example.com`,
      phone: '310 555 0142',
      ...overrides,
    };
  };

  const adminToken = (): string => `Bearer ${signer.sign({ azp: ALLOWED_ORIGIN, metadata: { role: 'admin' } })}`;
  const issuerToken = (issuerId: string): string =>
    `Bearer ${signer.sign({ azp: ALLOWED_ORIGIN, metadata: { role: 'issuer', issuerId } })}`;

  const register = (token: string, payload: Record<string, unknown>): request.Test =>
    request(app.getHttpServer()).post('/issuers').set('Authorization', token).send(payload);
  const registered = async (overrides: Record<string, unknown> = {}): Promise<SupertestResponse> => {
    const response = await register(adminToken(), body(overrides)).expect(201);
    createdIds.push(response.body.id as string);
    return response;
  };
  const list = (token: string): request.Test =>
    request(app.getHttpServer()).get('/issuers').set('Authorization', token);
  const detail = (token: string, id: string): request.Test =>
    request(app.getHttpServer()).get(`/issuers/${id}`).set('Authorization', token);
  const revoke = (token: string, id: string): request.Test =>
    request(app.getHttpServer()).post(`/issuers/${id}/revoke`).set('Authorization', token);

  const storedByNit = (nit: unknown): Promise<Issuer | null> =>
    dataSource.getRepository(Issuer).findOneBy({ nit: nit as string });

  const expectSafeError = (response: SupertestResponse): void => {
    expect(response.text).not.toMatch(/\b(?:relation|table)\s+["']?(?:public\.)?issuer["']?/i);
    expect(response.text).not.toMatch(/\bstack\b|QueryFailedError|ClerkAPIResponseError|clerk_trace|at\s+\S+\s+\(/i);
  };

  beforeAll(async () => {
    process.env.CLERK_SECRET_KEY = ['sk', 'test', randomBytes(16).toString('hex')].join('_');
    process.env.CLERK_PUBLISHABLE_KEY = ['pk', 'test', randomBytes(16).toString('hex')].join('_');
    process.env.CLERK_JWT_KEY = signer.publicKeyPem;
    process.env.CORS_ORIGIN = ALLOWED_ORIGIN;
    process.env.WEB_APP_URL = ALLOWED_ORIGIN;

    // The Clerk client is replaced, so the suite never reaches the network.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLERK_CLIENT)
      .useValue({ invitations: { createInvitation } })
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(() => {
    createInvitation.mockReset().mockResolvedValue({ id: 'inv_1' });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized && createdIds.length > 0) {
      // Certificates and workers reference issuers with RESTRICT, so they go first.
      await dataSource.getRepository(Certificate).delete({ issuerId: In(createdIds) });
      await dataSource.getRepository(Worker).delete({ issuerId: In(createdIds) });
      await dataSource.getRepository(Issuer).delete(createdIds);
    }
    await app?.close();
  });

  describe('access', () => {
    const someId = '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11';
    const routes: [string, (token?: string) => request.Test][] = [
      ['POST /issuers', (token) => withAuth(register('', body()), token)],
      ['GET /issuers', (token) => withAuth(list(''), token)],
      ['GET /issuers/:id', (token) => withAuth(detail('', someId), token)],
      ['POST /issuers/:id/revoke', (token) => withAuth(revoke('', someId), token)],
    ];
    const withAuth = (test: request.Test, token?: string): request.Test =>
      token ? test.set('Authorization', token) : test.unset('Authorization');

    it.each(routes)('%s answers 401 without a session', async (_name, call) => {
      await call().expect(401);
    });

    it.each(routes)('%s answers 403 to an issuer', async (_name, call) => {
      const issuer = await registered();
      await call(issuerToken(issuer.body.id as string)).expect(403);
    });

    it('does not invite anyone when the caller is not an admin', async () => {
      const issuer = await registered();
      createInvitation.mockClear();

      await register(issuerToken(issuer.body.id as string), body()).expect(403);

      expect(createInvitation).not.toHaveBeenCalled();
    });
  });

  describe('POST /issuers', () => {
    it('registers the entity, answers the front Entity fields and invites the contact', async () => {
      const payload = body();

      const response = await register(adminToken(), payload).expect(201);
      createdIds.push(response.body.id as string);

      expect(Object.keys(response.body).sort()).toEqual(ENTITY_FIELDS);
      expect(response.body).toMatchObject({ ...payload, revokedAt: null, issuedThisMonth: 0 });
      expect(Number.isNaN(Date.parse(response.body.registeredAt as string))).toBe(false);
      expect(createInvitation).toHaveBeenCalledWith({
        emailAddress: payload.email,
        publicMetadata: { role: 'issuer', issuerId: response.body.id },
        redirectUrl: `${ALLOWED_ORIGIN}/emisor/aceptar-invitacion`,
      });
      expect(await storedByNit(payload.nit)).not.toBeNull();
    });

    it('stores the NIT, phone and email in their canonical format', async () => {
      const payload = body();
      const response = await register(adminToken(), {
        ...payload,
        nit: String(payload.nit).replace(/\D/g, '').replace(/^(\d{9})(\d)$/, '$1-$2'),
        phone: '3105550142',
        email: ` ${String(payload.email).toUpperCase()} `,
      }).expect(201);
      createdIds.push(response.body.id as string);

      expect(response.body).toMatchObject({ nit: payload.nit, phone: '310 555 0142', email: payload.email });
    });

    it('answers 409 for a NIT that is already registered and does not invite again', async () => {
      const first = await registered();
      createInvitation.mockClear();

      const response = await register(adminToken(), body({ nit: first.body.nit })).expect(409);

      expect(response.body.message).toBe('Ya hay una entidad registrada con ese NIT.');
      expect(createInvitation).not.toHaveBeenCalled();
      expectSafeError(response);
    });

    it('rolls the row back and answers 409 when the email already has an account in Clerk', async () => {
      const payload = body();
      createInvitation.mockRejectedValue(
        new ClerkAPIResponseError('form_identifier_exists', {
          data: [{ code: 'form_identifier_exists', message: 'taken', long_message: 'taken' }],
          status: 422,
        }),
      );

      const response = await register(adminToken(), payload).expect(409);

      expect(response.body.message).toBe('Ese correo ya tiene una cuenta o una invitación pendiente.');
      expect(await storedByNit(payload.nit)).toBeNull();
      expectSafeError(response);
    });

    it('rolls the row back and answers a generic 503 when Clerk fails, so the admin can retry', async () => {
      const payload = body();
      createInvitation.mockRejectedValueOnce(new Error('connect ETIMEDOUT clerk.internal'));

      const failed = await register(adminToken(), payload).expect(503);

      expect(failed.body.message).toBe('El servicio no está disponible.');
      expect(failed.text).not.toContain('ETIMEDOUT');
      expect(await storedByNit(payload.nit)).toBeNull();

      // The same data registers fine once Clerk answers again: nothing was left half done.
      const retried = await register(adminToken(), payload).expect(201);
      createdIds.push(retried.body.id as string);
    });

    it.each([
      ['a missing field', { email: undefined }],
      ['an invalid NIT', { nit: '123' }],
      ['an unknown certificate type', { certificateTypes: ['diving'] }],
      ['an unknown field', { revokedAt: '2026-10-17T00:00:00.000Z' }],
    ])('answers 400 for %s without internals and without calling Clerk', async (_name, overrides) => {
      const response = await register(adminToken(), body(overrides)).expect(400);

      expectSafeError(response);
      expect(createInvitation).not.toHaveBeenCalled();
    });
  });

  describe('GET /issuers', () => {
    it('lists the registered entities newest first', async () => {
      const older = await registered();
      const newer = await registered();

      const response = await list(adminToken()).expect(200);
      const ids = (response.body as { id: string }[]).map((entity) => entity.id);

      expect(ids.indexOf(newer.body.id as string)).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf(newer.body.id as string)).toBeLessThan(ids.indexOf(older.body.id as string));
      expect(Object.keys((response.body as object[])[0] as object).sort()).toEqual(ENTITY_FIELDS);
    });

    it('counts every certificate created this month, annulled and backdated ones included', async () => {
      const issuer = await registered();
      const issuerId = issuer.body.id as string;
      const workers = dataSource.getRepository(Worker);
      const worker = await workers.save(
        workers.create({
          issuerId,
          fullName: 'Ana María Pérez Gómez',
          documentType: 'cc',
          documentNumber: `${runId.toUpperCase()}01`,
          consentedAt: new Date(),
        }),
      );
      const certificates = dataSource.getRepository(Certificate);
      const certificate = (overrides: Partial<Certificate>): Partial<Certificate> => ({
        issuerId,
        workerId: worker.id,
        type: CertificateType.HeightWork,
        issuedAt: todayInBogota(),
        validUntil: '2099-12-31',
        annulledAt: null,
        salt: 'test-salt',
        fingerprint: 'test-fingerprint',
        ...overrides,
      });
      await certificates.save([
        certificates.create(certificate({})),
        // Annulling later must not change what was issued.
        certificates.create(certificate({ annulledAt: new Date() })),
        // The issuer-typed issue date can be backdated; the server creation time decides the month.
        certificates.create(certificate({ issuedAt: '2020-01-15' })),
        // Created in a past month: out of the count.
        certificates.create(certificate({ createdAt: new Date('2020-01-15T15:00:00.000Z') })),
      ]);

      const fromList = (await list(adminToken()).expect(200)).body as { id: string; issuedThisMonth: number }[];
      const fromDetail = await detail(adminToken(), issuerId).expect(200);

      expect(fromList.find((entity) => entity.id === issuerId)?.issuedThisMonth).toBe(3);
      expect(fromDetail.body.issuedThisMonth).toBe(3);
    });
  });

  describe('GET /issuers/:id', () => {
    it('answers the entity', async () => {
      const issuer = await registered();

      const response = await detail(adminToken(), issuer.body.id as string).expect(200);

      expect(response.body).toEqual(issuer.body);
    });

    it('answers 404 for an unknown id and for an id that is not a uuid', async () => {
      await detail(adminToken(), '9b2f6c1e-0000-4000-8000-000000000000').expect(404);
      const malformed = await detail(adminToken(), 'not-a-uuid').expect(404);

      expectSafeError(malformed);
    });
  });

  describe('POST /issuers/:id/revoke', () => {
    it('revokes logically, keeps the data and stamps the date', async () => {
      const issuer = await registered();
      const id = issuer.body.id as string;
      const before = Date.now();

      const response = await revoke(adminToken(), id).expect(200);

      expect(response.body).toMatchObject({ ...(issuer.body as object), revokedAt: expect.any(String) });
      expect(new Date(response.body.revokedAt as string).getTime()).toBeGreaterThanOrEqual(before - 1000);
      const stored = await dataSource.getRepository(Issuer).findOneBy({ id });
      expect(stored).toMatchObject({ nit: issuer.body.nit, deletedAt: null });
      expect(stored?.revokedAt).toBeInstanceOf(Date);
    });

    it('keeps the first revocation date when revoking again', async () => {
      const issuer = await registered();
      const id = issuer.body.id as string;
      const first = await revoke(adminToken(), id).expect(200);

      const second = await revoke(adminToken(), id).expect(200);

      expect(second.body.revokedAt).toBe(first.body.revokedAt);
    });

    it('locks the issuer out: its session is refused after the revocation', async () => {
      const issuer = await registered();
      const id = issuer.body.id as string;
      await request(app.getHttpServer()).get('/me').set('Authorization', issuerToken(id)).expect(200);

      await revoke(adminToken(), id).expect(200);

      const refused = await request(app.getHttpServer()).get('/me').set('Authorization', issuerToken(id)).expect(403);
      expect(refused.body.code).toBe('issuer-revoked');
    });

    it('answers 404 for an unknown id', async () => {
      await revoke(adminToken(), '9b2f6c1e-0000-4000-8000-000000000000').expect(404);
    });
  });
});
