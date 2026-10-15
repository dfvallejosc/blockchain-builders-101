import { useCallback, useEffect, useState } from 'react'
import { listEntities, type Entity } from '@/data'

export type EntitiesState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; entities: Entity[] }

export const useEntities = () => {
  const [load, setLoad] = useState<EntitiesState>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    listEntities()
      .then((entities) => {
        if (!cancelled) setLoad({ phase: 'ready', entities })
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setLoad({ phase: 'loading' })
    setAttempt((current) => current + 1)
  }, [])

  return { load, retry }
}
