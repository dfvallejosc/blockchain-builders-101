import { dataSource } from '../src/database/data-source.js';

export default async function setupDatabase(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
