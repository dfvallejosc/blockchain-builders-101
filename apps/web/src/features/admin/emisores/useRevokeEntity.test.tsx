import { QueryObserver } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revokeIssuer } from '@/api/issuers'
import { DataError } from '@/data/errors'
import type { Entity } from '@/data/types'
import { useRevokeEntity } from '@/features/admin/emisores/useRevokeEntity'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

vi.mock('@/api/issuers', () => ({ revokeIssuer: vi.fn() }))

const REVOKED = { id: 'i-1', revokedAt: '2026-10-17' } as Entity

describe('useRevokeEntity', () => {
  beforeEach(() => {
    vi.mocked(revokeIssuer).mockReset()
  })

  it('revokes by id, returns the revoked issuer and refreshes the issuers', async () => {
    vi.mocked(revokeIssuer).mockResolvedValue(REVOKED)
    const client = createTestQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useRevokeEntity(), { wrapper: createQueryWrapper(client) })

    let revoked: Awaited<ReturnType<typeof result.current.revoke>> = null
    await act(async () => {
      revoked = await result.current.revoke('i-1')
    })

    expect(revoked).toBe(REVOKED)
    expect(revokeIssuer).toHaveBeenCalledWith('i-1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'issuers'] })
  })

  it.each([
    ['unavailable', new DataError('unavailable')],
    ['not-found', new DataError('not-found')],
    ['forbidden', new DataError('forbidden')],
    ['anything else', new Error('boom')],
  ])('returns null when the request fails with %s', async (_label, failure) => {
    vi.mocked(revokeIssuer).mockRejectedValue(failure)
    const { result } = renderHook(() => useRevokeEntity(), { wrapper: createQueryWrapper() })

    let revoked: Awaited<ReturnType<typeof result.current.revoke>> = REVOKED
    await act(async () => {
      revoked = await result.current.revoke('i-1')
    })

    expect(revoked).toBeNull()
  })

  it('returns session-ended when the session is over, so the screen shows nothing while it redirects', async () => {
    vi.mocked(revokeIssuer).mockRejectedValue(new DataError('unauthorized'))
    const { result } = renderHook(() => useRevokeEntity(), { wrapper: createQueryWrapper() })

    let revoked: Awaited<ReturnType<typeof result.current.revoke>> = null
    await act(async () => {
      revoked = await result.current.revoke('i-1')
    })

    expect(revoked).toBe('session-ended')
  })

  it('answers busy and sends one request when it is called twice while the first is in flight', async () => {
    let resolve: (entity: Entity) => void = () => undefined
    vi.mocked(revokeIssuer).mockReturnValue(new Promise<Entity>((done) => (resolve = done)))
    const { result } = renderHook(() => useRevokeEntity(), { wrapper: createQueryWrapper() })

    let first!: Promise<Awaited<ReturnType<typeof result.current.revoke>>>
    let second: Awaited<ReturnType<typeof result.current.revoke>> = null
    await act(async () => {
      first = result.current.revoke('i-1')
      second = await result.current.revoke('i-1')
    })
    await act(async () => {
      resolve(REVOKED)
      await first
    })

    expect(second).toBe('busy')
    expect(revokeIssuer).toHaveBeenCalledTimes(1)
  })

  it('answers as soon as the revocation is applied, without waiting for the open screens to reload', async () => {
    vi.mocked(revokeIssuer).mockResolvedValue(REVOKED)
    const client = createTestQueryClient()
    // An open detail screen whose reload is slow: refreshing it must not hold back the answer.
    const slowDetail = new QueryObserver(client, {
      queryKey: ['admin', 'issuers', 'i-1'],
      queryFn: () => new Promise<never>(() => undefined),
    })
    const unsubscribe = slowDetail.subscribe(() => undefined)
    const { result } = renderHook(() => useRevokeEntity(), { wrapper: createQueryWrapper(client) })

    let outcome: unknown
    await act(async () => {
      outcome = await Promise.race([result.current.revoke('i-1'), new Promise((resolve) => setTimeout(() => resolve('waiting'), 300))])
    })
    unsubscribe()

    expect(outcome).toBe(REVOKED)
  })
})
