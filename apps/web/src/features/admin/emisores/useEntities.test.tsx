import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listIssuers } from '@/api/issuers'
import { DataError } from '@/data/errors'
import type { Entity } from '@/data/types'
import { useEntities } from '@/features/admin/emisores/useEntities'
import { createQueryWrapper } from '@/test/query'

vi.mock('@/api/issuers', () => ({ listIssuers: vi.fn() }))

const ENTITY = { id: 'i-1', name: 'Entidad' } as Entity

describe('useEntities', () => {
  beforeEach(() => {
    vi.mocked(listIssuers).mockReset()
  })

  it('starts loading and then returns the issuers', async () => {
    vi.mocked(listIssuers).mockResolvedValue([ENTITY])

    const { result } = renderHook(() => useEntities(), { wrapper: createQueryWrapper() })

    expect(result.current.load).toEqual({ phase: 'loading' })
    await waitFor(() => expect(result.current.load).toEqual({ phase: 'ready', entities: [ENTITY] }))
  })

  it('returns the error phase and loads again on retry', async () => {
    vi.mocked(listIssuers).mockRejectedValueOnce(new DataError('unavailable'))
    vi.mocked(listIssuers).mockResolvedValueOnce([ENTITY])
    const { result } = renderHook(() => useEntities(), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.load).toEqual({ phase: 'error' }))

    result.current.retry()

    await waitFor(() => expect(result.current.load).toEqual({ phase: 'ready', entities: [ENTITY] }))
  })
})
