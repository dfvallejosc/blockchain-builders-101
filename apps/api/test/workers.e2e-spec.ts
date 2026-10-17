import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { CertificateType } from '../src/certificates/certificate-type.js';
import { Issuer } from '../src/issuers/issuer.entity.js';
import { IssuerType } from '../src/issuers/issuer-type.js';
import { Worker } from '../src/workers/worker.entity.js';
import { createTokenSigner } from './support/token-signer.js';

const ALLOWED_ORIGIN = 'http://localhost:5173';
const FULL_NAME = 'Ana María Pérez Gómez';
const OTHER_NAME = 'Luis Fernando Rojas';

describe('Workers (e2e)', () => {
  const signer = createTokenSigner();
  const runId = randomBytes(4).toString('hex').toUpperCase();
  let app: INestApplication;
  let dataSource: DataSource;
  let issuerAId: string;
  let issuerBId: string;
  let revokedId: string;

  // Document numbers carry the run id so parallel or repeated runs never collide.
  const doc = (suffix: string): string => `${runId}${suffix}`;

  const newIssuer = (label: string, overrides: Partial<Issuer> = {}): Partial<Issuer> => ({
    name: `Entidad ${label} ${runId}`,
    type: IssuerType.Clinic,
    city: 'Medellín',
    nit: `workers-e2e-${runId}-${label}`,
    ministryRegistration: `REG-${runId}-${label}`,
    contactName: 'Contacto de prueba',
    email: 'contacto-workers-e2e@example.com',
    phone: '3009998877',
    certificateTypes: [CertificateType.HeightWork],
    revokedAt: null,
    ...overrides,
  });

  const issuerToken = (issuerId: string): string =>
    `Bearer ${signer.sign({ azp: ALLOWED_ORIGIN, metadata: { role: 'issuer', issuerId } })}`;
  const adminToken = (): string => `Bearer ${signer.sign({ azp: ALLOWED_ORIGIN, metadata: { role: 'admin' } })}`;

  const validBody = (suffix: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    fullName: FULL_NAME,
    documentType: 'cc',
    documentNumber: doc(suffix),
    dataConsent: true,
    ...overrides,
  });

  const register = (token: string, body: Record<string, unknown>): request.Test =>
    request(app.getHttpServer()).post('/workers').set('Authorization', token).send(body);

  const list = (token: string, query = ''): request.Test =>
    request(app.getHttpServer()).get(`/workers${query}`).set('Authorization', token);

  const storedCount = (issuerId: string): Promise<number> =>
    dataSource.getRepository(Worker).count({ where: { issuerId } });

  beforeAll(async () => {
    process.env.CLERK_SECRET_KEY = ['sk', 'test', randomBytes(16).toString('hex')].join('_');
    process.env.CLERK_PUBLISHABLE_KEY = ['pk', 'test', randomBytes(16).toString('hex')].join('_');
    process.env.CLERK_JWT_KEY = signer.publicKeyPem;
    process.env.CORS_ORIGIN = ALLOWED_ORIGIN;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    const issuers = dataSource.getRepository(Issuer);
    issuerAId = (await issuers.save(issuers.create(newIssuer('a')))).id;
    issuerBId = (await issuers.save(issuers.create(newIssuer('b')))).id;
    revokedId = (await issuers.save(issuers.create(newIssuer('revoked', { revokedAt: new Date() })))).id;
  });

  afterAll(async () => {
    const ids = [issuerAId, issuerBId, revokedId].filter(Boolean);
    if (dataSource?.isInitialized && ids.length > 0) {
      // Workers reference issuers with RESTRICT, so they go first.
      await dataSource.getRepository(Worker).delete(ids.map((issuerId) => ({ issuerId })));
      await dataSource.getRepository(Issuer).delete(ids);
    }
    await app?.close();
  });

  describe('POST /workers', () => {
    it('registers a worker and answers the front Worker fields', async () => {
      const before = Date.now();

      const response = await register(issuerToken(issuerAId), validBody('0001')).expect(201);

      expect(Object.keys(response.body).sort()).toEqual(
        ['consentedAt', 'documentNumber', 'documentType', 'entityId', 'fullName', 'id', 'registeredAt'].sort(),
      );
      expect(response.body).toMatchObject({
        entityId: issuerAId,
        fullName: FULL_NAME,
        documentType: 'cc',
        documentNumber: doc('0001'),
      });
      expect(new Date(response.body.consentedAt as string).getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(new Date(response.body.consentedAt as string).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('trims the name and uppercases the document number', async () => {
      const response = await register(
        issuerToken(issuerAId),
        validBody('0002', { fullName: `  ${OTHER_NAME}  `, documentNumber: ` ${doc('0002').toLowerCase()} ` }),
      ).expect(201);

      expect(response.body).toMatchObject({ fullName: OTHER_NAME, documentNumber: doc('0002') });
    });

    it('answers 400 without the consent and stores nothing', async () => {
      const before = await storedCount(issuerAId);

      await register(issuerToken(issuerAId), validBody('0003', { dataConsent: false })).expect(400);

      expect(await storedCount(issuerAId)).toBe(before);
    });

    it.each([
      ['consent sent as text', { dataConsent: 'true' }],
      ['a one-word name', { fullName: 'Ana' }],
      ['a name of only spaces', { fullName: '     ' }],
      ['a document with dots', { documentNumber: '1.234.567' }],
      ['a document that is too short', { documentNumber: 'AB12' }],
      ['an unknown document type', { documentType: 'nit' }],
      ['an issuerId in the body', { issuerId: '00000000-0000-4000-8000-000000000000' }],
      ['a consentedAt in the body', { consentedAt: '2020-01-01T00:00:00.000Z' }],
      ['an id in the body', { id: '00000000-0000-4000-8000-000000000000' }],
    ])('answers 400 with %s', async (_label, overrides) => {
      await register(issuerToken(issuerAId), validBody('0004', overrides)).expect(400);
    });

    it('answers 409 for the same document, also in lowercase, without echoing personal data', async () => {
      await register(issuerToken(issuerAId), validBody('0005')).expect(201);

      const same = await register(issuerToken(issuerAId), validBody('0005')).expect(409);
      const lowercase = await register(
        issuerToken(issuerAId),
        validBody('0005', { documentNumber: doc('0005').toLowerCase() }),
      ).expect(409);

      for (const response of [same, lowercase]) {
        expect(response.text).not.toContain(doc('0005'));
        expect(response.text).not.toContain(FULL_NAME);
      }
    });

    it('lets another issuer register the same document', async () => {
      await register(issuerToken(issuerAId), validBody('0006')).expect(201);

      await register(issuerToken(issuerBId), validBody('0006')).expect(201);
    });

    it('answers 201 and 409 for two simultaneous registrations of the same document', async () => {
      const results = await Promise.all([
        register(issuerToken(issuerAId), validBody('0007')),
        register(issuerToken(issuerAId), validBody('0007')),
      ]);

      expect(results.map((result) => result.status).sort((a, b) => a - b)).toEqual([201, 409]);
    });
  });

  describe('GET /workers', () => {
    beforeAll(async () => {
      for (const suffix of ['AB_1', 'ABX1', 'AB12345']) {
        await register(issuerToken(issuerAId), validBody(`L${suffix}`)).expect(201);
      }
      await register(issuerToken(issuerBId), validBody('LONLYB')).expect(201);
    });

    it('lists only the own workers, newest first', async () => {
      const response = await list(issuerToken(issuerAId)).expect(200);

      const body = response.body as Array<{ entityId: string; registeredAt: string; documentNumber: string }>;
      expect(body.length).toBeGreaterThan(0);
      expect(body.every((worker) => worker.entityId === issuerAId)).toBe(true);
      const dates = body.map((worker) => new Date(worker.registeredAt).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
      expect(body.some((worker) => worker.documentNumber === doc('LONLYB'))).toBe(false);
    });

    it('does not find the workers of another issuer by document', async () => {
      const response = await list(issuerToken(issuerAId), `?documentNumber=${doc('LONLYB')}`).expect(200);

      expect(response.body).toEqual([]);
    });

    it('searches by prefix, in any case', async () => {
      const response = await list(issuerToken(issuerAId), `?documentNumber=${doc('lab12').toLowerCase()}`).expect(200);

      expect((response.body as Array<{ documentNumber: string }>).map((worker) => worker.documentNumber)).toEqual([
        doc('LAB12345'),
      ]);
    });

    it('treats the underscore and the percent sign as plain characters', async () => {
      const underscore = await list(issuerToken(issuerAId), `?documentNumber=${doc('LAB_')}`).expect(200);
      const percent = await list(issuerToken(issuerAId), '?documentNumber=%25').expect(200);
      // A lone backslash is an invalid LIKE pattern unless it is escaped.
      const backslash = await list(issuerToken(issuerAId), '?documentNumber=%5C').expect(200);

      expect((underscore.body as Array<{ documentNumber: string }>).map((worker) => worker.documentNumber)).toEqual([
        doc('LAB_1'),
      ]);
      expect(percent.body).toEqual([]);
      expect(backslash.body).toEqual([]);
    });

    it.each([
      ['empty', '?documentNumber='],
      ['repeated', '?documentNumber=a&documentNumber=b'],
      ['with a space', '?documentNumber=a%20b'],
      ['too long', `?documentNumber=${'A'.repeat(21)}`],
      ['with an unknown parameter', '?foo=bar'],
    ])('answers 400 when the search is %s', async (_label, query) => {
      await list(issuerToken(issuerAId), query).expect(400);
    });
  });

  describe('access', () => {
    it('answers 401 without a token on both routes', async () => {
      await request(app.getHttpServer()).get('/workers').expect(401);
      await request(app.getHttpServer()).post('/workers').send(validBody('0009')).expect(401);
    });

    it('answers 403 to an administrator on both routes', async () => {
      await list(adminToken()).expect(403);
      await register(adminToken(), validBody('0009')).expect(403);
    });

    it('answers 403 issuer-revoked to a revoked issuer on both routes', async () => {
      const read = await list(issuerToken(revokedId)).expect(403);
      const write = await register(issuerToken(revokedId), validBody('0009')).expect(403);

      expect(read.body).toMatchObject({ code: 'issuer-revoked' });
      expect(write.body).toMatchObject({ code: 'issuer-revoked' });
    });

    it('keeps personal data out of the error bodies', async () => {
      const bad = await register(issuerToken(issuerAId), validBody('0010', { fullName: 'Solo' })).expect(400);

      expect(bad.text).not.toContain('Solo');
      expect(bad.text).not.toContain(doc('0010'));
    });
  });
});
