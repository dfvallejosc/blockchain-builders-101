import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIssuer } from '@/api/issuers'
import { DataError } from '@/data/errors'
import type { Entity } from '@/data/types'
import { useEntity } from '@/features/admin/emisores/useEntity'
import { createQueryWrapper } from '@/test/query'

vi.mock('@/api/issuers', () => ({ getIssuer: vi.fn() }))

const ENTITY = { id: 'i-1', name: 'Entidad', revokedAt: null } as Entity

describe('useEntity', () => {
  beforeEach(() => {
    vi.mocked(getIssuer).mockReset()
  })

  it('asks for the issuer by id and returns it', async () => {
    vi.mocked(getIssuer).mockResolvedValue(ENTITY)

    const { result } = renderHook(() => useEntity('i-1'), { wrapper: createQueryWrapper() })

    expect(result.current.load).toEqual({ phase: 'loading' })
    await waitFor(() => expect(result.current.load).toEqual({ phase: 'ready', entity: ENTITY }))
    expect(getIssuer).toHaveBeenCalledWith('i-1')
  })

  it('returns not-found for a 404, and not the error phase', async () => {
    vi.mocked(getIssuer).mockRejectedValue(new DataError('not-found'))

    const { result } = renderHook(() => useEntity('no-es-un-uuid'), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.load).toEqual({ phase: 'not-found' }))
  })

  it('returns the error phase for any other failure and loads again on retry', async () => {
    vi.mocked(getIssuer).mockRejectedValueOnce(new DataError('unavailable'))
    vi.mocked(getIssuer).mockResolvedValueOnce(ENTITY)
    const { result } = renderHook(() => useEntity('i-1'), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.load).toEqual({ phase: 'error' }))

    result.current.retry()

    await waitFor(() => expect(result.current.load.phase).toBe('ready'))
  })

  it('shows a replaced issuer without asking the server again', async () => {
    vi.mocked(getIssuer).mockResolvedValue(ENTITY)
    const { result } = renderHook(() => useEntity('i-1'), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.load.phase).toBe('ready'))
    const revoked = { ...ENTITY, revokedAt: '2026-10-17' }

    act(() => result.current.replace(revoked))

    // React Query notifies on its next tick.
    await waitFor(() => expect(result.current.load).toEqual({ phase: 'ready', entity: revoked }))
    expect(getIssuer).toHaveBeenCalledTimes(1)
  })
})
