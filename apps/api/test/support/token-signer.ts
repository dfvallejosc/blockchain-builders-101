import { createSign, generateKeyPairSync } from 'node:crypto';

interface SignOptions {
  expiresInSeconds?: number;
}

export interface TokenSigner {
  publicKeyPem: string;
  sign(claims: Record<string, unknown>, options?: SignOptions): string;
}

const DEFAULT_EXPIRES_IN_SECONDS = 60;
const KEY_ID = 'test-key';

function encodeSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function createTokenSigner(): TokenSigner {
  // Clerk reads a 2048-bit RSA public key in SPKI PEM form.
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const sign = (claims: Record<string, unknown>, options: SignOptions = {}): string => {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = options.expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS;
    const header = { alg: 'RS256', typ: 'JWT', kid: KEY_ID };
    const payload = { sub: 'user_test', iat: now, nbf: now, exp: now + expiresIn, ...claims };
    const signingInput = `${encodeSegment(header)}.${encodeSegment(payload)}`;
    const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKey).toString('base64url');
    return `${signingInput}.${signature}`;
  };

  return { publicKeyPem, sign };
}
