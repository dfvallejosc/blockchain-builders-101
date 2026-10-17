import { useQuery } from '@tanstack/react-query'
import { listWorkers } from '@/api/workers'
import type { Worker } from '@/data'

export const WORKERS_KEY = ['issuer', 'workers'] as const

export type WorkersState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; workers: Worker[] }

export const useWorkersQuery = () => useQuery({ queryKey: WORKERS_KEY, queryFn: listWorkers })

export const useWorkers = () => {
  const query = useWorkersQuery()
  const { refetch } = query

  const load: WorkersState = query.data
    ? { phase: 'ready', workers: query.data }
    : query.isError && !query.isFetching
      ? { phase: 'error' }
      : { phase: 'loading' }

  return { load, retry: () => void refetch() }
}
