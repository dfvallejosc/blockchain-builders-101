import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useVerification } from '@/features/verificar/useVerification'
import { installVerificationApi, VALID_ID, type VerificationApiStub } from '@/test/verification-api'

describe('useVerification', () => {
  let api: VerificationApiStub

  beforeEach(() => {
    api = installVerificationApi()
  })

  afterEach(() => {
    api.restore()
  })

  it('starts loading and then returns the result', async () => {
    const { result } = renderHook(() => useVerification(VALID_ID))

    expect(result.current.state).toEqual({ phase: 'loading' })
    await waitFor(() => expect(result.current.state.phase).toBe('done'))
    expect(result.current.state).toMatchObject({ phase: 'done', result: { status: 'valid' } })
  })

  it('returns the error phase, not an invalid result, when the query fails', async () => {
    api.failNext()
    const { result } = renderHook(() => useVerification(VALID_ID))

    await waitFor(() => expect(result.current.state).toEqual({ phase: 'error' }))
  })

  it('queries again on retry', async () => {
    api.failNext()
    const { result } = renderHook(() => useVerification(VALID_ID))
    await waitFor(() => expect(result.current.state.phase).toBe('error'))

    act(() => result.current.retry())

    expect(result.current.state).toEqual({ phase: 'loading' })
    await waitFor(() => expect(result.current.state.phase).toBe('done'))
    expect(api.calls).toEqual([VALID_ID, VALID_ID])
  })
})
