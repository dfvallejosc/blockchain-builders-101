import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL as string,
  ssl: process.env.DATABASE_SSL === 'true',
}));
