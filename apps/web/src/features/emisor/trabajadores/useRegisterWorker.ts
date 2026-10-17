import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { registerWorker } from '@/api/workers'
import { DataError, type DocumentType, type NewWorkerInput, type Worker } from '@/data'
import { WORKERS_KEY } from '@/features/emisor/trabajadores/useWorkers'
import type { WorkerFormValues } from '@/features/emisor/trabajadores/workerSchema'

export type RegisterError = 'duplicate' | 'failed' | null

export const useRegisterWorker = () => {
  const queryClient = useQueryClient()
  const [error, setError] = useState<RegisterError>(null)
  const submittingRef = useRef(false)
  const mutation = useMutation({
    mutationFn: (input: NewWorkerInput) => registerWorker(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKERS_KEY }),
  })
  const { mutateAsync } = mutation

  const register = useCallback(
    async (values: WorkerFormValues): Promise<Worker | null> => {
      if (submittingRef.current) return null
      submittingRef.current = true
      setError(null)
      try {
        return await mutateAsync({
          fullName: values.fullName,
          documentType: values.documentType as DocumentType,
          documentNumber: values.documentNumber,
          dataConsent: values.dataConsent,
        })
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
