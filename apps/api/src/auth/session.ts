import type { Request } from 'express';
import type { Issuer } from '../issuers/issuer.entity.js';

export const Role = {
  Admin: 'admin',
  Issuer: 'issuer',
} as const;

export type RoleValue = (typeof Role)[keyof typeof Role];

export interface AuthSession {
  userId: string;
  role: RoleValue;
  issuer: Issuer | null;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthSession;
}
