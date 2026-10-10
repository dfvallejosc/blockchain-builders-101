import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { appRoutes } from '@/routes'

describe('components gallery', () => {
  it('is available in development at /dev/components and shows the first group of components', () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/dev/components'] })
    render(
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Componentes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Botones' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Campos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chips de estado' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Alertas y avisos' })).toBeInTheDocument()
    expect(screen.getAllByText('Habilitado').length).toBeGreaterThan(0)
  })
})
