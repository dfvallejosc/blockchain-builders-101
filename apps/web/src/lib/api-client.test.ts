import axios, { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { DataError } from '@/data/errors'
import { apiClient, createApiClient, setTokenProvider } from '@/lib/api-client'

const successAdapter = (inspect?: AxiosAdapter): AxiosAdapter => async (config) => {
  if (inspect) return inspect(config)

  return {
    config,
    data: null,
    headers: {},
    status: 200,
    statusText: 'OK',
  }
}

const failureAdapter = (status: number, data?: unknown): AxiosAdapter => async (config) => {
  const response: AxiosResponse = {
    config,
    data,
    headers: {},
    status,
    statusText: 'Failure',
  }

  throw new AxiosError('Request failed', AxiosError.ERR_BAD_RESPONSE, config, undefined, response)
}

describe('api client', () => {
  afterEach(() => {
    setTokenProvider(null)
  })

  it('waits 10 seconds for a read', async () => {
    let timeout: unknown
    const client = createApiClient()

    await client.get('/probe', { adapter: successAdapter((config) => { timeout = config.timeout; return successAdapter()(config) }) })

    expect(timeout).toBe(10_000)
  })

  it.each(['post', 'put', 'patch', 'delete'] as const)('waits 30 seconds for a %s, which can write to the network', async (method) => {
    let timeout: unknown
    const client = createApiClient()

    await client.request({ method, url: '/probe', adapter: successAdapter((config) => { timeout = config.timeout; return successAdapter()(config) }) })

    expect(timeout).toBe(30_000)
  })

  it('adds the bearer token from its provider', async () => {
    let authorization: unknown
    const client = createApiClient({ getToken: async () => 'session-token' })

    await client.get('/probe', {
      adapter: successAdapter((config) => {
        authorization = config.headers.get('Authorization')
        return Promise.resolve({ config, data: null, headers: {}, status: 200, statusText: 'OK' })
      }),
    })

    expect(authorization).toBe('Bearer session-token')
  })

  it.each([null, ''])('omits Authorization when token is %s', async (token) => {
    let authorization: unknown
    const client = createApiClient({ getToken: async () => token })

    await client.get('/probe', {
      adapter: successAdapter((config) => {
        authorization = config.headers.get('Authorization')
        return Promise.resolve({ config, data: null, headers: {}, status: 200, statusText: 'OK' })
      }),
    })

    expect(authorization).toBeUndefined()
  })

  it('omits Authorization when no provider is configured', async () => {
    let authorization: unknown
    const client = createApiClient()

    await client.get('/probe', {
      adapter: successAdapter((config) => {
        authorization = config.headers.get('Authorization')
        return Promise.resolve({ config, data: null, headers: {}, status: 200, statusText: 'OK' })
      }),
    })

    expect(authorization).toBeUndefined()
  })

  it('maps API 503 to unavailable', async () => {
    const client = createApiClient()

    await expect(client.get('/probe', { adapter: failureAdapter(503) }))
      .rejects.toEqual(new DataError('unavailable'))
  })

  it('maps issuer-revoked 403 to entity-revoked', async () => {
    const client = createApiClient()

    await expect(client.get('/probe', { adapter: failureAdapter(403, { code: 'issuer-revoked' }) }))
      .rejects.toEqual(new DataError('entity-revoked'))
  })

  it('preserves cancellation errors', async () => {
    const controller = new AbortController()
    controller.abort()
    const client = createApiClient()
    let caught: unknown

    try {
      await client.get('/probe', { adapter: successAdapter(), signal: controller.signal })
    } catch (error) {
      caught = error
    }

    expect(axios.isCancel(caught)).toBe(true)
    expect(caught).not.toBeInstanceOf(DataError)
  })

  it('maps a failing token provider to unauthorized', async () => {
    const client = createApiClient({ getToken: async () => { throw new Error('token unavailable') } })

    await expect(client.get('/probe', { adapter: successAdapter() }))
      .rejects.toEqual(new DataError('unauthorized'))
  })

  it('uses and removes the provider on the default instance', async () => {
    const readAuthorization = async (): Promise<unknown> => {
      let authorization: unknown

      await apiClient.get('/probe', {
        adapter: successAdapter((config) => {
          authorization = config.headers.get('Authorization')
          return Promise.resolve({ config, data: null, headers: {}, status: 200, statusText: 'OK' })
        }),
      })

      return authorization
    }

    setTokenProvider(async () => 'default-token')
    expect(await readAuthorization()).toBe('Bearer default-token')

    setTokenProvider(null)
    expect(await readAuthorization()).toBeUndefined()
  })
})
