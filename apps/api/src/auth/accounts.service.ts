import type { ClerkClient } from '@clerk/backend';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Role } from './session.js';

export const CLERK_CLIENT = Symbol('CLERK_CLIENT');
export const INVITATION_PATH = '/emisor/aceptar-invitacion';
export const WEB_APP_URL = Symbol('WEB_APP_URL');

@Injectable()
export class AccountsService {
  constructor(
    @Inject(CLERK_CLIENT) private readonly clerk: ClerkClient | null,
    @Inject(WEB_APP_URL) private readonly webAppUrl?: string,
  ) {}

  // Thin pass-through to Clerk. The caller (TA-21) validates the issuer and the email.
  // A Clerk failure is rethrown unchanged: Nest turns it into a generic 500.
  async inviteIssuer(issuerId: string, email: string): Promise<void> {
    if (!this.clerk) {
      throw new ServiceUnavailableException('El servicio no está disponible.');
    }
    const redirectUrl = this.webAppUrl ? new URL(INVITATION_PATH, this.webAppUrl).toString() : undefined;
    await this.clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: Role.Issuer, issuerId },
      ...(redirectUrl ? { redirectUrl } : {}),
    });
  }
}
