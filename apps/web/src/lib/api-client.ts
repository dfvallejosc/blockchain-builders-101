import axios, { type AxiosInstance } from 'axios'
import { DataError } from '@/data/errors'
import { mapApiError } from '@/lib/api-errors'

export type TokenProvider = () => Promise<string | null>

type ApiClientOptions = {
  baseURL?: string
  getToken?: TokenProvider
}

// A write may wait for the network to confirm it. The API gives that 20 seconds, so the browser must wait longer
// than that or it reports a failure for something the server then finishes.
const READ_TIMEOUT_MS = 10_000
const WRITE_TIMEOUT_MS = 30_000
const WRITE_METHODS = ['post', 'put', 'patch', 'delete']

let defaultTokenProvider: TokenProvider | null = null

export const createApiClient = (options: ApiClientOptions = {}): AxiosInstance => {
  const client = axios.create({
    baseURL: options.baseURL ?? import.meta.env.VITE_API_URL,
    timeout: READ_TIMEOUT_MS,
  })

  client.interceptors.request.use(async (config) => {
    if (WRITE_METHODS.includes(config.method?.toLowerCase() ?? '')) config.timeout = WRITE_TIMEOUT_MS
    try {
      const token = await options.getToken?.()
      if (token) config.headers.set('Authorization', `Bearer ${token}`)
      return config
    } catch {
      return Promise.reject(new DataError('unauthorized'))
    }
  })

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isCancel(error)) return Promise.reject(error)
      return Promise.reject(mapApiError(error))
    },
  )

  return client
}

export const apiClient = createApiClient({
  getToken: async () => defaultTokenProvider ? defaultTokenProvider() : null,
})

export const setTokenProvider = (provider: TokenProvider | null): void => {
  defaultTokenProvider = provider
}
