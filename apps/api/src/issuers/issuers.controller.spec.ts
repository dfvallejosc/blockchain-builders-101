import { HTTP_CODE_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ParseUUIDPipe } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../auth/decorators.js';
import type { CreateIssuerDto } from './dto/create-issuer.dto.js';
import type { IssuerResponse } from './issuer-response.js';
import { IssuersController } from './issuers.controller.js';
import { IssuersService } from './issuers.service.js';

const response = { id: 'issuer-1', name: 'Salud Ocupacional del Valle' } as IssuerResponse;

describe('IssuersController', () => {
  it('passes the body to the service and returns its response', async () => {
    const body = { name: 'Salud Ocupacional del Valle' } as CreateIssuerDto;
    const register = vi.fn<IssuersService['register']>().mockResolvedValue(response);
    const controller = new IssuersController({ register } as unknown as IssuersService);

    await expect(controller.create(body)).resolves.toBe(response);
    expect(register).toHaveBeenCalledWith(body);
  });

  it('lists the issuers through the service', async () => {
    const list = vi.fn<IssuersService['list']>().mockResolvedValue([response]);
    const controller = new IssuersController({ list } as unknown as IssuersService);

    await expect(controller.list()).resolves.toEqual([response]);
  });

  it('gets one issuer by id through the service', async () => {
    const get = vi.fn<IssuersService['get']>().mockResolvedValue(response);
    const controller = new IssuersController({ get } as unknown as IssuersService);

    await expect(controller.get('issuer-1')).resolves.toBe(response);
    expect(get).toHaveBeenCalledWith('issuer-1');
  });

  it('revokes one issuer by id through the service', async () => {
    const revoke = vi.fn<IssuersService['revoke']>().mockResolvedValue(response);
    const controller = new IssuersController({ revoke } as unknown as IssuersService);

    await expect(controller.revoke('issuer-1')).resolves.toBe(response);
    expect(revoke).toHaveBeenCalledWith('issuer-1');
  });

  it('requires the admin role at the controller level', () => {
    expect(Reflect.getMetadata(ROLES_KEY, IssuersController)).toEqual(['admin']);
  });

  it('answers 201 on register and 200 on revoke', () => {
    const handler = (name: 'create' | 'revoke'): unknown =>
      Object.getOwnPropertyDescriptor(IssuersController.prototype, name)?.value;

    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler('create') as object)).toBe(201);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler('revoke') as object)).toBe(200);
  });

  it.each(['get', 'revoke'] as const)('answers 404 instead of 400 for an id that is not a uuid in %s', (method) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, IssuersController, method) as Record<
      string,
      { pipes: unknown[] }
    >;
    const pipes = Object.values(args).flatMap((arg) => arg.pipes);

    expect(pipes).toHaveLength(1);
    expect(pipes[0]).toBeInstanceOf(ParseUUIDPipe);
  });
});
