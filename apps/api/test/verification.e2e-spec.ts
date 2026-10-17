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
const ENTITY_NAME_PREFIX = 'Entidad verificación';
const UNKNOWN = { status: 'invalid', reason: 'unknown-certificate' };
const UNKNOWN_ID = '9b2f6c1e-0000-4000-8000-000000000000';

describe('Verification (e2e)', () => {
  const signer = createTokenSigner();
  const runId = randomBytes(4).toString('hex').toUpperCase();
  let app: INestApplication;
  let dataSource: DataSource;
  let issuerId: string;
  let workerId: string;
  let sequence = 0;

  const issuerToken = (): string =>
    `Bearer ${signer.sign({ azp: ALLOWED_ORIGIN, metadata: { role: 'issuer', issuerId } })}`;

  const verify = (id: string): request.Test => request(app.getHttpServer()).get(`/verification/${id}`);

  const issue = async (issuedAt: string, validUntil: string, type = CertificateType.HeightWork): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/certificates')
      .set('Authorization', issuerToken())
      .send({ workerId, type, issuedAt, validUntil })
      .expect(201);
    return response.body.id as string;
  };

  // A fresh worker per certificate: the API allows one active certificate per worker and type.
  const issueForNewWorker = async (issuedAt: string, validUntil: string): Promise<string> => {
    sequence += 1;
    const workers = dataSource.getRepository(Worker);
    const worker = await workers.save(
      workers.create({
        issuerId,
        fullName: WORKER_NAME,
        documentType: 'cc',
        documentNumber: `${runId}${String(sequence).padStart(3, '0')}`,
        consentedAt: new Date(),
      }),
    );
    workerId = worker.id;
    return issue(issuedAt, validUntil);
  };

  const expectNoSecrets = (response: SupertestResponse): void => {
    expect(response.text).not.toMatch(/salt|fingerprint|issuerId|workerId|resultado|restricci|diagn/i);
    expect(response.text).not.toMatch(/\bstack\b|QueryFailedError|at\s+\S+\s+\(/i);
    expect(response.text).not.toContain(issuerId);
    expect(response.text).not.toContain(workerId);
  };

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
    issuerId = (
      await issuers.save(
        issuers.create({
          name: `${ENTITY_NAME_PREFIX} ${runId}`,
          type: IssuerType.Clinic,
          city: 'Medellín',
          nit: `verification-e2e-${runId}`,
          ministryRegistration: `REG-${runId}`,
          contactName: 'Contacto privado',
          email: `contacto-privado-${runId.toLowerCase()}@example.com`,
          phone: '3009998877',
          certificateTypes: [CertificateType.HeightWork],
          revokedAt: null,
        }),
      )
    ).id;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized && issuerId) {
      // Certificates and workers reference the issuer with RESTRICT, so they go first.
      await dataSource.getRepository(Certificate).delete({ issuerId });
      await dataSource.getRepository(Worker).delete({ issuerId });
      await dataSource.getRepository(Issuer).delete(issuerId);
    }
    await app?.close();
  });

  it('verifies a valid certificate without any session and answers the front VerificationResult', async () => {
    const id = await issueForNewWorker('2026-01-01', '2099-12-31');

    const response = await verify(id).expect(200);

    expect(response.body).toEqual({
      status: 'valid',
      certificate: { id, type: 'height-work', issuedAt: '2026-01-01', validUntil: '2099-12-31' },
      worker: { fullName: WORKER_NAME, documentType: 'cc', documentNumber: `${runId}${String(sequence).padStart(3, '0')}` },
      entity: { name: `${ENTITY_NAME_PREFIX} ${runId}` },
    });
    expectNoSecrets(response);
    expect(response.text).not.toContain('contacto-privado');
  });

  it('answers well inside the 10 seconds the product promises, and forbids caching the answer', async () => {
    const id = await issueForNewWorker('2026-01-01', '2099-12-31');
    const started = Date.now();

    const response = await verify(id).expect(200);

    expect(Date.now() - started).toBeLessThan(5000);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('ignores an invalid bearer token, since the route is public', async () => {
    const id = await issueForNewWorker('2026-01-01', '2099-12-31');

    const response = await verify(id).set('Authorization', 'Bearer not-a-real-token').expect(200);

    expect(response.body.status).toBe('valid');
  });

  it('answers expired for a certificate past its validity', async () => {
    const id = await issueForNewWorker('2020-01-01', '2020-12-31');

    const response = await verify(id).expect(200);

    expect(response.body).toMatchObject({ status: 'expired', certificate: { id, validUntil: '2020-12-31' } });
  });

  it('answers annulled after the issuer annuls it', async () => {
    const id = await issueForNewWorker('2026-01-01', '2099-12-31');
    await request(app.getHttpServer()).post(`/certificates/${id}/annul`).set('Authorization', issuerToken()).expect(200);

    const response = await verify(id).expect(200);

    expect(response.body).toMatchObject({ status: 'annulled', certificate: { id } });
  });

  it('answers entity-revoked with only the entity name once the issuer is revoked, and recovers if reinstated', async () => {
    const id = await issueForNewWorker('2026-01-01', '2099-12-31');
    const issuers = dataSource.getRepository(Issuer);
    await issuers.update({ id: issuerId }, { revokedAt: new Date() });

    try {
      const response = await verify(id).expect(200);

      expect(response.body).toEqual({
        status: 'invalid',
        reason: 'entity-revoked',
        entity: { name: `${ENTITY_NAME_PREFIX} ${runId}` },
      });
      expectNoSecrets(response);
    } finally {
      await issuers.update({ id: issuerId }, { revokedAt: null });
    }
    await verify(id).expect(200).expect((res) => expect(res.body.status).toBe('valid'));
  });

  describe('not valid without clues', () => {
    it('answers unknown-certificate when the stored validity was altered after issuing', async () => {
      const id = await issueForNewWorker('2026-01-01', '2026-12-31');
      await dataSource.getRepository(Certificate).update({ id }, { validUntil: '2099-12-31' });

      const response = await verify(id).expect(200);

      expect(response.body).toEqual(UNKNOWN);
    });

    it('answers unknown-certificate when the worker document was altered after issuing', async () => {
      const id = await issueForNewWorker('2026-01-01', '2099-12-31');
      await dataSource.getRepository(Worker).update({ id: workerId }, { documentNumber: `X${runId}` });

      const response = await verify(id).expect(200);

      expect(response.body).toEqual(UNKNOWN);
    });

    it('answers exactly the same for an unknown id, a malformed id and an altered certificate', async () => {
      const altered = await issueForNewWorker('2026-01-01', '2026-12-31');
      await dataSource.getRepository(Certificate).update({ id: altered }, { validUntil: '2099-12-31' });

      const responses = await Promise.all(
        [
          UNKNOWN_ID,
          'not-a-uuid',
          '42',
          'HAB-2026-000042',
          "'%20OR%201=1--",
          'a'.repeat(2000),
          altered,
        ].map((id) => verify(id)),
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body).toEqual(UNKNOWN);
        expect(response.text).toBe(responses[0]?.text);
        expect(response.headers['content-length']).toBe(responses[0]?.headers['content-length']);
        expectNoSecrets(response);
      }
    });
  });
});
