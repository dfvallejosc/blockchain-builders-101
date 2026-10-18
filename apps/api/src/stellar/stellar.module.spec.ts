import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { stellarConfig } from '../config/stellar.config.js';
import { STELLAR_CLIENT } from './stellar-client.js';
import { StellarModule } from './stellar.module.js';

describe('StellarModule', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not construct a Stellar client for the default Postgres driver', async () => {
    vi.stubEnv('REGISTRY_DRIVER', 'postgres');
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/habilitapp');

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [stellarConfig],
        }),
        StellarModule,
      ],
    }).compile();

    expect(moduleRef.get(STELLAR_CLIENT, { strict: false })).toBeUndefined();
  });
});
