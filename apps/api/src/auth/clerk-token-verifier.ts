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

// Clerk only reads a key in this form: it cuts the header and trailer out of the text.
const PEM_HEADER = '-----BEGIN PUBLIC KEY-----';
const PEM_TRAILER = '-----END PUBLIC KEY-----';
const PEM_LINE_LENGTH = 64;
const PEM_PATTERN = new RegExp(`^\\s*${PEM_HEADER}([\\s\\S]*?)${PEM_TRAILER}\\s*$`);
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

// Rewrites the key as a canonical multi-line PEM, so a key flattened into one line
// (or joined with spaces) in an env var still works. Returns undefined when the
// text is not a SPKI "BEGIN PUBLIC KEY" PEM, which is the only form Clerk can import.
function normalizePem(pem: string): string | undefined {
  const match = PEM_PATTERN.exec(pem);
  if (!match) return undefined;
  const body = match[1].replace(/\s+/g, '');
  if (!BASE64_PATTERN.test(body)) return undefined;
  const lines = body.match(new RegExp(`.{1,${PEM_LINE_LENGTH}}`, 'g')) ?? [];
  return `${PEM_HEADER}\n${lines.join('\n')}\n${PEM_TRAILER}\n`;
}

function isRsaPublicKey(pem: string): boolean {
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

// Returns the key in the form that is both validated here and handed to Clerk.
function normalizeJwtKey(pem: string): string | undefined {
  const normalized = normalizePem(pem);
  return normalized !== undefined && isRsaPublicKey(normalized) ? normalized : undefined;
}

function isTokenFailure(error: unknown): boolean {
  return error instanceof TokenVerificationError && TOKEN_REASONS.has(error.reason);
}

export class ClerkTokenVerifier implements TokenVerifier {
  private keyChecked = false;
  private normalizedJwtKey: string | undefined;

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
    if (jwtKey) {
      const normalized = normalizeJwtKey(jwtKey);
      if (normalized === undefined) {
        throw new Error('ClerkTokenVerifier jwtKey is not a valid RSA public key');
      }
      this.normalizedJwtKey = normalized;
    }
    this.keyChecked = true;
  }

  private async verifyWithClerk(token: string): Promise<Awaited<ReturnType<typeof verifyToken>>> {
    const { secretKey, authorizedParties } = this.options;
    try {
      const payload = await verifyToken(token, {
        jwtKey: this.normalizedJwtKey,
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
