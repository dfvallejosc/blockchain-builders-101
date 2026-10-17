import { useAuth, useUser } from '@clerk/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Navigate, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { IssuerSession } from '@/data/types'
import { GateSkeleton } from '@/features/auth/GateSkeleton'
import { LOGIN_PATH } from '@/features/auth/loginPaths'
import { sessionEndReasonFor } from '@/features/auth/sessionEnd'
import { useEndSession, useSessionErrorHandler, useTokenProvider, type EndSession } from '@/features/auth/sessionHooks'
import { ISSUER_PROFILE_KEY, useIssuerProfile } from '@/features/emisor/auth/useIssuerProfile'
import { SessionActionsContext, type SessionActions } from '@/layouts/SessionActionsContext'

interface ActiveGateProps {
  end: EndSession
}

const ActiveGate = ({ end }: ActiveGateProps) => {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const queryClient = useQueryClient()
  useTokenProvider(getToken)
  const profile = useIssuerProfile()
  const actions = useMemo<SessionActions>(() => ({ signOut: () => end() }), [end])
  const signedOut = isLoaded && !isSignedIn

  // Clerk can end the session by itself: the next issuer must not see the previous entity's data.
  useEffect(() => {
    if (signedOut) queryClient.clear()
  }, [signedOut, queryClient])

  if (!isLoaded) return <GateSkeleton />
  if (!isSignedIn) return <Navigate to={LOGIN_PATH.issuer} replace />

  if (profile.data) {
    const session: IssuerSession = {
      role: 'issuer',
      entityId: profile.data.id,
      entityName: profile.data.name,
      email: user?.primaryEmailAddress?.emailAddress ?? '',
    }
    return (
      <SessionActionsContext.Provider value={actions}>
        <Outlet context={session} />
      </SessionActionsContext.Provider>
    )
  }

  if (profile.isError && sessionEndReasonFor(profile.error, true) === null) {
    return (
      <main className="mx-auto grid min-h-svh w-full max-w-md content-center p-4 sm:p-6">
        <EmptyState
          variant="error"
          title="No pudimos cargar tu panel"
          action={<Button variant="secondary" onClick={() => void profile.refetch()}>Reintentar</Button>}
        >
          Revisa tu conexión e inténtalo de nuevo.
        </EmptyState>
      </main>
    )
  }

  return <GateSkeleton />
}

// While the session ends, the active gate unmounts: its queries stop observing, so clearing the
// cache does not refetch them, and Clerk signing out does not race a redirect without a reason.
export const IssuerSessionGate = () => {
  const { ending, end } = useEndSession(LOGIN_PATH.issuer)
  useSessionErrorHandler(end, ISSUER_PROFILE_KEY)

  if (ending) return <GateSkeleton />
  return <ActiveGate end={end} />
}
