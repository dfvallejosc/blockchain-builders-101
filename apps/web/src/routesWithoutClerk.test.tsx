import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { resetState } from '@/data'
import { appRoutes } from '@/routes'
import { installVerificationApi, VALID_ID, type VerificationApiStub } from '@/test/verification-api'

const renderAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  )
}

describe('routes that do not need Clerk', () => {
  let api: VerificationApiStub

  beforeEach(() => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', '')
    window.localStorage.clear()
    resetState()
    api = installVerificationApi()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    api.restore()
  })

  it('shows the admin login without a Clerk key', async () => {
    renderAt('/admin/ingresar')

    expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument()
  })

  it('shows the public verification page without a Clerk key', async () => {
    renderAt(`/c/${VALID_ID}`)

    expect(await screen.findByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
  })
})
