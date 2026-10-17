import { Controller, Get, Req } from '@nestjs/common';
import type { CertificateTypeValue } from '../certificates/certificate-type.js';
import type { AuthenticatedRequest, RoleValue } from './session.js';

export interface MeResponse {
  role: RoleValue;
  issuer: {
    id: string;
    name: string;
    certificateTypes: CertificateTypeValue[];
    nit: string;
    city: string;
  } | null;
}

@Controller('me')
export class MeController {
  @Get()
  getMe(@Req() request: AuthenticatedRequest): MeResponse {
    const session = request.auth;
    if (!session) {
      throw new Error('GET /me reached without a session');
    }
    const { issuer: sessionIssuer } = session;
    const issuer = sessionIssuer
      ? {
          id: sessionIssuer.id,
          name: sessionIssuer.name,
          certificateTypes: sessionIssuer.certificateTypes,
          nit: sessionIssuer.nit,
          city: sessionIssuer.city,
        }
      : null;
    return { role: session.role, issuer };
  }
}
