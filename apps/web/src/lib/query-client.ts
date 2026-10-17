import { QueryClient } from '@tanstack/react-query'
import { DataError } from '@/data/errors'

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < 1 && error instanceof DataError && error.code === 'unavailable',
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
