import { ServiceUnavailableException } from '@nestjs/common';
import type { ClerkClient } from '@clerk/backend';
import { AccountsService } from './accounts.service.js';

const ISSUER_ID = '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11';
const EMAIL = 'consultorio@example.com';

const buildClient = (createInvitation: ReturnType<typeof vi.fn>): ClerkClient =>
  ({ invitations: { createInvitation } }) as unknown as ClerkClient;

describe('AccountsService', () => {
  it('invites the email with role issuer and the issuerId as public metadata', async () => {
    const createInvitation = vi.fn().mockResolvedValue({ id: 'inv_1' });
    const service = new AccountsService(buildClient(createInvitation));

    await expect(service.inviteIssuer(ISSUER_ID, EMAIL)).resolves.toBeUndefined();

    expect(createInvitation).toHaveBeenCalledWith({
      emailAddress: EMAIL,
      publicMetadata: { role: 'issuer', issuerId: ISSUER_ID },
    });
  });

  it('rethrows a Clerk failure unchanged', async () => {
    const failure = new Error('clerk exploded');
    const createInvitation = vi.fn().mockRejectedValue(failure);
    const service = new AccountsService(buildClient(createInvitation));

    await expect(service.inviteIssuer(ISSUER_ID, EMAIL)).rejects.toBe(failure);
  });

  it('answers 503 when Clerk is not configured', async () => {
    const service = new AccountsService(null);

    const result = service.inviteIssuer(ISSUER_ID, EMAIL);

    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(result).rejects.toMatchObject({ message: 'El servicio no está disponible.' });
  });
});
