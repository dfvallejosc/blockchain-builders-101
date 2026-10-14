import { useCallback, useRef, useState } from 'react'
import { DataError, registerEntity, type Entity } from '@/data'
import { toNewEntityInput, type RegisterEntityValues } from '@/features/admin/emisores/registerEntitySchema'

export type RegisterEntityError = 'duplicate' | 'failed' | null

export const useRegisterEntity = () => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<RegisterEntityError>(null)
  const submittingRef = useRef(false)

  const register = useCallback(async (values: RegisterEntityValues): Promise<Entity | null> => {
    if (submittingRef.current) return null
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      return await registerEntity(toNewEntityInput(values))
    } catch (caught) {
      setError(caught instanceof DataError && caught.code === 'duplicate' ? 'duplicate' : 'failed')
      return null
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { submitting, error, register, clearError }
}
