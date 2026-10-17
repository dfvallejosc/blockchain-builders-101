import {
  createParamDecorator,
  type CustomDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Issuer } from '../issuers/issuer.entity.js';
import type { AuthenticatedRequest, RoleValue } from './session.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export const Roles = (...roles: RoleValue[]): CustomDecorator => SetMetadata(ROLES_KEY, roles);

export function selectCurrentIssuer(context: ExecutionContext): Issuer {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  const issuer = request.auth?.issuer;
  if (!issuer) {
    throw new Error('CurrentIssuer used on a route without an issuer session');
  }
  return issuer;
}

export const CurrentIssuer = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  selectCurrentIssuer(context),
);
