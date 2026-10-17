import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IssuerAuthLayout } from '@/features/emisor/auth/IssuerAuthLayout'

const providerProps = vi.hoisted(() => ({ calls: [] as { publishableKey?: string }[] }))

vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children, publishableKey }: { children: ReactNode; publishableKey?: string }) => {
    providerProps.calls.push({ publishableKey })
    return <div data-testid="clerk-provider">{children}</div>
  },
}))

const renderLayout = () => {
  const router = createMemoryRouter(
    [{ element: <IssuerAuthLayout />, children: [{ path: '/', element: <p>Contenido del emisor</p> }] }],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
}

describe('IssuerAuthLayout', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    providerProps.calls.length = 0
  })

  it('renders the child route inside ClerkProvider when the key is set', async () => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    renderLayout()

    expect(await screen.findByText('Contenido del emisor')).toBeInTheDocument()
    expect(screen.getByTestId('clerk-provider')).toBeInTheDocument()
    expect(providerProps.calls[0]?.publishableKey).toBe('pk_test_dummy')
  })

  it.each(['', undefined])('shows the config notice and does not mount ClerkProvider when the key is %j', async (key) => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', key)
    renderLayout()

    expect(await screen.findByRole('heading', { name: 'El ingreso no está configurado' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido del emisor')).not.toBeInTheDocument()
    expect(screen.queryByTestId('clerk-provider')).not.toBeInTheDocument()
    expect(providerProps.calls).toHaveLength(0)
  })
})
