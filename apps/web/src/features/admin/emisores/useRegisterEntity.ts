import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { registerIssuer } from '@/api/issuers'
import { DataError, type Entity, type NewEntityInput } from '@/data'
import { ISSUERS_KEY } from '@/features/admin/emisores/queryKeys'
import { toNewEntityInput, type RegisterEntityValues } from '@/features/admin/emisores/registerEntitySchema'

export type RegisterEntityError = 'duplicate' | 'failed' | null

export const useRegisterEntity = () => {
  const queryClient = useQueryClient()
  const [error, setError] = useState<RegisterEntityError>(null)
  const submittingRef = useRef(false)
  const mutation = useMutation({
    mutationFn: (input: NewEntityInput) => registerIssuer(input),
    // Refreshing is not awaited: the change is already saved, so the answer must not wait for a slow reload.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ISSUERS_KEY })
    },
  })
  const { mutateAsync } = mutation

  const register = useCallback(
    async (values: RegisterEntityValues): Promise<Entity | null> => {
      if (submittingRef.current) return null
      submittingRef.current = true
      setError(null)
      try {
        return await mutateAsync(toNewEntityInput(values))
      } catch (caught) {
        setError(caught instanceof DataError && caught.code === 'duplicate' ? 'duplicate' : 'failed')
        return null
      } finally {
        submittingRef.current = false
      }
    },
    [mutateAsync],
  )

  const clearError = useCallback(() => setError(null), [])

  return { submitting: mutation.isPending, error, register, clearError }
}
