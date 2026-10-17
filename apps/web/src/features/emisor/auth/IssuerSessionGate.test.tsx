import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { useContext, useSyncExternalStore } from 'react'
import { createMemoryRouter, useLocation, useOutletContext } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, type IssuerProfile } from '@/api/me'
import { DataError } from '@/data/errors'
import type { IssuerSession } from '@/data/types'
import { IssuerSessionGate } from '@/features/emisor/auth/IssuerSessionGate'
import { SessionActionsContext } from '@/layouts/SessionActionsContext'
import { setTokenProvider } from '@/lib/api-client'
import { createQueryWrapper, createTestQueryClient } from '@/test/query'

const clerk = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: true,
  email: 'coordinacion@cumbrefirme.co' as string | null,
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
        ? { primaryEmailAddress: clerk.email === null ? null : { emailAddress: clerk.email } }
        : null,
    }
  },
}))

vi.mock('@/api/me', () => ({ getMe: vi.fn() }))

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()
  return { ...actual, setTokenProvider: vi.fn() }
})

const PROFILE: IssuerProfile = {
  id: 'centro-entrenamiento-cumbre-firme',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work'],
  nit: '900123456-7',
  city: 'Medellín',
}

const LoginProbe = () => {
  const location = useLocation()
  const state = location.state as { reason?: string } | null
  return <p>Ingreso{state?.reason ? ` (${state.reason})` : ''}</p>
}

const SessionProbe = () => {
  const session = useOutletContext<IssuerSession>()
  return <pre data-testid="session">{JSON.stringify(session)}</pre>
}

const FailingQuery = ({ error }: { error: DataError }) => {
  const query = useQuery({ queryKey: ['issuer', 'certificates'], queryFn: () => Promise.reject(error) })
  return <p>{query.isError ? 'Consulta fallida' : 'Consultando'}</p>
}

const WorkersAndMutation = ({ error }: { error: DataError }) => {
  const workers = useQuery({ queryKey: ['issuer', 'workers'], queryFn: async () => ['w1'] })
  const mutation = useMutation({ mutationFn: () => Promise.reject(error) })
  return (
    <>
      <p>{workers.isSuccess ? 'Trabajadores cargados' : 'Cargando trabajadores'}</p>
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
      { path: '/emisor/ingresar', element: <LoginProbe /> },
      { path: '/emisor', element: <IssuerSessionGate />, children: [{ index: true, element: child }] },
    ],
    { initialEntries: ['/emisor'] },
  )
  const view = render(<RouterProvider router={router} />, { wrapper: createQueryWrapper(client) })
  return { router, client, ...view }
}

