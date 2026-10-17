import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { annulCertificate } from '@/api/certificates'
import { DataError } from '@/data'
import { CERTIFICATES_KEY } from '@/features/emisor/certificados/useCertificates'
import { sessionEndReasonFor } from '@/features/auth/sessionEnd'

export type AnnulResult = 'annulled' | 'already-annulled' | 'failed'

export const useAnnulCertificate = () => {
  const queryClient = useQueryClient()
  const inFlightRef = useRef<Promise<AnnulResult> | null>(null)
  const mutation = useMutation({
    mutationFn: (id: string) => annulCertificate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CERTIFICATES_KEY }),
  })
  const { mutateAsync } = mutation

  const run = useCallback(
    async (id: string): Promise<AnnulResult> => {
      try {
        await mutateAsync(id)
        return 'annulled'
      } catch (error) {
        // The session gate ends the session on these, so they are not a failure to report here.
        if (sessionEndReasonFor(error, false) !== null) throw error
        if (error instanceof DataError && error.code === 'duplicate') {
          await queryClient.invalidateQueries({ queryKey: CERTIFICATES_KEY })
          return 'already-annulled'
        }
        return 'failed'
      }
    },
    [mutateAsync, queryClient],
  )

  // A second call while one is in flight shares its request instead of sending another.
  const annul = useCallback(
    (id: string): Promise<AnnulResult> => {
      if (inFlightRef.current) return inFlightRef.current
      const request = run(id).finally(() => {
        inFlightRef.current = null
      })
      inFlightRef.current = request
      return request
    },
    [run],
  )

  return { annul, annulling: mutation.isPending }
}
