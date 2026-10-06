import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthController } from './health.controller.js';

const buildController = (query: () => Promise<unknown>): HealthController =>
  new HealthController({ query } as unknown as DataSource);

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    const controller = buildController(() => Promise.resolve([{ '?column?': 1 }]));

    await expect(controller.check()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('throws 503 without leaking internal details when the database fails', async () => {
    const controller = buildController(() => Promise.reject(new Error('password authentication failed for user "x"')));

    const result = controller.check();

    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(result).rejects.toThrow('El servicio no está disponible.');
    await expect(result).rejects.not.toThrow(/password/);
  });
});
