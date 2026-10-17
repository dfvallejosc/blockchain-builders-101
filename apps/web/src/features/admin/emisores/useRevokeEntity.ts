import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { revokeIssuer } from '@/api/issuers'
import type { Entity } from '@/data'
import { ISSUERS_KEY } from '@/features/admin/emisores/queryKeys'
import { sessionEndReasonFor } from '@/features/auth/sessionEnd'

// 'session-ended': the session gate is already sending the user to the login, so the screen shows nothing.
export type RevokeResult = Entity | 'busy' | 'session-ended' | null

export const useRevokeEntity = () => {
  const queryClient = useQueryClient()
  const revokingRef = useRef(false)
  const mutation = useMutation({
    mutationFn: (id: string) => revokeIssuer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ISSUERS_KEY }),
  })
  const { mutateAsync } = mutation

  const revoke = useCallback(
    async (id: string): Promise<RevokeResult> => {
      if (revokingRef.current) return 'busy'
      revokingRef.current = true
      try {
        return await mutateAsync(id)
      } catch (error) {
        return sessionEndReasonFor(error, false) === null ? null : 'session-ended'
      } finally {
        revokingRef.current = false
      }
    },
    [mutateAsync],
  )

  return { revoking: mutation.isPending, revoke }
}
