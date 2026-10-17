import { useAuth, useUser } from '@clerk/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Navigate, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { AdminSession } from '@/data/types'
import { ADMIN_PROFILE_KEY, useAdminProfile } from '@/features/admin/auth/useAdminProfile'
import { GateSkeleton } from '@/features/auth/GateSkeleton'
import { LOGIN_PATH } from '@/features/auth/loginPaths'
import { sessionEndReasonFor } from '@/features/auth/sessionEnd'
import { useEndSession, useSessionErrorHandler, useTokenProvider, type EndSession } from '@/features/auth/sessionHooks'
import { SessionActionsContext, type SessionActions } from '@/layouts/SessionActionsContext'

interface ActiveGateProps {
  end: EndSession
}

const ActiveGate = ({ end }: ActiveGateProps) => {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const queryClient = useQueryClient()
  useTokenProvider(getToken)
  const profile = useAdminProfile()
  const actions = useMemo<SessionActions>(() => ({ signOut: () => end() }), [end])
  const signedOut = isLoaded && !isSignedIn

  // Clerk can end the session by itself: the next user must not see the previous one's data.
  useEffect(() => {
    if (signedOut) queryClient.clear()
  }, [signedOut, queryClient])

  if (!isLoaded) return <GateSkeleton />
  if (!isSignedIn) return <Navigate to={LOGIN_PATH.admin} replace />

  if (profile.data) {
    const email = user?.primaryEmailAddress?.emailAddress ?? ''
    const fullName = user?.fullName?.trim() ?? ''
    const session: AdminSession = { role: 'admin', name: fullName !== '' ? fullName : email, email }
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
export const AdminSessionGate = () => {
  const { ending, end } = useEndSession(LOGIN_PATH.admin)
  useSessionErrorHandler(end, ADMIN_PROFILE_KEY)

  if (ending) return <GateSkeleton />
  return <ActiveGate end={end} />
}
