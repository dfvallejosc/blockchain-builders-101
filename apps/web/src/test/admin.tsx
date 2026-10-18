import { render } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { vi } from 'vitest'
import { getMe } from '@/api/me'
import { ToastProvider } from '@/components/ui/toast'
import { adminRoutes } from '@/features/admin/routes'
import { clerkSession } from '@/test/clerk'
import { resetIssuersApi } from '@/test/issuers-api'
import { createQueryWrapper } from '@/test/query'

// For the admin page tests: the file must mock `@clerk/react` with `sessionClerkModule`, `@/api/me` and
// `@/api/issuers` with `issuersApi` (see the three page tests). Call it in `beforeEach`.
export const resetAdminTestState = (): void => {
  vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
  resetIssuersApi()
  clerkSession.signedIn = true
  vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'admin', issuer: null })
}

export const renderAdminAt = (path: string) => {
  const router = createMemoryRouter(adminRoutes, { initialEntries: [path] })
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
    { wrapper: createQueryWrapper() },
  )
  return router
}
