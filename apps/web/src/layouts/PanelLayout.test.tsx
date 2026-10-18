import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@/data'
import { PanelLayout } from '@/layouts/PanelLayout'
import { SessionActionsContext, type SessionActions } from '@/layouts/SessionActionsContext'

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
  it('signs the admin out with the session actions of the context and leaves navigation to them', async () => {
    const actions: SessionActions = { signOut: vi.fn(async () => undefined) }
    const router = renderPanel(
      { role: 'admin', name: 'Daniela Rojas', email: 'daniela.rojas@habilitapp.co' },
      '/admin/emisores',
      actions,
    )

    await clickSignOut()

    expect(actions.signOut).toHaveBeenCalledTimes(1)
    expect(router.state.location.pathname).toBe('/admin/emisores')
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
    expect(router.state.location.pathname).toBe('/emisor/emitir')
  })
})
