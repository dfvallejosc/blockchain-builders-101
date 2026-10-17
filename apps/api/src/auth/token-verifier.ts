export interface VerifiedToken {
  userId: string;
  role: string | undefined;
  issuerId: string | undefined;
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedToken>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export class InvalidTokenError extends Error {
  constructor(message = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}
