import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listCertificates } from '@/api/certificates'
import { listWorkers } from '@/api/workers'
import type { Certificate, Worker } from '@/data/types'
import { useCertificates } from '@/features/emisor/certificados/useCertificates'
import { createQueryWrapper } from '@/test/query'

vi.mock('@/api/certificates', () => ({ listCertificates: vi.fn(), annulCertificate: vi.fn() }))
vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(), registerWorker: vi.fn() }))

const WORKER: Worker = {
  id: 'w-1',
  entityId: 'e-1',
  fullName: 'Carlos Andrés Ramírez Pineda',
  documentType: 'cc',
  documentNumber: '1020345678',
  registeredAt: '2026-09-01',
  consentedAt: '2026-09-01',
}

const CERTIFICATE: Certificate = {
  number: 4718,
  id: '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c',
  entityId: 'e-1',
  workerId: 'w-1',
  type: 'height-work',
  issuedAt: '2026-10-02',
  validUntil: '2027-10-02',
  annulledAt: null,
}

describe('useCertificates', () => {
  beforeEach(() => {
    vi.mocked(listCertificates).mockReset().mockResolvedValue([CERTIFICATE])
    vi.mocked(listWorkers).mockReset().mockResolvedValue([WORKER])
  })

  it('starts loading and then gives the workers and certificates of the API', async () => {
    const view = renderHook(() => useCertificates(), { wrapper: createQueryWrapper() })

    expect(view.result.current.load.phase).toBe('loading')
    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))

    expect(view.result.current.load).toEqual({ phase: 'ready', workers: [WORKER], certificates: [CERTIFICATE] })
    expect(listCertificates).toHaveBeenCalledTimes(1)
    expect(listWorkers).toHaveBeenCalledTimes(1)
  })

  it('goes to error when loading fails and recovers on retry', async () => {
    vi.mocked(listCertificates).mockRejectedValueOnce(new Error('boom'))
    const view = renderHook(() => useCertificates(), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(view.result.current.load.phase).toBe('error'))
    act(() => view.result.current.retry())

    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))
    expect(listCertificates).toHaveBeenCalledTimes(2)
  })

  it('goes to error when the workers fail to load', async () => {
    vi.mocked(listWorkers).mockRejectedValueOnce(new Error('boom'))
    const view = renderHook(() => useCertificates(), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(view.result.current.load.phase).toBe('error'))
  })
})
