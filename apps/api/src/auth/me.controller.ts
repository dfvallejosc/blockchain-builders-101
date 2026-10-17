import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest, RoleValue } from './session.js';

export interface MeResponse {
  role: RoleValue;
  issuer: { id: string; name: string } | null;
}

@Controller('me')
export class MeController {
  @Get()
  getMe(@Req() request: AuthenticatedRequest): MeResponse {
    const session = request.auth;
    if (!session) {
      throw new Error('GET /me reached without a session');
    }
    const issuer = session.issuer ? { id: session.issuer.id, name: session.issuer.name } : null;
    return { role: session.role, issuer };
  }
}
