import { postgresConnection } from './connection.js';

describe('postgresConnection', () => {
  it('keeps the schema out of TypeORM and generates uuids without installing extensions', () => {
    const options = postgresConnection('postgres://localhost:5432/example', false);

    expect(options).toMatchObject({
      type: 'postgres',
      url: 'postgres://localhost:5432/example',
      ssl: false,
      uuidExtension: 'pgcrypto',
      installExtensions: false,
      synchronize: false,
    });
  });

  it('turns SSL on without verifying the certificate when asked', () => {
    expect(postgresConnection('postgres://localhost:5432/example', true).ssl).toEqual({ rejectUnauthorized: false });
  });
});
