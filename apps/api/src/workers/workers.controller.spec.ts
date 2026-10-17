import { describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../auth/decorators.js';
import { Issuer } from '../issuers/issuer.entity.js';
import { DocumentType } from './document-type.js';
import type { CreateWorkerDto } from './dto/create-worker.dto.js';
import type { ListWorkersQueryDto } from './dto/list-workers-query.dto.js';
import type { WorkerResponse } from './worker-response.js';
import { WorkersController } from './workers.controller.js';
import { WorkersService } from './workers.service.js';

const issuer = { id: 'issuer-1' } as Issuer;
const response: WorkerResponse = {
  id: 'worker-1',
  entityId: issuer.id,
  fullName: 'Ana María Pérez',
  documentType: DocumentType.Cc,
  documentNumber: 'AB12345',
  registeredAt: '2026-10-17T10:00:00.000Z',
  consentedAt: '2026-10-17T09:59:00.000Z',
};

describe('WorkersController', () => {
  it('passes the issuer and body to the service and returns its response', async () => {
    const input: CreateWorkerDto = {
      fullName: 'Ana María Pérez',
      documentType: DocumentType.Cc,
      documentNumber: 'AB12345',
      dataConsent: true,
    };
    const register = vi.fn<WorkersService['register']>().mockResolvedValue(response);
    const controller = new WorkersController({ register } as unknown as WorkersService);

    await expect(controller.create(issuer, input)).resolves.toBe(response);
    expect(register).toHaveBeenCalledWith(issuer, input);
  });

  it('passes the issuer and query to the service and returns its response', async () => {
    const query: ListWorkersQueryDto = { documentNumber: 'AB1' };
    const list = vi.fn<WorkersService['list']>().mockResolvedValue([response]);
    const controller = new WorkersController({ list } as unknown as WorkersService);

    await expect(controller.list(issuer, query)).resolves.toEqual([response]);
    expect(list).toHaveBeenCalledWith(issuer, query);
  });

  it('requires the issuer role at the controller level', () => {
    expect(Reflect.getMetadata(ROLES_KEY, WorkersController)).toEqual(['issuer']);
  });
});
