import { useAuth, useUser } from '@clerk/react'
import { hashKey, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { IssuerSession } from '@/data/types'
import { endIssuerSession, sessionEndReasonFor, type SessionEndReason } from '@/features/emisor/auth/sessionEnd'
import { ISSUER_PROFILE_KEY, useIssuerProfile } from '@/features/emisor/auth/useIssuerProfile'
import { LOGIN_PATH } from '@/layouts/RequireSession'
import { SessionActionsContext, type SessionActions } from '@/layouts/SessionActionsContext'
import { setTokenProvider, type TokenProvider } from '@/lib/api-client'

type EndSession = (reason?: SessionEndReason) => Promise<void>

const PROFILE_HASH = hashKey(ISSUER_PROFILE_KEY)

// The ref keeps a burst of failing requests from ending the session more than once.
const useEndSession = (): { ending: boolean; end: EndSession } => {
  const { signOut } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const endingRef = useRef(false)
  const [ending, setEnding] = useState(false)

  const end = useCallback<EndSession>(
    async (reason) => {
      if (endingRef.current) return
      endingRef.current = true
      setEnding(true)
      await endIssuerSession({ signOut: () => signOut(), queryClient, navigate }, reason)
    },
    [signOut, queryClient, navigate],
  )

  return { ending, end }
}

const useTokenProvider = (getToken: TokenProvider) => {
  useEffect(() => {
    setTokenProvider(() => getToken())
    return () => setTokenProvider(null)
  }, [getToken])
}

// The single place that ends the session on an auth error from any query or mutation.
const useSessionErrorHandler = (end: EndSession) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handle = (error: unknown, fromProfile: boolean) => {
      const reason = sessionEndReasonFor(error, fromProfile)
      if (reason) void end(reason)
    }
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return
      handle(event.action.error, event.query.queryHash === PROFILE_HASH)
    })
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return
      handle(event.action.error, false)
    })
    return () => {
      unsubscribeQueries()
      unsubscribeMutations()
    }
  }, [queryClient, end])
}

const GateSkeleton = () => (
  <div role="status" aria-label="Cargando tu panel" className="mx-auto grid w-full max-w-3xl gap-4 p-4 sm:p-6">
    <Skeleton className="h-9 w-2/3" />
    <Skeleton className="w-1/2" />
    <Skeleton className="h-48 w-full" />
  </div>
)

interface ActiveGateProps {
  end: EndSession
}

const ActiveGate = ({ end }: ActiveGateProps) => {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  useTokenProvider(getToken)
  const profile = useIssuerProfile()
  const actions = useMemo<SessionActions>(() => ({ signOut: () => end() }), [end])

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
  const { ending, end } = useEndSession()
  useSessionErrorHandler(end)

  if (ending) return <GateSkeleton />
  return <ActiveGate end={end} />
}
