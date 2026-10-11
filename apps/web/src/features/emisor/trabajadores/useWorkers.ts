import { useCallback, useEffect, useState } from 'react'
import { DataError, getEntity, listWorkers, type Entity, type Worker } from '@/data'

export type WorkersState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; entity: Entity; workers: Worker[] }

const fetchAll = async (entityId: string) => {
  const [entity, workers] = await Promise.all([getEntity(entityId), listWorkers(entityId)])
  if (!entity) throw new DataError('not-found')
  return { entity, workers }
}

export const useWorkers = (entityId: string) => {
  const [load, setLoad] = useState<WorkersState>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchAll(entityId)
      .then((data) => {
        if (!cancelled) setLoad({ phase: 'ready', ...data })
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [entityId, attempt])

  const retry = useCallback(() => {
    setLoad({ phase: 'loading' })
    setAttempt((current) => current + 1)
  }, [])

  return { load, retry }
}
