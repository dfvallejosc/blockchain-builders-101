import { useCallback, useEffect, useState } from 'react'
import { getEntity, type Entity } from '@/data'

export type EntityState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'not-found' }
  | { phase: 'ready'; entity: Entity }

export const useEntity = (id: string) => {
  const [load, setLoad] = useState<EntityState>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getEntity(id)
      .then((entity) => {
        if (!cancelled) setLoad(entity ? { phase: 'ready', entity } : { phase: 'not-found' })
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [id, attempt])

  const retry = useCallback(() => {
    setLoad({ phase: 'loading' })
    setAttempt((current) => current + 1)
  }, [])

  const replace = useCallback((entity: Entity) => setLoad({ phase: 'ready', entity }), [])

  return { load, retry, replace }
}
