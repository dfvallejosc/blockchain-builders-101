import { createHmac, randomBytes } from 'node:crypto';

import { Keypair } from '@stellar/stellar-sdk';

import { deriveIssuerKeypair } from './issuer-keys.js';

describe('deriveIssuerKeypair', () => {
  it('derives the same public key for the same issuer and master secret', () => {
    const masterSecret = randomBytes(32).toString('hex');

    const first = deriveIssuerKeypair(masterSecret, 'issuer-a');
    const second = deriveIssuerKeypair(masterSecret, 'issuer-a');

    expect(first.publicKey()).toBe(second.publicKey());
  });

  it('derives a different key for another issuer', () => {
    const masterSecret = randomBytes(32).toString('hex');

    expect(deriveIssuerKeypair(masterSecret, 'issuer-a').publicKey()).not.toBe(
      deriveIssuerKeypair(masterSecret, 'issuer-b').publicKey(),
    );
  });

  it('derives a different key for another master secret', () => {
    const firstSecret = randomBytes(32).toString('hex');
    const secondSecret = randomBytes(32).toString('hex');

    expect(deriveIssuerKeypair(firstSecret, 'issuer-a').publicKey()).not.toBe(
      deriveIssuerKeypair(secondSecret, 'issuer-a').publicKey(),
    );
  });

  it('uses the issuer domain prefix for key separation', () => {
    const masterSecret = randomBytes(32).toString('hex');
    const issuerId = 'issuer-a';
    const otherSeed = createHmac('sha256', masterSecret)
      .update(`habilitapp:other:v1:${issuerId}`)
      .digest();

    expect(deriveIssuerKeypair(masterSecret, issuerId).publicKey()).not.toBe(
      Keypair.fromRawEd25519Seed(otherSeed).publicKey(),
    );
  });

  it('does not include the master secret in returned key material or errors', () => {
    const masterSecret = randomBytes(32).toString('hex');
    const keypair = deriveIssuerKeypair(masterSecret, 'issuer-a');

    expect(keypair.publicKey()).not.toContain(masterSecret);
    expect(keypair.secret()).not.toContain(masterSecret);
    expect(() => deriveIssuerKeypair(masterSecret, 'issuer-a')).not.toThrow(
      masterSecret,
    );
  });
});
