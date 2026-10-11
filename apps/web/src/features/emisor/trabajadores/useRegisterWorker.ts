import { useCallback, useEffect, useRef, useState } from 'react'
import { DataError, getEntity, registerWorker, type DocumentType, type IssuerSession, type Worker } from '@/data'
import type { WorkerFormValues } from '@/features/emisor/trabajadores/workerSchema'

export type RegisterError = 'duplicate' | 'failed' | null

export const useRegisterWorker = ({ entityId }: IssuerSession) => {
  const [blocked, setBlocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<RegisterError>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    getEntity(entityId)
      .then((entity) => {
        if (!cancelled && entity?.revokedAt) setBlocked(true)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [entityId])

  const register = useCallback(
    async (values: WorkerFormValues): Promise<Worker | null> => {
      if (submittingRef.current) return null
      submittingRef.current = true
      setSubmitting(true)
      setError(null)
      try {
        return await registerWorker(entityId, {
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
        setSubmitting(false)
      }
    },
    [entityId],
  )

  const clearError = useCallback(() => setError(null), [])

  return { blocked, submitting, error, register, clearError }
}
