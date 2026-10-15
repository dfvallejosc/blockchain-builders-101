import { dataSource } from '../src/database/data-source.js';

export async function setup(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
