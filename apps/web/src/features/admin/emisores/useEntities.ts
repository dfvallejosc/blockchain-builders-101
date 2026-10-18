import { useQuery } from '@tanstack/react-query'
import { listIssuers } from '@/api/issuers'
import type { Entity } from '@/data'
import { ISSUERS_KEY } from '@/features/admin/emisores/queryKeys'

export type EntitiesState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; entities: Entity[] }

export const useEntities = () => {
  const query = useQuery({ queryKey: ISSUERS_KEY, queryFn: listIssuers })
  const { refetch } = query

  const load: EntitiesState = query.data
    ? { phase: 'ready', entities: query.data }
    : query.isError && !query.isFetching
      ? { phase: 'error' }
      : { phase: 'loading' }

  return { load, retry: () => void refetch() }
}
