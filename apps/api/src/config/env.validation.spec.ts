import { validateEnv } from './env.validation.js';

const baseEnv = { DATABASE_URL: 'postgres://localhost:5432/db' };

const productionEnv = {
  ...baseEnv,
  NODE_ENV: 'production',
  CLERK_SECRET_KEY: 'secret-placeholder',
  CLERK_PUBLISHABLE_KEY: 'publishable-placeholder',
  CORS_ORIGIN: 'https://app.example.com',
};

const without = (env: Record<string, unknown>, key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(env).filter(([name]) => name !== key));

describe('validateEnv Clerk and CORS settings', () => {
  it.each(['test', 'development'])('accepts missing Clerk keys and CORS_ORIGIN outside production (%s)', (nodeEnv) => {
    expect(() => validateEnv({ ...baseEnv, NODE_ENV: nodeEnv })).not.toThrow();
  });

  it('rejects a missing CLERK_SECRET_KEY in production', () => {
    expect(() => validateEnv(without(productionEnv, 'CLERK_SECRET_KEY'))).toThrow('Variables de entorno inválidas');
    expect(() => validateEnv(without(productionEnv, 'CLERK_SECRET_KEY'))).toThrow('CLERK_SECRET_KEY');
  });

  it('rejects a missing CLERK_PUBLISHABLE_KEY in production', () => {
    expect(() => validateEnv(without(productionEnv, 'CLERK_PUBLISHABLE_KEY'))).toThrow('Variables de entorno inválidas');
    expect(() => validateEnv(without(productionEnv, 'CLERK_PUBLISHABLE_KEY'))).toThrow('CLERK_PUBLISHABLE_KEY');
  });

  it('rejects a missing CORS_ORIGIN in production', () => {
    expect(() => validateEnv(without(productionEnv, 'CORS_ORIGIN'))).toThrow('Variables de entorno inválidas');
    expect(() => validateEnv(without(productionEnv, 'CORS_ORIGIN'))).toThrow('CORS_ORIGIN');
  });

  it('accepts every key in production', () => {
    expect(() => validateEnv({ ...productionEnv, CLERK_JWT_KEY: 'jwt-placeholder' })).not.toThrow();
  });

  it('treats CLERK_JWT_KEY as optional in production', () => {
    expect(() => validateEnv(productionEnv)).not.toThrow();
  });
});
