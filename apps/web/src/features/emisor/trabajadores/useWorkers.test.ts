import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listWorkers } from '@/api/workers'
import type { Worker } from '@/data/types'
import { useWorkers } from '@/features/emisor/trabajadores/useWorkers'
import { createQueryWrapper } from '@/test/query'

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

describe('useWorkers', () => {
  beforeEach(() => {
    vi.mocked(listWorkers).mockReset()
  })

  it('starts loading and then gives the workers of the API', async () => {
    vi.mocked(listWorkers).mockResolvedValue([WORKER])
    const view = renderHook(() => useWorkers(), { wrapper: createQueryWrapper() })

    expect(view.result.current.load.phase).toBe('loading')
    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))

    expect(view.result.current.load).toEqual({ phase: 'ready', workers: [WORKER] })
    expect(listWorkers).toHaveBeenCalledTimes(1)
  })

  it('goes to error when loading fails and recovers on retry', async () => {
    vi.mocked(listWorkers).mockRejectedValueOnce(new Error('boom')).mockResolvedValue([WORKER])
    const view = renderHook(() => useWorkers(), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(view.result.current.load.phase).toBe('error'))
    act(() => view.result.current.retry())

    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))
    expect(listWorkers).toHaveBeenCalledTimes(2)
  })
})
