import { useCallback, useEffect, useState } from 'react'
import { verifyCertificate, type VerificationResult } from '@/data'

export type VerificationState =
  | { phase: 'loading' }
  | { phase: 'done'; result: VerificationResult }
  | { phase: 'error' }

export const useVerification = (id: string) => {
  const [state, setState] = useState<VerificationState>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    verifyCertificate(id)
      .then((result) => {
        if (!cancelled) setState({ phase: 'done', result })
      })
      .catch(() => {
        if (!cancelled) setState({ phase: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [id, attempt])

  const retry = useCallback(() => {
    setState({ phase: 'loading' })
    setAttempt((current) => current + 1)
  }, [])

  return { state, retry }
}
