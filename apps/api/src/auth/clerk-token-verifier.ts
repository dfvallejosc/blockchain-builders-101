import { createPublicKey } from 'node:crypto';
import { verifyToken } from '@clerk/backend';
import { TokenVerificationError, TokenVerificationErrorReason } from '@clerk/backend/errors';
import { InvalidTokenError, type TokenVerifier, type VerifiedToken } from './token-verifier.js';

export interface ClerkTokenVerifierOptions {
  jwtKey?: string;
  secretKey?: string;
  authorizedParties: string[];
}

// Reasons that mean the token itself is bad (401). Key, network and configuration
// reasons are left out on purpose: they must fail as a plain error (503).
const TOKEN_REASONS: ReadonlySet<string> = new Set([
  TokenVerificationErrorReason.TokenExpired,
  TokenVerificationErrorReason.TokenInvalid,
  TokenVerificationErrorReason.TokenInvalidAlgorithm,
  TokenVerificationErrorReason.TokenInvalidAuthorizedParties,
  TokenVerificationErrorReason.TokenInvalidIssuer,
  TokenVerificationErrorReason.TokenInvalidSignature,
  TokenVerificationErrorReason.TokenNotActiveYet,
  TokenVerificationErrorReason.TokenIatInTheFuture,
  TokenVerificationErrorReason.TokenVerificationFailed,
  // The kid comes from the token, so a mismatch is the caller's problem.
  TokenVerificationErrorReason.JWKKidMismatch,
]);

// Clerk builds its key from a 2048-bit RSA public key with exponent 65537.
const RSA_MODULUS_LENGTH = 2048;
const RSA_PUBLIC_EXPONENT = 65537n;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readMetadata(payload: object): Record<string, unknown> {
  const metadata: unknown = 'metadata' in payload ? payload.metadata : undefined;
  if (typeof metadata !== 'object' || metadata === null) return {};
  return metadata as Record<string, unknown>;
}

function isValidJwtKey(pem: string): boolean {
  try {
    const key = createPublicKey(pem);
    const details = key.asymmetricKeyDetails;
    return (
      key.asymmetricKeyType === 'rsa' &&
      details?.modulusLength === RSA_MODULUS_LENGTH &&
      details.publicExponent === RSA_PUBLIC_EXPONENT
    );
  } catch {
    return false;
  }
}

function isTokenFailure(error: unknown): boolean {
  return error instanceof TokenVerificationError && TOKEN_REASONS.has(error.reason);
}

export class ClerkTokenVerifier implements TokenVerifier {
  private keyChecked = false;

  constructor(private readonly options: ClerkTokenVerifierOptions) {}

  async verify(token: string): Promise<VerifiedToken> {
    this.assertKeyConfigured();

    const payload = await this.verifyWithClerk(token);
    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw new InvalidTokenError();
    }

    const metadata = readMetadata(payload);
    return {
      userId: payload.sub,
      role: asString(metadata.role),
      issuerId: asString(metadata.issuerId),
    };
  }

  private assertKeyConfigured(): void {
    if (this.keyChecked) return;
    const { jwtKey, secretKey } = this.options;
    if (!jwtKey && !secretKey) {
      throw new Error('ClerkTokenVerifier needs a jwtKey or a secretKey');
    }
    // The jwtKey wins over the secretKey inside Clerk, so a bad one must not pass as a bad token.
    if (jwtKey && !isValidJwtKey(jwtKey)) {
      throw new Error('ClerkTokenVerifier jwtKey is not a valid RSA public key');
    }
    this.keyChecked = true;
  }

  private async verifyWithClerk(token: string): Promise<Awaited<ReturnType<typeof verifyToken>>> {
    const { jwtKey, secretKey, authorizedParties } = this.options;
    try {
      const payload = await verifyToken(token, {
        jwtKey,
        secretKey,
        authorizedParties: authorizedParties.length > 0 ? authorizedParties : undefined,
      });
      if (!payload) throw new InvalidTokenError();
      return payload;
    } catch (error) {
      // Never forward the token or Clerk's error detail.
      if (error instanceof InvalidTokenError || isTokenFailure(error)) {
        throw new InvalidTokenError();
      }
      throw new Error('Clerk token verification is unavailable');
    }
  }
}
