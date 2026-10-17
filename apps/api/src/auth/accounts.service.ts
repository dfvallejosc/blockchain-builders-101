import type { ClerkClient } from '@clerk/backend';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Role } from './session.js';

export const CLERK_CLIENT = Symbol('CLERK_CLIENT');

@Injectable()
export class AccountsService {
  constructor(@Inject(CLERK_CLIENT) private readonly clerk: ClerkClient | null) {}

  // Thin pass-through to Clerk. The caller (TA-21) validates the issuer and the email.
  // A Clerk failure is rethrown unchanged: Nest turns it into a generic 500.
  async inviteIssuer(issuerId: string, email: string): Promise<void> {
    if (!this.clerk) {
      throw new ServiceUnavailableException('El servicio no está disponible.');
    }
    await this.clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: Role.Issuer, issuerId },
    });
  }
}
