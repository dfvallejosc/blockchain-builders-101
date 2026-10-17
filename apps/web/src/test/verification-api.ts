import { AxiosError } from 'axios'
import { apiClient } from '@/lib/api-client'

export const VALID_ID = 'd1eb3fd0-3e55-467c-b877-1e7c97a00f94'
export const EXPIRED_ID = '4a1c9e0b-5b0e-4f55-9b9e-0c6a8b1f2d11'
export const ANNULLED_ID = '7e2b1d4c-8f3a-4c6e-a1d9-3b5f6c7e8a90'
export const REVOKED_ID = '0c8d5e6f-1a2b-4c3d-8e4f-5a6b7c8d9e01'

const WORKER = { fullName: 'Carlos Andrés Ramírez Pineda', documentType: 'cc', documentNumber: '1020345678' }
const ENTITY = { name: 'Centro de Entrenamiento Cumbre Firme' }

const answer = (status: string, id: string, validUntil: string): unknown => ({
  status,
  certificate: { id, type: 'height-work', issuedAt: '2026-10-02', validUntil },
  worker: WORKER,
  entity: ENTITY,
})

const UNKNOWN_ANSWER = { status: 'invalid', reason: 'unknown-certificate' }

const ANSWERS: Record<string, unknown> = {
  [VALID_ID]: answer('valid', VALID_ID, '2027-10-02'),
  [EXPIRED_ID]: answer('expired', EXPIRED_ID, '2026-01-15'),
  [ANNULLED_ID]: answer('annulled', ANNULLED_ID, '2027-10-02'),
  [REVOKED_ID]: { status: 'invalid', reason: 'entity-revoked', entity: ENTITY },
}

export interface VerificationApiStub {
  // The ids that were asked for, in order.
  calls: string[]
  // Makes the next request fail as if there were no connection.
  failNext: () => void
  restore: () => void
}

// Stands in for the network under the real API client, so the tests still go through its interceptors and
// through the answer check. Unknown ids get the "unknown certificate" answer, like the real API.
export const installVerificationApi = (): VerificationApiStub => {
  const original = apiClient.defaults.adapter
  const calls: string[] = []
  let pendingFailures = 0

  apiClient.defaults.adapter = async (config) => {
    calls.push(decodeURIComponent((config.url ?? '').replace('/verification/', '')))
    if (pendingFailures > 0) {
      pendingFailures -= 1
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
    }
    const id = calls[calls.length - 1] ?? ''
    return { config, data: ANSWERS[id] ?? UNKNOWN_ANSWER, headers: {}, status: 200, statusText: 'OK' }
  }

  return {
    calls,
    failNext: () => {
      pendingFailures += 1
    },
    restore: () => {
      apiClient.defaults.adapter = original
    },
  }
}
