import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerWorker } from '@/api/workers'
import { DataError } from '@/data/errors'
import type { Worker } from '@/data/types'
import { useRegisterWorker } from '@/features/emisor/trabajadores/useRegisterWorker'
import type { WorkerFormValues } from '@/features/emisor/trabajadores/workerSchema'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(), registerWorker: vi.fn() }))

const VALUES: WorkerFormValues = {
  fullName: 'Marta Lucía Gómez Ríos',
  documentType: 'cc',
  documentNumber: '1037456789',
  dataConsent: true,
}

const CREATED: Worker = {
  id: 'w-new',
  entityId: 'e-1',
  fullName: VALUES.fullName,
  documentType: 'cc',
  documentNumber: VALUES.documentNumber,
  registeredAt: '2026-10-09',
  consentedAt: '2026-10-09',
}

const setup = (client: QueryClient = createTestQueryClient()) =>
  renderHook(() => useRegisterWorker(), { wrapper: createQueryWrapper(client) })

describe('useRegisterWorker', () => {
  beforeEach(() => {
    vi.mocked(registerWorker).mockReset()
  })

  it('sends the worker data, returns the created worker and refreshes the workers list', async () => {
    vi.mocked(registerWorker).mockResolvedValue(CREATED)
    const client = createTestQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = setup(client)

    let worker: Worker | null = null
    await act(async () => {
      worker = await result.current.register(VALUES)
    })

    expect(worker).toEqual(CREATED)
    expect(registerWorker).toHaveBeenCalledWith({
      fullName: VALUES.fullName,
      documentType: 'cc',
      documentNumber: VALUES.documentNumber,
      dataConsent: true,
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['issuer', 'workers'] })
    expect(result.current.error).toBeNull()
  })

  it('reports duplicate only for the duplicate error code', async () => {
    vi.mocked(registerWorker).mockRejectedValue(new DataError('duplicate'))
    const { result } = setup()

    await act(async () => {
      expect(await result.current.register(VALUES)).toBeNull()
    })

    expect(result.current.error).toBe('duplicate')
    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()
  })

  it('reports a generic failure for any other error', async () => {
    vi.mocked(registerWorker).mockRejectedValue(new DataError('unavailable'))
    const { result } = setup()

    await act(async () => {
      expect(await result.current.register(VALUES)).toBeNull()
    })

    expect(result.current.error).toBe('failed')
  })

  it('sends one request when register is called twice while one is in flight', async () => {
    let resolve: (worker: Worker) => void = () => undefined
    vi.mocked(registerWorker).mockImplementation(
      () =>
        new Promise<Worker>((done) => {
          resolve = done
        }),
    )
    const { result } = setup()

    let first: Promise<Worker | null> = Promise.resolve(null)
    let second: Worker | null = CREATED
    act(() => {
      first = result.current.register(VALUES)
    })
    await act(async () => {
      second = await result.current.register(VALUES)
    })
    await waitFor(() => expect(result.current.submitting).toBe(true))
    await act(async () => {
      resolve(CREATED)
      await first
    })

    expect(second).toBeNull()
    expect(registerWorker).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(result.current.submitting).toBe(false))
  })
})
