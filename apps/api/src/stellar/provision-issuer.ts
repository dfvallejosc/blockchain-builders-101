import { ContractError } from './contract-errors.js';
import type { StellarClient } from './stellar-client.js';

export interface IssuerToProvision {
  id: string;
  revokedAt: Date | null;
}

// A revoked issuer is never authorized, not even briefly: if the revocation then failed it would stay authorized.
// One the network has never seen has nothing to revoke.
export const provisionIssuer = async (client: StellarClient, issuer: IssuerToProvision): Promise<void> => {
  if (issuer.revokedAt) {
    try {
      await client.revokeIssuer(issuer.id);
    } catch (error) {
      if (!(error instanceof ContractError && error.code === 7)) throw error;
    }
    return;
  }

  await client.ensureIssuerAccount(issuer.id);
  await client.authorizeIssuer(issuer.id);
};
