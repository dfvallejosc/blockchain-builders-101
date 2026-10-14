// uuidExtension 'pgcrypto' makes TypeORM use gen_random_uuid(), which is built into
// PostgreSQL 13+. installExtensions false stops it from running CREATE EXTENSION
// on every connection, which would need extra privileges on a managed database.
export const postgresConnection = (url: string, ssl: boolean) => ({
  type: 'postgres' as const,
  url,
  ssl: ssl ? { rejectUnauthorized: false } : false,
  uuidExtension: 'pgcrypto' as const,
  installExtensions: false,
  synchronize: false,
});
