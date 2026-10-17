import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response as SupertestResponse } from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { Certificate } from '../src/certificates/certificate.entity.js';
import { CertificateType } from '../src/certificates/certificate-type.js';
import { Issuer } from '../src/issuers/issuer.entity.js';
import { IssuerType } from '../src/issuers/issuer-type.js';
import { Worker } from '../src/workers/worker.entity.js';
import { createTokenSigner } from './support/token-signer.js';

const ALLOWED_ORIGIN = 'http://localhost:5173';
const WORKER_NAME = 'Ana María Pérez Gómez';
const OTHER_WORKER_NAME = 'Luis Fernando Rojas';
const ISSUED_AT = '2020-01-01';
const VALID_UNTIL = '2099-12-31';

interface WorkerFixture {
  id: string;
  fullName: string;
  documentNumber: string;
}

describe('Certificates (e2e)', () => {
  const signer = createTokenSigner();
  const runId = randomBytes(4).toString('hex').toUpperCase();
  let app: INestApplication;
  let dataSource: DataSource;
  let issuerAId: string;
  let issuerBId: string;
  let revokedIssuerId: string;
  let unsupportedIssuerId: string;
  let workerA: WorkerFixture;
  let workerASecond: WorkerFixture;
  let workerB: WorkerFixture;
  let unsupportedWorker: WorkerFixture;

  const doc = (suffix: string): string => `${runId}${suffix}`;

  const newIssuer = (
    label: string,
    overrides: Partial<Issuer> = {},
  ): Partial<Issuer> => ({
    name: `Entidad ${label} ${runId}`,
    type: IssuerType.Clinic,
    city: 'Medellín',
    nit: `certificates-e2e-${runId}-${label}`,
    ministryRegistration: `REG-${runId}-${label}`,
    contactName: 'Contacto de prueba',
    email: 'contacto-certificates-e2e@example.com',
    phone: '3009998877',
    certificateTypes: [CertificateType.HeightWork],
    revokedAt: null,
    ...overrides,
  });

  const issuerToken = (issuerId: string): string =>
    `Bearer ${signer.sign({ azp: ALLOWED_ORIGIN, metadata: { role: 'issuer', issuerId } })}`;
  const adminToken = (): string =>
    `Bearer ${signer.sign({ azp: ALLOWED_ORIGIN, metadata: { role: 'admin' } })}`;

  const validBody = (
    workerId: string,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    workerId,
    type: CertificateType.HeightWork,
    issuedAt: ISSUED_AT,
    validUntil: VALID_UNTIL,
    ...overrides,
  });

  const issue = (
    token: string,
    workerId: string,
    overrides: Record<string, unknown> = {},
  ): request.Test =>
    request(app.getHttpServer())
      .post('/certificates')
      .set('Authorization', token)
      .send(validBody(workerId, overrides));

  const list = (token: string): request.Test =>
    request(app.getHttpServer())
      .get('/certificates')
      .set('Authorization', token);

  const annul = (token: string, id: string): request.Test =>
    request(app.getHttpServer())
      .post(`/certificates/${id}/annul`)
      .set('Authorization', token);

  const expectSafeError = (
    response: SupertestResponse,
    worker: WorkerFixture,
  ): void => {
    expect(response.text).not.toContain(worker.fullName);
    expect(response.text).not.toContain(worker.documentNumber);
    expect(response.text).not.toMatch(
      /\b(?:relation|table)\s+["']?(?:public\.)?certificate["']?/i,
    );
    expect(response.text).not.toMatch(
      /\bstack\b|QueryFailedError|at\s+\S+\s+\(/i,
    );
  };

  const expectError = async (
    test: request.Test,
    status: number,
    worker: WorkerFixture,
  ): Promise<SupertestResponse> => {
    const response = await test.expect(status);
    expectSafeError(response, worker);
    return response;
  };

  const createWorker = async (
    issuerId: string,
    fullName: string,
    suffix: string,
  ): Promise<WorkerFixture> => {
    const repository = dataSource.getRepository(Worker);
    const worker = await repository.save(
      repository.create({
        issuerId,
        fullName,
        documentType: 'cc',
        documentNumber: doc(suffix),
        consentedAt: new Date(),
      }),
    );
    return {
      id: worker.id,
      fullName: worker.fullName,
      documentNumber: worker.documentNumber,
    };
  };

  const createIsolatedWorker = (
    issuerId: string,
    fullName = WORKER_NAME,
  ): Promise<WorkerFixture> =>
    createWorker(
      issuerId,
      fullName,
      `T${randomBytes(3).toString('hex').toUpperCase()}`,
    );

  beforeAll(async () => {
    process.env.CLERK_SECRET_KEY = [
      'sk',
      'test',
      randomBytes(16).toString('hex'),
    ].join('_');
    process.env.CLERK_PUBLISHABLE_KEY = [
      'pk',
      'test',
      randomBytes(16).toString('hex'),
    ].join('_');
    process.env.CLERK_JWT_KEY = signer.publicKeyPem;
    process.env.CORS_ORIGIN = ALLOWED_ORIGIN;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    const issuers = dataSource.getRepository(Issuer);
    issuerAId = (await issuers.save(issuers.create(newIssuer('a')))).id;
    issuerBId = (await issuers.save(issuers.create(newIssuer('b')))).id;
    revokedIssuerId = (
      await issuers.save(
        issuers.create(newIssuer('revoked', { revokedAt: new Date() })),
      )
    ).id;
    unsupportedIssuerId = (
      await issuers.save(
        issuers.create(newIssuer('unsupported', { certificateTypes: [] })),
      )
    ).id;

    workerA = await createWorker(issuerAId, WORKER_NAME, 'A0001');
    workerASecond = await createWorker(issuerAId, OTHER_WORKER_NAME, 'A0002');
    workerB = await createWorker(issuerBId, OTHER_WORKER_NAME, 'B0001');
    unsupportedWorker = await createWorker(
      unsupportedIssuerId,
      WORKER_NAME,
      'N0001',
    );
  });

  afterAll(async () => {
    const issuerIds = [
      issuerAId,
      issuerBId,
      revokedIssuerId,
      unsupportedIssuerId,
    ].filter(Boolean);
    if (dataSource?.isInitialized && issuerIds.length > 0) {
      await dataSource
        .getRepository(Certificate)
        .delete(issuerIds.map((issuerId) => ({ issuerId })));
      await dataSource
        .getRepository(Worker)
        .delete(issuerIds.map((issuerId) => ({ issuerId })));
      await dataSource.getRepository(Issuer).delete(issuerIds);
    }
    await app?.close();
  });

  describe('POST /certificates', () => {
    it('issues a certificate and returns only the eight public fields', async () => {
      const response = await issue(issuerToken(issuerAId), workerA.id).expect(
        201,
      );

      expect(Object.keys(response.body).sort()).toEqual(
        [
          'number',
          'id',
          'entityId',
          'workerId',
          'type',
          'issuedAt',
          'validUntil',
          'annulledAt',
        ].sort(),
      );
      expect(response.body).toMatchObject({
        entityId: issuerAId,
        workerId: workerA.id,
        type: CertificateType.HeightWork,
        issuedAt: ISSUED_AT,
        validUntil: VALID_UNTIL,
        annulledAt: null,
      });
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(response.text).not.toContain('salt');
      expect(response.text).not.toContain('fingerprint');

      const stored = await dataSource
        .getRepository(Certificate)
        .findOneByOrFail({ id: response.body.id });
      expect(stored.fingerprint).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('answers 401 without a token', async () => {
      await expectError(
        request(app.getHttpServer())
          .post('/certificates')
          .send(validBody(workerA.id)),
        401,
        workerA,
      );
    });

    it('answers 403 to an administrator', async () => {
      await expectError(issue(adminToken(), workerA.id), 403, workerA);
    });

    it('answers 403 issuer-revoked to a revoked issuer', async () => {
      const response = await expectError(
        issue(issuerToken(revokedIssuerId), workerA.id),
        403,
        workerA,
      );

      expect(response.body).toMatchObject({ code: 'issuer-revoked' });
    });

    it('answers 403 when the issuer does not support the certificate type', async () => {
      await expectError(
        issue(issuerToken(unsupportedIssuerId), unsupportedWorker.id),
        403,
        unsupportedWorker,
      );
    });

    it('answers 404 when the worker belongs to another issuer', async () => {
      await expectError(
        issue(issuerToken(issuerAId), workerB.id),
        404,
        workerB,
      );
    });

    it('answers 400 when workerId is malformed', async () => {
      await expectError(
        issue(issuerToken(issuerAId), 'not-a-uuid'),
        400,
        workerA,
      );
    });

    it.each([
      [
        'validUntil equal to issuedAt',
        { issuedAt: '2020-01-02', validUntil: '2020-01-02' },
      ],
      [
        'validUntil before issuedAt',
        { issuedAt: '2020-01-02', validUntil: '2020-01-01' },
      ],
    ])('answers 400 when %s', async (_label, dates) => {
      await expectError(
        issue(issuerToken(issuerAId), workerA.id, dates),
        400,
        workerA,
      );
    });

    it('answers 400 when issuedAt is in the future', async () => {
      await expectError(
        issue(issuerToken(issuerAId), workerA.id, {
          issuedAt: '2099-01-01',
          validUntil: '2100-01-01',
        }),
        400,
        workerA,
      );
    });

    it('answers 400 for an impossible calendar date', async () => {
      await expectError(
        issue(issuerToken(issuerAId), workerA.id, { issuedAt: '2026-02-30' }),
        400,
        workerA,
      );
    });

    it('answers 400 when a date has the wrong format', async () => {
      await expectError(
        issue(issuerToken(issuerAId), workerA.id, { issuedAt: '01-01-2020' }),
        400,
        workerA,
      );
    });

    it('answers 400 when the body contains an extra field', async () => {
      await expectError(
        issue(issuerToken(issuerAId), workerA.id, { unexpected: 'no' }),
        400,
        workerA,
      );
    });

    it('answers 400 when the body is empty', async () => {
      await expectError(
        request(app.getHttpServer())
          .post('/certificates')
          .set('Authorization', issuerToken(issuerAId))
          .send({}),
        400,
        workerA,
      );
    });

    it('answers 409 for a duplicate active certificate', async () => {
      await issue(issuerToken(issuerAId), workerASecond.id).expect(201);

      await expectError(
        issue(issuerToken(issuerAId), workerASecond.id),
        409,
        workerASecond,
      );
    });

    it('allows a new certificate when the previous one was annulled', async () => {
      const annulledWorker = await createIsolatedWorker(issuerAId);
      const original = await issue(
        issuerToken(issuerAId),
        annulledWorker.id,
      ).expect(201);
      await annul(issuerToken(issuerAId), original.body.id).expect(200);

      await issue(issuerToken(issuerAId), annulledWorker.id).expect(201);
    });

    it('allows a new certificate when the previous one has expired', async () => {
      const expiredWorker = await createIsolatedWorker(issuerAId);
      await issue(issuerToken(issuerAId), expiredWorker.id, {
        issuedAt: '2020-01-01',
        validUntil: '2020-01-02',
      }).expect(201);

      await issue(issuerToken(issuerAId), expiredWorker.id).expect(201);
    });

    it('answers exactly one 201 and one 409 for simultaneous duplicate requests', async () => {
      const concurrentWorker = await createIsolatedWorker(issuerAId);
      const results = await Promise.all([
        issue(issuerToken(issuerAId), concurrentWorker.id),
        issue(issuerToken(issuerAId), concurrentWorker.id),
      ]);

      expect(
        results.map((result) => result.status).sort((a, b) => a - b),
      ).toEqual([201, 409]);
      const conflict = results.find((result) => result.status === 409);
      expect(conflict).toBeDefined();
      expectSafeError(conflict!, concurrentWorker);
    });
  });

  describe('GET /certificates', () => {
    it('lists only issuer A certificates ordered by number descending', async () => {
      const firstWorker = await createIsolatedWorker(issuerAId);
      const secondWorker = await createIsolatedWorker(
        issuerAId,
        OTHER_WORKER_NAME,
      );
      const foreignWorker = await createIsolatedWorker(issuerBId);
      await issue(issuerToken(issuerAId), firstWorker.id).expect(201);
      await issue(issuerToken(issuerAId), secondWorker.id).expect(201);
      await issue(issuerToken(issuerBId), foreignWorker.id).expect(201);

      const response = await list(issuerToken(issuerAId)).expect(200);
      const body = response.body as Array<{
        entityId: string;
        workerId: string;
        number: number;
      }>;

      expect(body.length).toBeGreaterThan(0);
      expect(
        body.every((certificate) => certificate.entityId === issuerAId),
      ).toBe(true);
      expect(
        body.some((certificate) => certificate.workerId === foreignWorker.id),
      ).toBe(false);
      const numbers = body.map((certificate) => certificate.number);
      expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
    });
  });

  describe('POST /certificates/:id/annul', () => {
    it('annuls an owned certificate and keeps its annulledAt unchanged on a second attempt', async () => {
      const annulWorker = await createIsolatedWorker(issuerAId);
      const issued = await issue(issuerToken(issuerAId), annulWorker.id).expect(
        201,
      );
      const annulled = await annul(
        issuerToken(issuerAId),
        issued.body.id,
      ).expect(200);

      expect(annulled.body.annulledAt).toEqual(expect.any(String));
      const firstAnnulledAt = annulled.body.annulledAt as string;
      const conflict = await expectError(
        annul(issuerToken(issuerAId), issued.body.id),
        409,
        annulWorker,
      );
      expect(conflict.body.annulledAt).toBeUndefined();

      const stored = await dataSource
        .getRepository(Certificate)
        .findOneByOrFail({ id: issued.body.id });
      expect(stored.annulledAt?.toISOString()).toBe(firstAnnulledAt);
    });

    it('answers the same 404 for another issuer certificate and a missing certificate', async () => {
      const foreign = await issue(issuerToken(issuerBId), workerB.id).expect(
        201,
      );
      const foreignResponse = await expectError(
        annul(issuerToken(issuerAId), foreign.body.id),
        404,
        workerB,
      );
      const missingResponse = await expectError(
        annul(issuerToken(issuerAId), '00000000-0000-4000-8000-000000000000'),
        404,
        workerA,
      );

      expect(foreignResponse.body).toEqual(missingResponse.body);
    });

    it('answers 400 when the certificate id is not a UUID', async () => {
      await expectError(
        annul(issuerToken(issuerAId), 'not-a-uuid'),
        400,
        workerA,
      );
    });
  });
});
