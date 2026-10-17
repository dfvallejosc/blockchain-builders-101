import axios, { type AxiosInstance } from 'axios'
import { DataError } from '@/data/errors'
import { mapApiError } from '@/lib/api-errors'

export type TokenProvider = () => Promise<string | null>

type ApiClientOptions = {
  baseURL?: string
  getToken?: TokenProvider
}

let defaultTokenProvider: TokenProvider | null = null

export const createApiClient = (options: ApiClientOptions = {}): AxiosInstance => {
  const client = axios.create({
    baseURL: options.baseURL ?? import.meta.env.VITE_API_URL,
    timeout: 10_000,
  })

  client.interceptors.request.use(async (config) => {
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