describe('IssuerSessionGate', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockReset()
    vi.mocked(setTokenProvider).mockClear()
    clerk.isLoaded = true
    clerk.isSignedIn = true
    clerk.listeners.clear()
    clerk.email = 'coordinacion@cumbrefirme.co'
    clerk.getToken.mockClear()
    clerk.signOut.mockClear()
  })

  it('sends a visitor without a Clerk session to the login and does not call GET /me', async () => {
    clerk.isSignedIn = false

    const { router } = renderGate()

    expect(await screen.findByText('Ingreso')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/emisor/ingresar')
    expect(getMe).not.toHaveBeenCalled()
  })

  it('shows a skeleton while Clerk loads', () => {
    clerk.isLoaded = false

    renderGate()

    expect(screen.getByRole('status', { name: 'Cargando tu panel' })).toBeInTheDocument()
    expect(getMe).not.toHaveBeenCalled()
  })

  it('shows a skeleton while the profile loads', async () => {
    vi.mocked(getMe).mockReturnValue(new Promise(() => undefined))

    renderGate()

    expect(await screen.findByRole('status', { name: 'Cargando tu panel' })).toBeInTheDocument()
    expect(screen.queryByTestId('session')).not.toBeInTheDocument()
  })

  it('renders the child route with the issuer session built from the profile and the Clerk email', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })

    renderGate()

    const session: unknown = JSON.parse((await screen.findByTestId('session')).textContent ?? '')
    expect(session).toEqual({
      role: 'issuer',
      entityId: 'centro-entrenamiento-cumbre-firme',
      entityName: 'Centro de Entrenamiento Cumbre Firme',
      email: 'coordinacion@cumbrefirme.co',
    })
  })

  it('uses an empty email when the Clerk user has no primary email', async () => {
    clerk.email = null
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })

    renderGate()

    const session: unknown = JSON.parse((await screen.findByTestId('session')).textContent ?? '')
    expect(session).toMatchObject({ email: '' })
  })

  it('gives the API client the Clerk token while mounted and removes it on unmount', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })

    const { unmount } = renderGate()
    await screen.findByTestId('session')

    const provider = vi.mocked(setTokenProvider).mock.calls.find(([candidate]) => candidate !== null)?.[0]
    await expect(provider?.()).resolves.toBe('clerk-token')
    unmount()
    expect(vi.mocked(setTokenProvider).mock.calls.at(-1)).toEqual([null])
  })

  it.each([
    ['an admin', { role: 'admin' as const, issuer: null }, 'not-issuer'],
    ['a user without an issuer', { role: 'issuer' as const, issuer: null }, 'not-issuer'],
  ])('ends the session for %s with reason %s', async (_label, me, reason) => {
    vi.mocked(getMe).mockResolvedValue(me)

    const { router } = renderGate()

    expect(await screen.findByText(`Ingreso (${reason})`)).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
    expect(router.state.location.state).toEqual({ reason })
  })

  it.each([
    ['forbidden', 'no-role'],
    ['entity-revoked', 'revoked'],
    ['unauthorized', 'expired'],
  ] as const)('ends the session when GET /me fails with %s, with reason %s', async (code, reason) => {
    vi.mocked(getMe).mockRejectedValue(new DataError(code))

    renderGate()

    expect(await screen.findByText(`Ingreso (${reason})`)).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
  })

  it('offers to retry when GET /me is unavailable and keeps the session open', async () => {
    vi.mocked(getMe).mockRejectedValueOnce(new DataError('unavailable'))
    vi.mocked(getMe).mockResolvedValueOnce({ role: 'issuer', issuer: PROFILE })

    const { router } = renderGate()

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByTestId('session')).toBeInTheDocument()
    expect(clerk.signOut).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/emisor')
  })

  it.each([
    ['unauthorized', 'expired'],
    ['entity-revoked', 'revoked'],
  ] as const)('ends the session when a later query fails with %s', async (code, reason) => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })

    renderGate(<FailingQuery error={new DataError(code)} />)

    expect(await screen.findByText(`Ingreso (${reason})`)).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
  })

  it('ends the session and empties the cache when a mutation fails with unauthorized', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })

    renderGate(<WorkersAndMutation error={new DataError('unauthorized')} />, client)
    await screen.findByText('Trabajadores cargados')
    expect(client.getQueryData(['issuer', 'workers'])).toEqual(['w1'])

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ingreso (expired)')).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(['issuer', 'workers'])).toBeUndefined()
    expect(client.getQueryData(['issuer', 'me'])).toBeUndefined()
  })

  it('empties the cache when Clerk ends the session by itself', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })

    renderGate(<WorkersAndMutation error={new DataError('unavailable')} />, client)
    await screen.findByText('Trabajadores cargados')
    expect(client.getQueryData(['issuer', 'workers'])).toEqual(['w1'])
    expect(client.getQueryData(['issuer', 'me'])).toEqual(PROFILE)
    const callsBefore = vi.mocked(getMe).mock.calls.length

    act(() => endClerkSession())

    expect(await screen.findByText('Ingreso')).toBeInTheDocument()
    expect(client.getQueryData(['issuer', 'workers'])).toBeUndefined()
    expect(client.getQueryData(['issuer', 'me'])).toBeUndefined()
    expect(getMe).toHaveBeenCalledTimes(callsBefore)
  })

  it('keeps the session open when a later query fails with forbidden', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })

    const { router } = renderGate(<FailingQuery error={new DataError('forbidden')} />)

    expect(await screen.findByText('Consulta fallida')).toBeInTheDocument()
    expect(clerk.signOut).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/emisor')
  })

  it('keeps the session open when a mutation fails with unavailable', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })

    const { router } = renderGate(<WorkersAndMutation error={new DataError('unavailable')} />)
    await screen.findByText('Trabajadores cargados')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor'))
    expect(screen.getByText('Trabajadores cargados')).toBeInTheDocument()
    expect(clerk.signOut).not.toHaveBeenCalled()
  })

  it('handles a burst of auth errors only once', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    const Burst = () => {
      useQuery({ queryKey: ['issuer', 'a'], queryFn: () => Promise.reject(new DataError('unauthorized')) })
      useQuery({ queryKey: ['issuer', 'b'], queryFn: () => Promise.reject(new DataError('entity-revoked')) })
      return null
    }

    renderGate(<Burst />)

    expect(await screen.findByText(/^Ingreso \(/)).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
  })

  it('gives the panel a sign out that closes Clerk and goes to the login without a reason', async () => {
    vi.mocked(getMe).mockResolvedValue({ role: 'issuer', issuer: PROFILE })

    const { router, client } = renderGate(<ActionsProbe />)
    fireEvent.click(await screen.findByRole('button', { name: 'Salir' }))

    expect(await screen.findByText('Ingreso')).toBeInTheDocument()
    expect(clerk.signOut).toHaveBeenCalledTimes(1)
    expect(router.state.location.state).toBeNull()
    expect(client.getQueryData(['issuer', 'me'])).toBeUndefined()
  })
})
