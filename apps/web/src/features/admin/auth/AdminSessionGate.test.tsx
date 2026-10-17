import { QueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useContext, useSyncExternalStore } from 'react'
import { createMemoryRouter, useLocation, useOutletContext } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe } from '@/api/me'
import { DataError } from '@/data/errors'
import type { AdminSession } from '@/data/types'
import { AdminSessionGate } from '@/features/admin/auth/AdminSessionGate'
import { SessionActionsContext } from '@/layouts/SessionActionsContext'
import { setTokenProvider } from '@/lib/api-client'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

const clerk = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: true,
  email: 'daniela.rojas@habilitapp.co' as string | null,
  fullName: 'Daniela Rojas' as string | null,
  getToken: vi.fn(async () => 'clerk-token'),
  signOut: vi.fn(async () => undefined),
  listeners: new Set<() => void>(),
}))

// Clerk ends the session by itself (for example a cookie that expires): the hooks re-render.
const endClerkSession = () => {
  clerk.isSignedIn = false
  clerk.listeners.forEach((listener) => listener())
}

const subscribeToClerk = (listener: () => void) => {
  clerk.listeners.add(listener)
  return () => void clerk.listeners.delete(listener)
}

vi.mock('@clerk/react', () => ({
  useAuth: () => {
    const isSignedIn = useSyncExternalStore(subscribeToClerk, () => clerk.isSignedIn)
    return {
      isLoaded: clerk.isLoaded,
      isSignedIn: clerk.isLoaded ? isSignedIn : undefined,
      getToken: clerk.getToken,
      signOut: clerk.signOut,
    }
  },
  useUser: () => {
    const isSignedIn = useSyncExternalStore(subscribeToClerk, () => clerk.isSignedIn)
    return {
      isLoaded: true,
      isSignedIn,
      user: isSignedIn
        ? {
            fullName: clerk.fullName,
            primaryEmailAddress: clerk.email === null ? null : { emailAddress: clerk.email },
          }
        : null,
    }
  },
}))

vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()
  return { ...actual, setTokenProvider: vi.fn() }
})

const LoginProbe = () => {
  const state = useLocation().state as { reason?: string } | null
  return <p>Ingreso{state?.reason ? ` (${state.reason})` : ''}</p>
}

const SessionProbe = () => {
  const session = useOutletContext<AdminSession>()
  return <pre data-testid="session">{JSON.stringify(session)}</pre>
}

const FailingQuery = ({ error }: { error: DataError }) => {
  const query = useQuery({ queryKey: ['admin', 'issuers'], queryFn: () => Promise.reject(error) })
  return <p>{query.isError ? 'Consulta fallida' : 'Consultando'}</p>
}

const ListAndMutation = ({ error }: { error: DataError }) => {
  const list = useQuery({ queryKey: ['admin', 'issuers'], queryFn: async () => ['i1'] })
  const mutation = useMutation({ mutationFn: () => Promise.reject(error) })
  return (
    <>
      <p>{list.isSuccess ? 'Emisores cargados' : 'Cargando emisores'}</p>
      <button type="button" onClick={() => mutation.mutate()}>
        Guardar
      </button>
    </>
  )
}

const ActionsProbe = () => {
  const actions = useContext(SessionActionsContext)
  return (
    <button type="button" onClick={() => void actions?.signOut()}>
      Salir
    </button>
  )
}

const renderGate = (child = <SessionProbe />, client: QueryClient = createTestQueryClient()) => {
  const router = createMemoryRouter(
    [
      { path: '/admin/ingresar', element: <LoginProbe /> },
      { path: '/admin', element: <AdminSessionGate />, children: [{ index: true, element: child }] },
    ],
    { initialEntries: ['/admin'] },
  )
  const view = render(<RouterProvider router={router} />, { wrapper: createQueryWrapper(client) })
  return { router, client, ...view }
}

const readSession = async (): Promise<unknown> => JSON.parse((await screen.findByTestId('session')).textContent ?? '')

