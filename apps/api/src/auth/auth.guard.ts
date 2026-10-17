import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import type { Repository } from 'typeorm';
import { Issuer } from '../issuers/issuer.entity.js';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators.js';
import { type AuthenticatedRequest, type AuthSession, Role, type RoleValue } from './session.js';
import {
  InvalidTokenError,
  TOKEN_VERIFIER,
  type TokenVerifier,
  type VerifiedToken,
} from './token-verifier.js';

const BEARER_PATTERN = /^bearer\s+(\S+)$/i;

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const match = BEARER_PATTERN.exec(header);
  return match ? match[1] : null;
}

function isRole(value: string | undefined): value is RoleValue {
  return Object.values<string>(Role).includes(value ?? '');
}

function forbidden(): ForbiddenException {
  return new ForbiddenException('No tienes permiso para realizar esta acción.');
}

function issuerRevoked(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    message: 'Tu entidad fue revocada y ya no puede usar HabilitApp.',
    code: 'issuer-revoked',
  });
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @InjectRepository(Issuer) private readonly issuers: Repository<Issuer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Necesitas iniciar sesión.');
    }

    const verified = await this.verifyToken(token);
    if (!isRole(verified.role)) {
      throw forbidden();
    }

    const session = await this.buildSession(verified, verified.role);
    this.assertRoleAllowed(context, session.role);

    request.auth = session;
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private async verifyToken(token: string): Promise<VerifiedToken> {
    try {
      return await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw new UnauthorizedException('Tu sesión no es válida. Inicia sesión de nuevo.');
      }
      throw new ServiceUnavailableException('El servicio no está disponible.');
    }
  }

  private async buildSession(verified: VerifiedToken, role: RoleValue): Promise<AuthSession> {
    if (role === Role.Admin) {
      return { userId: verified.userId, role, issuer: null };
    }
    const issuer = await this.loadActiveIssuer(verified.issuerId);
    return { userId: verified.userId, role, issuer };
  }

  private async loadActiveIssuer(issuerId: string | undefined): Promise<Issuer> {
    if (!issuerId || !isUUID(issuerId)) {
      throw forbidden();
    }
    const issuer = await this.issuers.findOne({ where: { id: issuerId } });
    if (!issuer) {
      throw forbidden();
    }
    if (issuer.revokedAt) {
      throw issuerRevoked();
    }
    return issuer;
  }

  private assertRoleAllowed(context: ExecutionContext, role: RoleValue): void {
    const allowed = this.reflector.getAllAndOverride<RoleValue[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed && !allowed.includes(role)) {
      throw forbidden();
    }
  }
}
