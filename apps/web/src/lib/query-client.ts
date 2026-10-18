import { QueryClient } from '@tanstack/react-query'
import { DataError } from '@/data/errors'

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // The default pauses requests while the browser says it is offline: the screens would wait forever
        // instead of showing their failure state. Axios fails by itself when there is no connection.
        networkMode: 'always',
        retry: (failureCount, error) =>
          failureCount < 1 && error instanceof DataError && error.code === 'unavailable',
        refetchOnWindowFocus: false,
      },
      mutations: {
        networkMode: 'always',
        retry: false,
      },
    },
  })