describe('AdminSessionGate', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockReset()
    vi.mocked(setTokenProvider).mockClear()
    clerk.isLoaded = true
    clerk.isSignedIn = true
    clerk.listeners.clear()
    clerk.email = 'daniela.rojas@habilitapp.co'
    clerk.fullName = 'Daniela Rojas'
    clerk.getToken.mockClear()
    clerk.signOut.mockClear()
  })

  it('sends a visitor without a Clerk session to the login and does not call GET /me', async () => {
    clerk.isSignedIn = false

    const { router } = renderGate()

    expect(await screen.findByText('Ingreso')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/ingresar')
    expect(getMe).not.toHaveBeenCalled()
  })

  it('shows a skeleton while Clerk loads and while the profile loads', async () => {
    clerk.isLoaded = false
    const first = renderGate()
    expect(screen.getByRole('status', { name: 'Cargando tu panel' })).toBeInTheDocument()
    expect(getMe).not.toHaveBeenCalled()
    first.unmount()

    clerk.isLoaded = true
    vi.mocked(getMe).mockReturnValue(new Promise(() => undefined))
    renderGate()
    expect(await screen.findByRole('status', { name: 'Cargando tu panel' })).toBeInTheDocument()
    expect(screen.queryByTestId('session')).not.toBeInTheDocument()
  })

  it('renders the child route with the admin session built from the Clerk user', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })

    renderGate()

    expect(await readSession()).toEqual({
      role: 'admin',
      name: 'Daniela Rojas',
      email: 'daniela.rojas@habilitapp.co',
    })
  })

  it.each([
    ['no name', null],
    ['a blank name', '   '],
  ])('falls back to the email when the Clerk user has %s', async (_label, fullName) => {
    clerk.fullName = fullName
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })

    renderGate()

    expect(await readSession()).toMatchObject({ name: 'daniela.rojas@habilitapp.co', email: 'daniela.rojas@habilitapp.co' })
  })

  it('uses empty strings when the Clerk user has neither a name nor a primary email', async () => {
    clerk.fullName = null
    clerk.email = null
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })

    renderGate()

    expect(await readSession()).toMatchObject({ name: '', email: '' })
  })

  it('gives the API client the Clerk token while mounted and removes it on unmount', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })

    const { unmount } = renderGate()
    await screen.findByTestId('session')

    const provider = vi.mocked(setTokenProvider).mock.calls.find(([candidate]) => candidate !== null)?.[0]
    await expect(provider?.()).resolves.toBe('clerk-token')
    unmount()
    expect(vi.mocked(setTokenProvider).mock.calls.at(-1)).toEqual([null])
  })

  it('ends the session with not-admin when the account is an issuer', async () => {
    vi.mocked(getMe).mockResolvedValue({
      role: 'issuer',
      issuer: { id: 'e-1', name: 'Entidad', certificateTypes: ['height-work'], nit: '1', city: 'Bogotá' },
    })

    const { router } = renderGate()

    expect(await screen.findByText('Ingreso (not-admin)')).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
    expect(router.state.location.state).toEqual({ reason: 'not-admin' })
  })

  it.each([
    ['forbidden', 'no-role'],
    ['unauthorized', 'expired'],
  ] as const)('ends the session when GET /me fails with %s, with reason %s', async (code, reason) => {
    vi.mocked(getMe).mockRejectedValue(new DataError(code))

    renderGate()

    expect(await screen.findByText(`Ingreso (${reason})`)).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
  })

  it('offers to retry when GET /me is unavailable and keeps the session open', async () => {
    vi.mocked(getMe).mockRejectedValueOnce(new DataError('unavailable'))
    vi.mocked(getMe).mockResolvedValueOnce({ role: 'admin', issuer: null })

    const { router } = renderGate()

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByTestId('session')).toBeInTheDocument()
    expect(clerk.signOut).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('ends the session when a later query fails with unauthorized', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })

    renderGate(<FailingQuery error={new DataError('unauthorized')} />)

    expect(await screen.findByText('Ingreso (expired)')).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
  })

  it('keeps the session open when a later query fails with forbidden', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })

    const { router } = renderGate(<FailingQuery error={new DataError('forbidden')} />)

    expect(await screen.findByText('Consulta fallida')).toBeInTheDocument()
    expect(clerk.signOut).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('ends the session and empties the cache when a mutation fails with unauthorized', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })

    renderGate(<ListAndMutation error={new DataError('unauthorized')} />, client)
    await screen.findByText('Emisores cargados')
    expect(client.getQueryData(['admin', 'issuers'])).toEqual(['i1'])

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ingreso (expired)')).toBeInTheDocument()
    expect(client.getQueryData(['admin', 'issuers'])).toBeUndefined()
    expect(client.getQueryData(['admin', 'me'])).toBeUndefined()
  })

  it('empties the cache when Clerk ends the session by itself', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })

    renderGate(<ListAndMutation error={new DataError('unavailable')} />, client)
    await screen.findByText('Emisores cargados')
    const callsBefore = vi.mocked(getMe).mock.calls.length

    act(() => endClerkSession())

    expect(await screen.findByText('Ingreso')).toBeInTheDocument()
    expect(client.getQueryData(['admin', 'issuers'])).toBeUndefined()
    expect(client.getQueryData(['admin', 'me'])).toBeUndefined()
    expect(getMe).toHaveBeenCalledTimes(callsBefore)
  })

  it('handles a burst of auth errors only once', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })
    const Burst = () => {
      useQuery({ queryKey: ['admin', 'a'], queryFn: () => Promise.reject(new DataError('unauthorized')) })
      useQuery({ queryKey: ['admin', 'b'], queryFn: () => Promise.reject(new DataError('unauthorized')) })
      return null
    }

    renderGate(<Burst />)

    expect(await screen.findByText(/^Ingreso \(/)).toBeInTheDocument()
    await waitFor(() => expect(clerk.signOut).toHaveBeenCalledTimes(1))
  })

  it('gives the panel a sign out that closes Clerk and goes to the login without a reason', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'admin', issuer: null })

    const { router, client } = renderGate(<ActionsProbe />)
    fireEvent.click(await screen.findByRole('button', { name: 'Salir' }))

    expect(await screen.findByText('Ingreso')).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
    expect(router.state.location.state).toBeNull()
    expect(client.getQueryData(['admin', 'me'])).toBeUndefined()
  })
})
