import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Issuer } from '../issuers/issuer.entity.js';
import { IS_PUBLIC_KEY, Public, ROLES_KEY, Roles, selectCurrentIssuer } from './decorators.js';
import type { AuthSession } from './session.js';

function contextWith(auth: AuthSession | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ auth }) }),
  } as unknown as ExecutionContext;
}

describe('auth decorators', () => {
  it('Public marks a handler as public', () => {
    class Controller {
      @Public()
      handler(this: void): void {}
    }

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Controller.prototype.handler)).toBe(true);
  });

  it('Roles stores the allowed roles', () => {
    class Controller {
      @Roles('admin', 'issuer')
      handler(this: void): void {}
    }

    expect(Reflect.getMetadata(ROLES_KEY, Controller.prototype.handler)).toEqual([
      'admin',
      'issuer',
    ]);
  });

  it('selectCurrentIssuer returns the issuer loaded by the guard', () => {
    const issuer = { id: 'issuer-1' } as Issuer;
    const context = contextWith({ userId: 'user-1', role: 'issuer', issuer });

    expect(selectCurrentIssuer(context)).toBe(issuer);
  });

  it('selectCurrentIssuer throws when the session has no issuer', () => {
    const adminContext = contextWith({ userId: 'user-1', role: 'admin', issuer: null });
    const anonymousContext = contextWith(undefined);

    expect(() => selectCurrentIssuer(adminContext)).toThrow(Error);
    expect(() => selectCurrentIssuer(anonymousContext)).toThrow(Error);
  });
});
