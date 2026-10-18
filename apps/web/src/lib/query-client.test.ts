import { onlineManager, useQuery, QueryClient } from '@tanstack/react-query'
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

  it('does not pause queries or mutations while offline, so the screens can show the failure', () => {
    const options = createQueryClient().getDefaultOptions()

    expect(options.queries?.networkMode).toBe('always')
    expect(options.mutations?.networkMode).toBe('always')
  })

  it('fails a query instead of leaving it paused when the browser reports it is offline', async () => {
    onlineManager.setOnline(false)
    try {
      const outcome = await Promise.race([
        createQueryClient()
          .fetchQuery({ queryKey: ['offline'], queryFn: () => Promise.reject(new DataError('unavailable')), retry: false })
          .then(() => 'resolved', (error: unknown) => error),
        new Promise((resolve) => setTimeout(() => resolve('paused'), 300)),
      ])

      expect(outcome).toBeInstanceOf(DataError)
    } finally {
      onlineManager.setOnline(true)
    }
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
