import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listWorkers, registerWorker } from '@/api/workers'
import { apiClient } from '@/lib/api-client'
import type { NewWorkerInput } from '@/data/types'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

describe('workers api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists workers with GET /workers', async () => {
    const workers = [{ id: 'w1' }]
    vi.mocked(apiClient.get).mockResolvedValue({ data: workers })

    await expect(listWorkers()).resolves.toBe(workers)
    expect(apiClient.get).toHaveBeenCalledWith('/workers')
  })

  it('registers a worker with POST /workers and the input body', async () => {
    const input: NewWorkerInput = {
      fullName: 'Ana Pérez',
      documentType: 'cc',
      documentNumber: '123',
      dataConsent: true,
    }
    const worker = { id: 'w1' }
    vi.mocked(apiClient.post).mockResolvedValue({ data: worker })

    await expect(registerWorker(input)).resolves.toBe(worker)
    expect(apiClient.post).toHaveBeenCalledWith('/workers', {
      fullName: 'Ana Pérez',
      documentType: 'cc',
      documentNumber: '123',
      dataConsent: true,
    })
  })
})
