import { useAuth } from '@clerk/react'
import { hashKey, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { endSession, sessionEndReasonFor, type SessionEndReason } from '@/features/auth/sessionEnd'
import { setTokenProvider, type TokenProvider } from '@/lib/api-client'

export type EndSession = (reason?: SessionEndReason) => Promise<void>

// The ref keeps a burst of failing requests from ending the session more than once.
export const useEndSession = (loginPath: string): { ending: boolean; end: EndSession } => {
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
      await endSession({ signOut: (options) => signOut(options), queryClient, navigate }, loginPath, reason)
    },
    [signOut, queryClient, navigate, loginPath],
  )

  return { ending, end }
}

export const useTokenProvider = (getToken: TokenProvider) => {
  useEffect(() => {
    setTokenProvider(() => getToken())
    return () => setTokenProvider(null)
  }, [getToken])
}

// The single place that ends the session on an auth error from any query or mutation.
export const useSessionErrorHandler = (end: EndSession, profileKey: readonly unknown[]) => {
  const queryClient = useQueryClient()
  const profileHash = hashKey(profileKey)

  useEffect(() => {
    const handle = (error: unknown, fromProfile: boolean) => {
      const reason = sessionEndReasonFor(error, fromProfile)
      if (reason) void end(reason)
    }
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return
      handle(event.action.error, event.query.queryHash === profileHash)
    })
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return
      handle(event.action.error, false)
    })
    return () => {
      unsubscribeQueries()
      unsubscribeMutations()
    }
  }, [queryClient, end, profileHash])
}
