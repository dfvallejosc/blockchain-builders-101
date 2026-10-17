import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DataError } from '@/data/errors'
import { verifyCertificate } from '@/data/verification'
import { apiClient } from '@/lib/api-client'

const ID = 'd1eb3fd0-3e55-467c-b877-1e7c97a00f94'

const validBody = {
  status: 'valid',
  certificate: { id: ID, type: 'height-work', issuedAt: '2026-10-01', validUntil: '2027-10-01' },
  worker: { fullName: 'Ana María Pérez Gómez', documentType: 'cc', documentNumber: 'AB12345' },
  entity: { name: 'Centro de Entrenamiento Cumbre Firme' },
}

const respondWith = (data: unknown): AxiosAdapter => async (config) => ({
  config,
  data,
  headers: {},
  status: 200,
  statusText: 'OK',
})

const failWith = (status: number): AxiosAdapter => async (config) => {
  const response: AxiosResponse = { config, data: { message: 'internal detail' }, headers: {}, status, statusText: 'Failure' }
  throw new AxiosError('Request failed', AxiosError.ERR_BAD_RESPONSE, config, undefined, response)
}

const failWithoutResponse: AxiosAdapter = async (config) => {
  throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
}

describe('verifyCertificate', () => {
  const originalAdapter = apiClient.defaults.adapter
  let requests: InternalAxiosRequestConfig[]

  const useAdapter = (adapter: AxiosAdapter): void => {
    apiClient.defaults.adapter = async (config) => {
      requests.push(config)
      return adapter(config)
    }
  }

  beforeEach(() => {
    requests = []
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('asks the API for the certificate and answers what it says', async () => {
    useAdapter(respondWith(validBody))

    await expect(verifyCertificate(ID)).resolves.toEqual(validBody)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.method).toBe('get')
    expect(requests[0]?.url).toBe(`/verification/${ID}`)
  })

  it.each(['expired', 'annulled'])('answers %s as the API says it', async (status) => {
    const body = { ...validBody, status }
    useAdapter(respondWith(body))

    await expect(verifyCertificate(ID)).resolves.toEqual(body)
  })

  it('answers an unknown certificate', async () => {
    const body = { status: 'invalid', reason: 'unknown-certificate' }
    useAdapter(respondWith(body))

    await expect(verifyCertificate(ID)).resolves.toEqual(body)
  })

  it('answers a revoked entity with only its name', async () => {
    const body = { status: 'invalid', reason: 'entity-revoked', entity: { name: 'Centro de Entrenamiento Cumbre Firme' } }
    useAdapter(respondWith(body))

    await expect(verifyCertificate(ID)).resolves.toEqual(body)
  })

  it('drops any field it does not know, so the screen never shows something unexpected', async () => {
    useAdapter(respondWith({ ...validBody, fingerprint: 'secret', worker: { ...validBody.worker, diagnosis: 'x' } }))

    const result = await verifyCertificate(ID)

    expect(JSON.stringify(result)).not.toContain('secret')
    expect(JSON.stringify(result)).not.toContain('diagnosis')
  })

  describe('ids', () => {
    it.each(['', '   '])('answers not valid for the blank id %j without calling the API', async (id) => {
      useAdapter(respondWith(validBody))

      await expect(verifyCertificate(id)).resolves.toEqual({ status: 'invalid', reason: 'unknown-certificate' })
      expect(requests).toHaveLength(0)
    })

    it.each(['.', '..', '  ..  '])(
      'answers not valid for the id %j, which would otherwise climb out of the verification path',
      async (id) => {
        useAdapter(respondWith(validBody))

        await expect(verifyCertificate(id)).resolves.toEqual({ status: 'invalid', reason: 'unknown-certificate' })
        expect(requests).toHaveLength(0)
      },
    )

    it('trims the id', async () => {
      useAdapter(respondWith(validBody))

      await verifyCertificate(`  ${ID}  `)

      expect(requests[0]?.url).toBe(`/verification/${ID}`)
    })

    it('encodes characters that would change the path', async () => {
      useAdapter(respondWith({ status: 'invalid', reason: 'unknown-certificate' }))

      await verifyCertificate('a/b c?x=1#y')

      expect(requests[0]?.url).toBe('/verification/a%2Fb%20c%3Fx%3D1%23y')
    })
  })

  describe('when the answer cannot be trusted', () => {
    it.each([
      ['an HTML page from a proxy', '<html><body>Bad gateway</body></html>'],
      ['an empty body', null],
      ['an unknown status', { ...validBody, status: 'approved' }],
      ['a valid result without the worker', { status: 'valid', certificate: validBody.certificate, entity: validBody.entity }],
      ['an unknown certificate type', { ...validBody, certificate: { ...validBody.certificate, type: 'diving' } }],
      ['an invalid result with an unknown reason', { status: 'invalid', reason: 'because' }],
      ['a validity date that is not YYYY-MM-DD', { ...validBody, certificate: { ...validBody.certificate, validUntil: '2 de octubre' } }],
      ['an issue date that is not a date', { ...validBody, certificate: { ...validBody.certificate, issuedAt: '' } }],
    ])('fails instead of drawing %s', async (_name, body) => {
      useAdapter(respondWith(body))

      await expect(verifyCertificate(ID)).rejects.toMatchObject({ name: 'DataError', code: 'unknown' })
    })
  })

  describe('when the API fails', () => {
    it.each([500, 502, 503])('fails with unavailable on a %i, without the server detail', async (status) => {
      useAdapter(failWith(status))

      const error = await verifyCertificate(ID).catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(DataError)
      expect(error).toMatchObject({ code: 'unavailable' })
      expect(JSON.stringify(error)).not.toContain('internal detail')
    })

    it('fails with unavailable when there is no connection', async () => {
      useAdapter(failWithoutResponse)

      await expect(verifyCertificate(ID)).rejects.toMatchObject({ code: 'unavailable' })
    })
  })
})
