import {
  type ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Repository } from 'typeorm';
import type { Issuer } from '../issuers/issuer.entity.js';
import { AuthGuard } from './auth.guard.js';
import { Public, Roles } from './decorators.js';
import type { AuthenticatedRequest } from './session.js';
import { InvalidTokenError, type TokenVerifier, type VerifiedToken } from './token-verifier.js';

const ISSUER_ID = '3f0c1a52-8d0b-4c1e-9a3e-0f6f3f1c2b7a';
const SECRET_TOKEN = 'secret-token-value';

class TestController {
  @Public()
  publicRoute(): void {}

  plainRoute(): void {}

  @Roles('admin')
  adminRoute(): void {}

  @Roles('issuer')
  issuerRoute(): void {}
}

type Handler = 'publicRoute' | 'plainRoute' | 'adminRoute' | 'issuerRoute';

interface Setup {
  guard: AuthGuard;
  verify: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  request: AuthenticatedRequest;
  context: ExecutionContext;
}

function setup(handler: Handler, authorization: string | undefined): Setup {
  const verify = vi.fn();
  const findOne = vi.fn();
  const request = { headers: { authorization } } as unknown as AuthenticatedRequest;
  const context = {
    getHandler: () => TestController.prototype[handler],
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const guard = new AuthGuard(
    new Reflector(),
    { verify } as unknown as TokenVerifier,
    { findOne } as unknown as Repository<Issuer>,
  );
  return { guard, verify, findOne, request, context };
}

function bearer(token = SECRET_TOKEN): string {
  return `Bearer ${token}`;
}

function issuerToken(overrides: Partial<VerifiedToken> = {}): VerifiedToken {
  return { userId: 'user-1', role: 'issuer', issuerId: ISSUER_ID, ...overrides };
}

function activeIssuer(): Issuer {
  return { id: ISSUER_ID, revokedAt: null } as Issuer;
}

function revokedIssuer(): Issuer {
  return { id: ISSUER_ID, revokedAt: new Date('2026-01-01T00:00:00Z') } as Issuer;
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the guard to reject');
}

describe('AuthGuard', () => {
  it('lets a public route through without calling the verifier', async () => {
    const { guard, verify, context } = setup('publicRoute', undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects a request without Authorization with 401', async () => {
    const { guard, verify, context } = setup('plainRoute', undefined);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it.each(['Basic abc', 'Bearer', 'Bearer ', ''])(
    'rejects a malformed Authorization header with 401 (%j)',
    async (header) => {
      const { guard, verify, context } = setup('plainRoute', header);

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(verify).not.toHaveBeenCalled();
    },
  );

  it('accepts the Bearer scheme in any letter case', async () => {
    const { guard, verify, context } = setup('plainRoute', `bEaReR ${SECRET_TOKEN}`);
    verify.mockResolvedValue({ userId: 'user-1', role: 'admin', issuerId: undefined });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith(SECRET_TOKEN);
  });

  it('answers 401 when the verifier throws InvalidTokenError', async () => {
    const { guard, verify, context } = setup('plainRoute', bearer());
    verify.mockRejectedValue(new InvalidTokenError());

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('answers 503 when the verifier throws another error', async () => {
    const { guard, verify, context } = setup('plainRoute', bearer());
    verify.mockRejectedValue(new Error(`jwks fetch failed for ${SECRET_TOKEN}`));

    const error = await caught(guard.canActivate(context));

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    const exception = error as ServiceUnavailableException;
    expect(exception.message).toBe('El servicio no está disponible.');
    const body = JSON.stringify(exception.getResponse());
    expect(body).not.toContain(SECRET_TOKEN);
    expect(body).not.toContain('jwks');
  });

  it.each([undefined, 'superadmin'])(
    'answers 403 when the role is missing or unknown (%s)',
    async (role) => {
      const { guard, verify, findOne, context } = setup('plainRoute', bearer());
      verify.mockResolvedValue(issuerToken({ role }));

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
      expect(findOne).not.toHaveBeenCalled();
    },
  );

  it('answers 403 when an issuer has no issuerId', async () => {
    const { guard, verify, findOne, context } = setup('plainRoute', bearer());
    verify.mockResolvedValue(issuerToken({ issuerId: undefined }));

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('answers 403 without querying the database when issuerId is not a UUID', async () => {
    const { guard, verify, findOne, context } = setup('plainRoute', bearer());
    verify.mockResolvedValue(issuerToken({ issuerId: "1'; DROP TABLE issuer; --" }));

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('answers 403 when the issuer does not exist', async () => {
    const { guard, verify, findOne, context } = setup('plainRoute', bearer());
    verify.mockResolvedValue(issuerToken());
    findOne.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(findOne).toHaveBeenCalledWith({ where: { id: ISSUER_ID } });
  });

  it('answers 403 with code issuer-revoked when the issuer is revoked', async () => {
    const { guard, verify, findOne, context } = setup('plainRoute', bearer());
    verify.mockResolvedValue(issuerToken());
    findOne.mockResolvedValue(revokedIssuer());

    const error = await caught(guard.canActivate(context));

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toEqual({
      statusCode: 403,
      message: 'Tu entidad fue revocada y ya no puede usar HabilitApp.',
      code: 'issuer-revoked',
    });
  });

  it('blocks a revoked issuer on routes without @Roles', async () => {
    const { guard, verify, findOne, context } = setup('plainRoute', bearer());
    verify.mockResolvedValue(issuerToken());
    findOne.mockResolvedValue(revokedIssuer());

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks a revoked issuer before checking @Roles', async () => {
    const { guard, verify, findOne, context } = setup('adminRoute', bearer());
    verify.mockResolvedValue(issuerToken());
    findOne.mockResolvedValue(revokedIssuer());

    const error = await caught(guard.canActivate(context));

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({ code: 'issuer-revoked' });
  });

  it('lets an admin through without loading an issuer', async () => {
    const { guard, verify, findOne, request, context } = setup('adminRoute', bearer());
    verify.mockResolvedValue({ userId: 'user-1', role: 'admin', issuerId: ISSUER_ID });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findOne).not.toHaveBeenCalled();
    expect(request.auth).toEqual({ userId: 'user-1', role: 'admin', issuer: null });
  });

  it('lets an active issuer through and exposes it on the request', async () => {
    const { guard, verify, findOne, request, context } = setup('issuerRoute', bearer());
    const issuer = activeIssuer();
    verify.mockResolvedValue(issuerToken());
    findOne.mockResolvedValue(issuer);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.auth).toEqual({ userId: 'user-1', role: 'issuer', issuer });
  });

  it('answers 403 when the role is not in @Roles', async () => {
    const { guard, verify, findOne, context } = setup('adminRoute', bearer());
    verify.mockResolvedValue(issuerToken());
    findOne.mockResolvedValue(activeIssuer());

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts any valid role on a route without @Roles', async () => {
    const admin = setup('plainRoute', bearer());
    admin.verify.mockResolvedValue({ userId: 'user-1', role: 'admin', issuerId: undefined });
    const issuer = setup('plainRoute', bearer());
    issuer.verify.mockResolvedValue(issuerToken());
    issuer.findOne.mockResolvedValue(activeIssuer());

    await expect(admin.guard.canActivate(admin.context)).resolves.toBe(true);
    await expect(issuer.guard.canActivate(issuer.context)).resolves.toBe(true);
  });
});
