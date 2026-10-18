import { createHmac } from 'node:crypto';

import { Keypair } from '@stellar/stellar-sdk';

const ISSUER_KEY_DOMAIN = 'habilitapp:issuer:v1:';

export function deriveIssuerKeypair(
  masterSecret: string,
  issuerId: string,
): Keypair {
  const seed = createHmac('sha256', masterSecret)
    .update(`${ISSUER_KEY_DOMAIN}${issuerId}`)
    .digest();

  return Keypair.fromRawEd25519Seed(seed);
}
