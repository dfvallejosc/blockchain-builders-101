import { useQuery, QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataError } from '@/data/errors'
import { createQueryClient } from '@/lib/query-client'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

describe('createQueryClient', () => {
  it('retries an unavailable DataError once', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry

    expect(retry).toBeTypeOf('function')
    if (typeof retry !== 'function') return

    expect(retry(0, new DataError('unavailable'))).toBe(true)
    expect(retry(1, new DataError('unavailable'))).toBe(false)
  })

  it('does not retry other errors', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry

    expect(retry).toBeTypeOf('function')
    if (typeof retry !== 'function') return

    expect(retry(0, new DataError('not-found'))).toBe(false)
    expect(retry(0, new Error('unavailable'))).toBe(false)
  })

  it('disables mutation retries and window-focus refetching', () => {
    const options = createQueryClient().getDefaultOptions()

    expect(options.mutations?.retry).toBe(false)
    expect(options.queries?.refetchOnWindowFocus).toBe(false)
  })

  it('returns a QueryClient', () => {
    expect(createQueryClient()).toBeInstanceOf(QueryClient)
  })

  it('provides a working QueryClient to a hook', async () => {
    const { result } = renderHook(
      () => useQuery({ queryKey: ['test'], queryFn: async () => 'resolved' }),
      { wrapper: createQueryWrapper(createTestQueryClient()) },
    )

    await waitFor(() => expect(result.current.data).toBe('resolved'))
  })
})
