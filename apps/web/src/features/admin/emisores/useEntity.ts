import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getIssuer } from '@/api/issuers'
import { DataError, type Entity } from '@/data'
import { issuerKey } from '@/features/admin/emisores/queryKeys'

export type EntityState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'not-found' }
  | { phase: 'ready'; entity: Entity }

export const useEntity = (id: string) => {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: issuerKey(id), queryFn: () => getIssuer(id) })
  const { refetch } = query

  const load: EntityState = query.data
    ? { phase: 'ready', entity: query.data }
    : query.isError && !query.isFetching
      ? query.error instanceof DataError && query.error.code === 'not-found'
        ? { phase: 'not-found' }
        : { phase: 'error' }
      : { phase: 'loading' }

  const replace = useCallback(
    (entity: Entity) => queryClient.setQueryData(issuerKey(id), entity),
    [id, queryClient],
  )

  return { load, retry: () => void refetch(), replace }
}
