import { RegistryDriver, validateEnv } from './env.validation.js';

const baseEnv = { DATABASE_URL: 'postgres://localhost:5432/db' };

const productionEnv = {
  ...baseEnv,
  NODE_ENV: 'production',
  CLERK_SECRET_KEY: 'secret-placeholder',
  CLERK_PUBLISHABLE_KEY: 'publishable-placeholder',
  CORS_ORIGIN: 'https://app.example.com',
  WEB_APP_URL: 'https://app.example.com',
};

const without = (
  env: Record<string, unknown>,
  key: string,
): Record<string, unknown> =>
  Object.fromEntries(Object.entries(env).filter(([name]) => name !== key));

describe('validateEnv Clerk and CORS settings', () => {
  it.each(['test', 'development'])(
    'accepts missing Clerk keys and CORS_ORIGIN outside production (%s)',
    (nodeEnv) => {
      expect(() =>
        validateEnv({ ...baseEnv, NODE_ENV: nodeEnv }),
      ).not.toThrow();
    },
  );

  it('rejects a missing CLERK_SECRET_KEY in production', () => {
    expect(() =>
      validateEnv(without(productionEnv, 'CLERK_SECRET_KEY')),
    ).toThrow('Variables de entorno inválidas');
    expect(() =>
      validateEnv(without(productionEnv, 'CLERK_SECRET_KEY')),
    ).toThrow('CLERK_SECRET_KEY');
  });

  it('rejects a missing CLERK_PUBLISHABLE_KEY in production', () => {
    expect(() =>
      validateEnv(without(productionEnv, 'CLERK_PUBLISHABLE_KEY')),
    ).toThrow('Variables de entorno inválidas');
    expect(() =>
      validateEnv(without(productionEnv, 'CLERK_PUBLISHABLE_KEY')),
    ).toThrow('CLERK_PUBLISHABLE_KEY');
  });

  it('rejects a missing CORS_ORIGIN in production', () => {
    expect(() => validateEnv(without(productionEnv, 'CORS_ORIGIN'))).toThrow(
      'Variables de entorno inválidas',
    );
    expect(() => validateEnv(without(productionEnv, 'CORS_ORIGIN'))).toThrow(
      'CORS_ORIGIN',
    );
  });

  it('rejects a missing WEB_APP_URL in production', () => {
    expect(() => validateEnv(without(productionEnv, 'WEB_APP_URL'))).toThrow('Variables de entorno inválidas');
    expect(() => validateEnv(without(productionEnv, 'WEB_APP_URL'))).toThrow('WEB_APP_URL');
  });

  it('rejects a WEB_APP_URL that is not a URL in production', () => {
    expect(() => validateEnv({ ...productionEnv, WEB_APP_URL: 'not-a-url' })).toThrow('WEB_APP_URL');
  });

  it.each(['test', 'development'])('rejects a malformed WEB_APP_URL outside production (%s)', (nodeEnv) => {
    expect(() => validateEnv({ ...baseEnv, NODE_ENV: nodeEnv, WEB_APP_URL: 'localhost:5173' })).toThrow('WEB_APP_URL');
  });

  it('treats an empty WEB_APP_URL as missing outside production', () => {
    expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'development', WEB_APP_URL: '' })).not.toThrow();
  });

  it('accepts WEB_APP_URL in production', () => {
    expect(() => validateEnv(productionEnv)).not.toThrow();
  });

  it('does not require WEB_APP_URL outside production', () => {
    expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'test' })).not.toThrow();
  });

  it('accepts every key in production', () => {
    expect(() =>
      validateEnv({ ...productionEnv, CLERK_JWT_KEY: 'jwt-placeholder' }),
    ).not.toThrow();
  });

  it('treats CLERK_JWT_KEY as optional in production', () => {
    expect(() => validateEnv(productionEnv)).not.toThrow();
  });
});

const stellarEnv = {
  ...baseEnv,
  REGISTRY_DRIVER: RegistryDriver.Stellar,
  STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
  STELLAR_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  STELLAR_CONTRACT_ID:
    'CAPRNQ7LVZWH47D4ZBDKY2OUICZ5FULE223IRWTOJR3HLR6ZEBAD3GPD',
  STELLAR_MASTER_SECRET: 'master-secret-placeholder-with-at-least-32-chars',
  STELLAR_ADMIN_SECRET:
    'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  STELLAR_SPONSOR_SECRET:
    'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
};

describe('validateEnv Stellar registry settings', () => {
  it('defaults to the PostgreSQL registry without Stellar variables', () => {
    expect(validateEnv(baseEnv).REGISTRY_DRIVER).toBe(RegistryDriver.Postgres);
  });

  it.each([
    'STELLAR_RPC_URL',
    'STELLAR_NETWORK_PASSPHRASE',
    'STELLAR_CONTRACT_ID',
    'STELLAR_MASTER_SECRET',
    'STELLAR_ADMIN_SECRET',
    'STELLAR_SPONSOR_SECRET',
  ])('rejects missing %s for the Stellar registry', (key) => {
    expect(() => validateEnv(without(stellarEnv, key))).toThrow(key);
  });

  it.each([
    ['STELLAR_RPC_URL', 'ftp://stellar-testnet.stellar.org'],
    ['STELLAR_NETWORK_PASSPHRASE', ''],
    ['STELLAR_CONTRACT_ID', 'CINVALID'],
    ['STELLAR_MASTER_SECRET', 'too-short'],
    ['STELLAR_ADMIN_SECRET', 'SINVALID'],
    ['STELLAR_SPONSOR_SECRET', 'SINVALID'],
  ])('rejects malformed %s for the Stellar registry', (key, value) => {
    expect(() => validateEnv({ ...stellarEnv, [key]: value })).toThrow(key);
  });

  it('rejects an invalid registry driver', () => {
    expect(() =>
      validateEnv({ ...baseEnv, REGISTRY_DRIVER: 'invalid' }),
    ).toThrow('REGISTRY_DRIVER');
  });
});

describe('validateEnv empty REGISTRY_DRIVER', () => {
  it('treats an empty value as postgres, so a copied .env.example boots', () => {
    const env = validateEnv({ ...baseEnv, REGISTRY_DRIVER: '' });

    expect(env.REGISTRY_DRIVER).toBe(RegistryDriver.Postgres);
  });

  it('still requires the Stellar variables when the driver is stellar and they are empty', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        REGISTRY_DRIVER: 'stellar',
        STELLAR_RPC_URL: '',
        STELLAR_NETWORK_PASSPHRASE: '',
        STELLAR_CONTRACT_ID: '',
        STELLAR_MASTER_SECRET: '',
        STELLAR_ADMIN_SECRET: '',
        STELLAR_SPONSOR_SECRET: '',
      }),
    ).toThrow('STELLAR_RPC_URL');
  });
});
