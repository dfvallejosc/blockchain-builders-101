import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetState } from '@/data'
import * as workersModule from '@/data/workers'
import { useWorkers } from '@/features/emisor/trabajadores/useWorkers'

vi.mock('@/data/workers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/workers')>()
  return { ...actual, listWorkers: vi.fn(actual.listWorkers) }
})

const CUMBRE = 'centro-entrenamiento-cumbre-firme'

describe('useWorkers', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    resetState()
    const actual = await vi.importActual<typeof import('@/data/workers')>('@/data/workers')
    vi.mocked(workersModule.listWorkers).mockReset()
    vi.mocked(workersModule.listWorkers).mockImplementation(actual.listWorkers)
  })

  it('starts loading and then gives the entity and its workers', async () => {
    const view = renderHook(() => useWorkers(CUMBRE))

    expect(view.result.current.load.phase).toBe('loading')
    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))

    const load = view.result.current.load
    if (load.phase !== 'ready') throw new Error('expected ready')
    expect(load.entity.id).toBe(CUMBRE)
    expect(load.workers).toHaveLength(12)
    expect(workersModule.listWorkers).toHaveBeenCalledWith(CUMBRE)
  })

  it('goes to error when the entity does not exist', async () => {
    const view = renderHook(() => useWorkers('no-existe'))

    await waitFor(() => expect(view.result.current.load.phase).toBe('error'))
  })

  it('goes to error when loading fails and recovers on retry', async () => {
    vi.mocked(workersModule.listWorkers).mockRejectedValueOnce(new Error('boom'))
    const view = renderHook(() => useWorkers(CUMBRE))

    await waitFor(() => expect(view.result.current.load.phase).toBe('error'))
    act(() => view.result.current.retry())
    expect(view.result.current.load.phase).toBe('loading')
    await waitFor(() => expect(view.result.current.load.phase).toBe('ready'))
  })
})
