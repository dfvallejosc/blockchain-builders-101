import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signOut, type Session } from '@/data'
import { PanelLayout } from '@/layouts/PanelLayout'
import { SessionActionsContext, type SessionActions } from '@/layouts/SessionActionsContext'

vi.mock('@/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data')>()
  return { ...actual, signOut: vi.fn(async () => undefined) }
})

const renderPanel = (session: Session, path: string, actions: SessionActions | null = null) => {
  const router = createMemoryRouter(
    [
      { path: '/admin/ingresar', element: <p>Ingreso de administración</p> },
      { path: '/emisor/ingresar', element: <p>Ingreso del emisor</p> },
      {
        element: (
          <SessionActionsContext.Provider value={actions}>
            <Outlet context={session} />
          </SessionActionsContext.Provider>
        ),
        children: [{ element: <PanelLayout />, children: [{ path, element: <p>Contenido</p> }] }],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const clickSignOut = async () => {
  await act(async () => {
    screen.getByRole('button', { name: 'Cerrar sesión' }).click()
  })
}

describe('PanelLayout sign out', () => {
  beforeEach(() => {
    vi.mocked(signOut).mockClear()
  })

  it('signs the admin out with the demo data layer and goes to the admin login', async () => {
    const router = renderPanel({ role: 'admin', name: 'Daniela Rojas', email: 'daniela.rojas@habilitapp.co' }, '/admin/emisores')

    await clickSignOut()

    expect(signOut).toHaveBeenCalledWith('admin')
    expect(await screen.findByText('Ingreso de administración')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/ingresar')
  })

  it('signs the issuer out with the session actions of the context and leaves navigation to them', async () => {
    const actions: SessionActions = { signOut: vi.fn(async () => undefined) }
    const router = renderPanel(
      { role: 'issuer', entityId: 'e1', entityName: 'Centro de Entrenamiento Cumbre Firme', email: 'a@b.co' },
      '/emisor/emitir',
      actions,
    )

    await clickSignOut()

    expect(actions.signOut).toHaveBeenCalledTimes(1)
    expect(signOut).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/emisor/emitir')
  })
})
