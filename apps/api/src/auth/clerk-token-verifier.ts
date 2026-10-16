import { verifyToken } from '@clerk/backend';
import { InvalidTokenError, type TokenVerifier, type VerifiedToken } from './token-verifier.js';

export interface ClerkTokenVerifierOptions {
  jwtKey?: string;
  secretKey?: string;
  authorizedParties: string[];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readMetadata(payload: object): Record<string, unknown> {
  const metadata: unknown = 'metadata' in payload ? payload.metadata : undefined;
  if (typeof metadata !== 'object' || metadata === null) return {};
  return metadata as Record<string, unknown>;
}

export class ClerkTokenVerifier implements TokenVerifier {
  constructor(private readonly options: ClerkTokenVerifierOptions) {}

  async verify(token: string): Promise<VerifiedToken> {
    const { jwtKey, secretKey } = this.options;
    if (!jwtKey && !secretKey) {
      throw new Error('ClerkTokenVerifier needs a jwtKey or a secretKey');
    }

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
    } catch {
      // Never forward the token or Clerk's error detail.
      throw new InvalidTokenError();
    }
  }
}
