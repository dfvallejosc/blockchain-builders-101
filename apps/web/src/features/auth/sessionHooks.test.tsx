import { QueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, useLocation } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataError } from '@/data/errors'
import { useEndSession, useSessionErrorHandler, useTokenProvider } from '@/features/auth/sessionHooks'
import { setTokenProvider } from '@/lib/api-client'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

const clerk = vi.hoisted(() => ({ signOut: vi.fn(async () => undefined) }))

vi.mock('@clerk/react', () => ({ useAuth: () => ({ signOut: clerk.signOut }) }))
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()
  return { ...actual, setTokenProvider: vi.fn() }
})

const PROFILE_KEY = ['test', 'me'] as const

const LoginProbe = () => {
  const state = useLocation().state as { reason?: string } | null
  return <p>Login{state?.reason ? ` (${state.reason})` : ''}</p>
}

const Gate = ({ child }: { child: ReactNode }) => {
  const { ending, end } = useEndSession('/test/login')
  useSessionErrorHandler(end, PROFILE_KEY)
  return ending ? <p>Cerrando</p> : <>{child}</>
}

const FailingQuery = ({ queryKey, error }: { queryKey: readonly unknown[]; error: DataError }) => {
  useQuery({ queryKey, queryFn: () => Promise.reject(error) })
  return <p>Consultando</p>
}

const Mutation = ({ error }: { error: DataError }) => {
  const mutation = useMutation({ mutationFn: () => Promise.reject(error) })
  return (
    <button type="button" onClick={() => mutation.mutate()}>
      Guardar
    </button>
  )
}

const renderGate = (child: ReactNode, client: QueryClient = createTestQueryClient()) => {
  const router = createMemoryRouter(
    [
      { path: '/test/login', element: <LoginProbe /> },
      { path: '/test', element: <Gate child={child} /> },
    ],
    { initialEntries: ['/test'] },
  )
  render(<RouterProvider router={router} />, { wrapper: createQueryWrapper(client) })
  return router
}

describe('useTokenProvider', () => {
  beforeEach(() => vi.mocked(setTokenProvider).mockClear())

  it('gives the API client the token while mounted and removes it on unmount', async () => {
    const getToken = vi.fn(async () => 'a-token')

    const { unmount } = renderHook(() => useTokenProvider(getToken))

    const provider = vi.mocked(setTokenProvider).mock.calls.find(([candidate]) => candidate !== null)?.[0]
    await expect(provider?.()).resolves.toBe('a-token')
    unmount()
    expect(vi.mocked(setTokenProvider).mock.calls.at(-1)).toEqual([null])
  })
})

describe('useEndSession and useSessionErrorHandler', () => {
  beforeEach(() => clerk.signOut.mockClear())

  it('ends the session with the reason when a query fails with unauthorized, going to the given login path', async () => {
    const router = renderGate(<FailingQuery queryKey={['test', 'data']} error={new DataError('unauthorized')} />)

    expect(await screen.findByText('Login (expired)')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/test/login')
    expect(clerk.signOut).toHaveBeenCalledWith({ redirectUrl: '/test/login' })
  })

  it('ends the session when a mutation fails with unauthorized', async () => {
    renderGate(<Mutation error={new DataError('unauthorized')} />)

    screen.getByRole('button', { name: 'Guardar' }).click()

    expect(await screen.findByText('Login (expired)')).toBeInTheDocument()
  })

  it('treats forbidden as "no role" only for the profile query', async () => {
    renderGate(<FailingQuery queryKey={PROFILE_KEY} error={new DataError('forbidden')} />)

    expect(await screen.findByText('Login (no-role)')).toBeInTheDocument()
  })

  it('keeps the session open when another query fails with forbidden', async () => {
    renderGate(<FailingQuery queryKey={['test', 'data']} error={new DataError('forbidden')} />)

    await waitFor(() => expect(screen.getByText('Consultando')).toBeInTheDocument())
    expect(clerk.signOut).not.toHaveBeenCalled()
  })

  it('ends the session only once for a burst of auth errors', async () => {
    renderGate(
      <>
        <FailingQuery queryKey={['test', 'a']} error={new DataError('unauthorized')} />
        <FailingQuery queryKey={['test', 'b']} error={new DataError('entity-revoked')} />
      </>,
    )

    expect(await screen.findByText(/^Login \(/)).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
  })
})
