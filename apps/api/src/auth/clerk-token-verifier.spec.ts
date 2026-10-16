import { createTokenSigner } from '../../test/support/token-signer.js';
import { ClerkTokenVerifier } from './clerk-token-verifier.js';
import { InvalidTokenError } from './token-verifier.js';

const ISSUER_ID = '3f0c1a52-8d0b-4c1e-9a3e-0f6f3f1c2b7a';
const AUTHORIZED_PARTY = 'http://localhost:5173';

describe('ClerkTokenVerifier', () => {
  const signer = createTokenSigner();

  function createVerifier(authorizedParties: string[] = [AUTHORIZED_PARTY]): ClerkTokenVerifier {
    return new ClerkTokenVerifier({ jwtKey: signer.publicKeyPem, authorizedParties });
  }

  it('returns the user id, role and issuerId from a valid token', async () => {
    const token = signer.sign({
      sub: 'user_123',
      azp: AUTHORIZED_PARTY,
      metadata: { role: 'issuer', issuerId: ISSUER_ID },
    });

    await expect(createVerifier().verify(token)).resolves.toEqual({
      userId: 'user_123',
      role: 'issuer',
      issuerId: ISSUER_ID,
    });
  });

  it('returns undefined role and issuerId when the token has no metadata', async () => {
    const token = signer.sign({ sub: 'user_123', azp: AUTHORIZED_PARTY });

    await expect(createVerifier().verify(token)).resolves.toEqual({
      userId: 'user_123',
      role: undefined,
      issuerId: undefined,
    });
  });

  it('ignores metadata values that are not strings', async () => {
    const token = signer.sign({
      sub: 'user_123',
      azp: AUTHORIZED_PARTY,
      metadata: { role: 42, issuerId: { id: ISSUER_ID } },
    });

    await expect(createVerifier().verify(token)).resolves.toEqual({
      userId: 'user_123',
      role: undefined,
      issuerId: undefined,
    });
  });

  it('rejects an expired token with InvalidTokenError', async () => {
    const token = signer.sign({ azp: AUTHORIZED_PARTY }, { expiresInSeconds: -3600 });

    await expect(createVerifier().verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects a token signed with another key with InvalidTokenError', async () => {
    const token = createTokenSigner().sign({ azp: AUTHORIZED_PARTY });

    await expect(createVerifier().verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects a token whose azp is not an authorized party with InvalidTokenError', async () => {
    const token = signer.sign({ azp: 'https://evil.example' });

    await expect(createVerifier().verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('skips the azp check when no authorized party is configured', async () => {
    const token = signer.sign({ sub: 'user_123', azp: 'https://anything.example' });

    await expect(createVerifier([]).verify(token)).resolves.toMatchObject({ userId: 'user_123' });
  });

  it('rejects a token without a subject with InvalidTokenError', async () => {
    const token = signer.sign({ sub: '', azp: AUTHORIZED_PARTY });

    await expect(createVerifier().verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('fails with a non-InvalidTokenError error when no key is configured', async () => {
    const verifier = new ClerkTokenVerifier({ authorizedParties: [AUTHORIZED_PARTY] });
    const token = signer.sign({ azp: AUTHORIZED_PARTY });

    const failure = await verifier.verify(token).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toBeInstanceOf(InvalidTokenError);
  });
});
