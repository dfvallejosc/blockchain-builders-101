import { randomBytes, randomUUID } from 'node:crypto';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Roles } from '../src/auth/decorators.js';
import { CertificateType } from '../src/certificates/certificate-type.js';
import { Issuer } from '../src/issuers/issuer.entity.js';
import { IssuerType } from '../src/issuers/issuer-type.js';
import { createTokenSigner } from './support/token-signer.js';

const ALLOWED_ORIGIN = 'http://localhost:5173';
const ISSUER_EMAIL = 'contacto-auth-e2e@example.com';
const ISSUER_PHONE = '3009998877';

// Throwaway controller to exercise the role checks of the global guard.
@Controller('probe')
class ProbeController {
  @Get('admin')
  @Roles('admin')
  admin(): { ok: true } {
    return { ok: true };
  }

  @Get('issuer')
  @Roles('issuer')
  issuer(): { ok: true } {
    return { ok: true };
  }

  @Get('any')
  any(): { ok: true } {
    return { ok: true };
  }
}

describe('Auth (e2e)', () => {
  const signer = createTokenSigner();
  const runId = randomBytes(4).toString('hex');
  let app: INestApplication;
  let dataSource: DataSource;
  let activeId: string;
  let revokedId: string;
  let deletedId: string;
  let activeName: string;
  const activeNit = `auth-e2e-${runId}-active`;

  const insertedIds = (): string[] => [activeId, revokedId, deletedId].filter(Boolean);

  const newIssuer = (label: string, overrides: Partial<Issuer> = {}): Partial<Issuer> => ({
    name: `Entidad ${label} ${runId}`,
    type: IssuerType.Clinic,
    city: 'Medellín',
    nit: `auth-e2e-${runId}-${label}`,
    ministryRegistration: `REG-${runId}-${label}`,
    contactName: 'Contacto de prueba',
    email: ISSUER_EMAIL,
    phone: ISSUER_PHONE,
    certificateTypes: [CertificateType.HeightWork],
    revokedAt: null,
    ...overrides,
  });

  const tokenFor = (metadata?: Record<string, unknown>, claims: Record<string, unknown> = {}): string =>
    signer.sign({ azp: ALLOWED_ORIGIN, ...(metadata ? { metadata } : {}), ...claims });

  const bearer = (token: string): string => `Bearer ${token}`;

  const issuerToken = (issuerId: string): string => tokenFor({ role: 'issuer', issuerId });
  const adminToken = (): string => tokenFor({ role: 'admin' });

  beforeAll(async () => {
    process.env.CLERK_SECRET_KEY = ['sk', 'test', randomBytes(16).toString('hex')].join('_');
    process.env.CLERK_PUBLISHABLE_KEY = ['pk', 'test', randomBytes(16).toString('hex')].join('_');
    process.env.CLERK_JWT_KEY = signer.publicKeyPem;
    process.env.CORS_ORIGIN = ALLOWED_ORIGIN;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();

    dataSource = app.get(DataSource);
    const issuers = dataSource.getRepository(Issuer);
    const active = await issuers.save(issuers.create(newIssuer('active')));
    const revoked = await issuers.save(issuers.create(newIssuer('revoked', { revokedAt: new Date() })));
    const deleted = await issuers.save(issuers.create(newIssuer('deleted', { deletedAt: new Date() })));
    activeId = active.id;
    activeName = active.name;
    revokedId = revoked.id;
    deletedId = deleted.id;
  });

  afterAll(async () => {
    const ids = insertedIds();
    if (dataSource?.isInitialized && ids.length > 0) {
      await dataSource.getRepository(Issuer).delete(ids);
    }
    await app?.close();
  });

  describe('public routes', () => {
    it('GET / answers without a token', async () => {
      await request(app.getHttpServer()).get('/').expect(200);
    });

    it('GET /health answers without a token', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
    });
  });

  describe('GET /me authentication', () => {
    it('answers 401 without a token', async () => {
      await request(app.getHttpServer()).get('/me').expect(401);
    });

    it('answers 401 with a garbage token', async () => {
      await request(app.getHttpServer()).get('/me').set('Authorization', bearer('not.a.token')).expect(401);
    });

    it('answers 401 with an expired token', async () => {
      const expired = signer.sign(
        { azp: ALLOWED_ORIGIN, metadata: { role: 'admin' } },
        { expiresInSeconds: -600 },
      );

      await request(app.getHttpServer()).get('/me').set('Authorization', bearer(expired)).expect(401);
    });

    it('answers 401 with a scheme that is not Bearer', async () => {
      await request(app.getHttpServer()).get('/me').set('Authorization', 'Basic abc').expect(401);
    });

    it('answers 401 when azp is not the allowed origin', async () => {
      const token = tokenFor({ role: 'admin' }, { azp: 'https://evil.example.com' });

      await request(app.getHttpServer()).get('/me').set('Authorization', bearer(token)).expect(401);
    });
  });

  describe('GET /me session', () => {
    it('returns the admin role without an issuer', async () => {
      const response = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', bearer(adminToken()))
        .expect(200);

      expect(response.body).toEqual({ role: 'admin', issuer: null });
    });

    it('returns the issuer profile fields and no contact data', async () => {
      const response = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', bearer(issuerToken(activeId)))
        .expect(200);

      expect(response.body).toEqual({
        role: 'issuer',
        issuer: {
          id: activeId,
          name: activeName,
          certificateTypes: [CertificateType.HeightWork],
          nit: activeNit,
          city: 'Medellín',
        },
      });
      const body = JSON.stringify(response.body);
      expect(body).not.toContain(ISSUER_EMAIL);
      expect(body).not.toContain(ISSUER_PHONE);
      expect(body).not.toContain('Contacto de prueba');
      expect(body).not.toContain(`REG-${runId}-active`);
    });

    it('answers 403 issuer-revoked for a revoked issuer', async () => {
      const response = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', bearer(issuerToken(revokedId)))
        .expect(403);

      expect(response.body).toMatchObject({ code: 'issuer-revoked' });
    });
  });

  describe('issuer lookup failures', () => {
    it.each([
      ['a soft-deleted issuer', () => deletedId],
      ['an unknown issuer id', () => randomUUID()],
      ['an issuerId that is not a UUID', () => 'not-a-uuid'],
    ])('answers 403 for %s without leaking database details', async (_label, issuerId) => {
      const response = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', bearer(issuerToken(issuerId())))
        .expect(403);

      expect(JSON.stringify(response.body)).not.toContain('invalid input syntax');
    });
  });

  describe('role claim', () => {
    it('answers 403 when the token has no role', async () => {
      await request(app.getHttpServer()).get('/me').set('Authorization', bearer(tokenFor())).expect(403);
    });

    it('answers 403 when the role is not known', async () => {
      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', bearer(tokenFor({ role: 'superadmin' })))
        .expect(403);
    });
  });

  describe('@Roles', () => {
    it('protects an admin route', async () => {
      await request(app.getHttpServer()).get('/probe/admin').expect(401);
      await request(app.getHttpServer())
        .get('/probe/admin')
        .set('Authorization', bearer(issuerToken(activeId)))
        .expect(403);
      await request(app.getHttpServer())
        .get('/probe/admin')
        .set('Authorization', bearer(adminToken()))
        .expect(200);
    });

    it('protects an issuer route from an admin', async () => {
      await request(app.getHttpServer())
        .get('/probe/issuer')
        .set('Authorization', bearer(adminToken()))
        .expect(403);
      await request(app.getHttpServer())
        .get('/probe/issuer')
        .set('Authorization', bearer(issuerToken(activeId)))
        .expect(200);
    });

    it('lets both roles into a route without @Roles', async () => {
      await request(app.getHttpServer()).get('/probe/any').expect(401);
      await request(app.getHttpServer())
        .get('/probe/any')
        .set('Authorization', bearer(adminToken()))
        .expect(200);
      await request(app.getHttpServer())
        .get('/probe/any')
        .set('Authorization', bearer(issuerToken(activeId)))
        .expect(200);
    });
  });
});
