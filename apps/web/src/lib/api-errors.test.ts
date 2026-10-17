import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { DataError } from '@/data/errors'
import { mapApiError } from '@/lib/api-errors'

const axiosError = (status?: number, data?: unknown, code?: string): AxiosError => {
  const response = status === undefined
    ? undefined
    : { status, data } as AxiosResponse

  return new AxiosError('request failed', code, { headers: new AxiosHeaders() }, undefined, response)
}

describe('mapApiError', () => {
  it('maps a revoked issuer response to entity-revoked', () => {
    const result = mapApiError(axiosError(403, { code: 'issuer-revoked' }))

    expect(result).toBeInstanceOf(DataError)
    expect(result.code).toBe('entity-revoked')
  })

  it.each([
    [404, 'not-found'],
    [409, 'duplicate'],
    [400, 'invalid-input'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [500, 'unavailable'],
    [502, 'unavailable'],
    [503, 'unavailable'],
    [418, 'unknown'],
  ] as const)('maps HTTP %i to %s', (status, expectedCode) => {
    const result = mapApiError(axiosError(status))

    expect(result).toBeInstanceOf(DataError)
    expect(result.code).toBe(expectedCode)
  })

  it.each([
    ['missing body', undefined],
    ['string body', 'issuer-revoked'],
    ['non-revocation body code', { code: 'other-error' }],
  ])('maps a 403 with %s to forbidden', (_description, data) => {
    const result = mapApiError(axiosError(403, data))

    expect(result).toBeInstanceOf(DataError)
    expect(result.code).toBe('forbidden')
  })

  it('maps a network error and a timeout to unavailable', () => {
    const networkResult = mapApiError(axiosError())
    const timeoutResult = mapApiError(axiosError(undefined, undefined, 'ECONNABORTED'))

    expect(networkResult).toBeInstanceOf(DataError)
    expect(networkResult.code).toBe('unavailable')
    expect(timeoutResult).toBeInstanceOf(DataError)
    expect(timeoutResult.code).toBe('unavailable')
  })

  it.each(['request failed', undefined])('maps non-Axios value %s to unknown', (error) => {
    const result = mapApiError(error)

    expect(result).toBeInstanceOf(DataError)
    expect(result.code).toBe('unknown')
  })

  it('returns an existing DataError unchanged', () => {
    const error = new DataError('not-found')

    expect(mapApiError(error)).toBe(error)
  })

  it('uses only the code as the message and never leaks API details', () => {
    const result = mapApiError(axiosError(400, { message: 'secret detail' }))

    expect(result.message).toBe('invalid-input')
  })
})
