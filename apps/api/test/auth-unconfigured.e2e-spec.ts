import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Auth without Clerk keys (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Empty, not deleted: ConfigModule refills a deleted key from apps/api/.env.
    process.env.CLERK_SECRET_KEY = '';
    process.env.CLERK_PUBLISHABLE_KEY = '';
    process.env.CLERK_JWT_KEY = '';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('answers 503 on a protected route', async () => {
    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer some.opaque.token')
      .expect(503);

    expect(response.body).toEqual({
      statusCode: 503,
      message: 'El servicio no está disponible.',
      error: 'Service Unavailable',
    });
  });

  it('keeps GET /health public', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
