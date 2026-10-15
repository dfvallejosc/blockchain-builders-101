import { Body, Controller, Get, Post, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { configureApp } from '../src/app.setup.js';
import { appConfig } from '../src/config/app.config.js';

class ProbeDto {
  @IsString()
  name!: string;
}

// Throwaway controller: the API has no DTO endpoints yet, so this is the only
// way to exercise the global pipe and the default error handling.
@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() dto: ProbeDto): { name: string } {
    return { name: dto.name };
  }

  @Get('boom')
  boom(): never {
    throw new Error('relation "certificate" does not exist (internal detail)');
  }
}

describe('configureApp (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [appConfig] })],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a body that matches the DTO', async () => {
    const response = await request(app.getHttpServer()).post('/probe').send({ name: 'Ana' }).expect(201);

    expect(response.body).toEqual({ name: 'Ana' });
  });

  it('rejects a body field the DTO does not allow', async () => {
    const response = await request(app.getHttpServer()).post('/probe').send({ name: 'Ana', extra: 'no' }).expect(400);

    expect(JSON.stringify(response.body)).toContain('property extra should not exist');
  });

  it('answers an internal error with a generic 500 and no details', async () => {
    const response = await request(app.getHttpServer()).get('/probe/boom').expect(500);

    expect(response.body).toEqual({ statusCode: 500, message: 'Internal server error' });
    expect(JSON.stringify(response.body)).not.toContain('certificate');
  });
});
