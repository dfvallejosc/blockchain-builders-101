import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { Certificate } from '../certificates/certificate.entity.js';
import { Issuer } from '../issuers/issuer.entity.js';
import { Worker } from '../workers/worker.entity.js';
import { postgresConnection } from './connection.js';
import { migrations } from './migrations/index.js';

export const createDataSource = (url: string, ssl: boolean): DataSource =>
  new DataSource({
    ...postgresConnection(url, ssl),
    entities: [Issuer, Worker, Certificate],
    migrations,
  });

// Already defined variables win over the file, so staging and CI use their own values.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Falta DATABASE_URL. Defínela como variable de entorno o en apps/api/.env.');
}

// The TypeORM CLI reads this export from the compiled file in dist/.
export const dataSource = createDataSource(databaseUrl, process.env.DATABASE_SSL === 'true');
