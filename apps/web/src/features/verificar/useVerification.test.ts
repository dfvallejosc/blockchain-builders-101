import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetState } from '@/data'
import { verifyCertificate } from '@/data/verification'
import { useVerification } from '@/features/verificar/useVerification'

vi.mock('@/data/verification', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/verification')>()
  return { verifyCertificate: vi.fn(actual.verifyCertificate) }
})

describe('useVerification', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
  })

  it('starts loading and then returns the result', async () => {
    const { result } = renderHook(() => useVerification('HAB-2026-004718'))

    expect(result.current.state).toEqual({ phase: 'loading' })
    await waitFor(() => expect(result.current.state.phase).toBe('done'))
  })

  it('returns the error phase, not an invalid result, when the query fails', async () => {
    vi.mocked(verifyCertificate).mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => useVerification('HAB-2026-004718'))

    await waitFor(() => expect(result.current.state).toEqual({ phase: 'error' }))
  })

  it('queries again on retry', async () => {
    vi.mocked(verifyCertificate).mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => useVerification('HAB-2026-004718'))
    await waitFor(() => expect(result.current.state.phase).toBe('error'))

    act(() => result.current.retry())

    expect(result.current.state).toEqual({ phase: 'loading' })
    await waitFor(() => expect(result.current.state.phase).toBe('done'))
  })
})
