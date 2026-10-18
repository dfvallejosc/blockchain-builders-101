import type { QueryClient } from '@tanstack/react-query'
import type { NavigateFunction } from 'react-router'
import { DataError } from '@/data/errors'
import { NotAdminError, NotIssuerError } from '@/features/auth/errors'

export type SessionEndReason = 'expired' | 'revoked' | 'no-role' | 'not-issuer' | 'not-admin'
export type IssuerSessionEndReason = Exclude<SessionEndReason, 'not-admin'>
export type AdminSessionEndReason = Exclude<SessionEndReason, 'revoked' | 'not-issuer'>

interface SessionEndDeps {
  signOut: (options: { redirectUrl: string }) => Promise<unknown>
  queryClient: QueryClient
  navigate: NavigateFunction
}

// forbidden only ends the session on GET /me: elsewhere it means one action is not allowed.
export const sessionEndReasonFor = (error: unknown, fromProfile: boolean): SessionEndReason | null => {
  if (error instanceof NotIssuerError) return 'not-issuer'
  if (error instanceof NotAdminError) return 'not-admin'
  if (!(error instanceof DataError)) return null
  if (error.code === 'unauthorized') return 'expired'
  if (error.code === 'entity-revoked') return 'revoked'
  if (error.code === 'forbidden' && fromProfile) return 'no-role'
  return null
}

// Without a reason it is a plain sign out. A failed Clerk sign out still leaves the panel.
export const endSession = async (
  { signOut, queryClient, navigate }: SessionEndDeps,
  loginPath: string,
  reason?: SessionEndReason,
): Promise<void> => {
  await signOut({ redirectUrl: loginPath }).catch(() => undefined)
  queryClient.clear()
  await navigate(loginPath, { replace: true, state: reason ? { reason } : undefined })
}
