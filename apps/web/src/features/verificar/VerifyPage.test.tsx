import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetState, revokeEntity } from '@/data'
import { verifyCertificate } from '@/data/verification'
import { verifyRoutes } from '@/features/verificar/routes'

vi.mock('@/data/verification', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/verification')>()
  return { verifyCertificate: vi.fn(actual.verifyCertificate) }
})

const renderAt = (path: string) => {
  const router = createMemoryRouter(verifyRoutes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

const MEDICAL_WORDS = /diagn[oó]stic|restricci[oó]n|resultado m[eé]dico|apto|no apto/i

describe('VerifyPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
    vi.mocked(verifyCertificate).mockClear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows Habilitado with the worker, the certificate and the entity', async () => {
    renderAt('/c/HAB-2026-004718')

    expect(await screen.findByRole('heading', { level: 1, name: 'Habilitado' })).toBeInTheDocument()
    expect(screen.getByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
    expect(screen.getByText('C.C. 1.020.345.678')).toBeInTheDocument()
    expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
    expect(screen.queryByText(MEDICAL_WORDS)).not.toBeInTheDocument()
  })

  it('shows Vencido', async () => {
    renderAt('/c/HAB-2025-003981')

    expect(await screen.findByRole('heading', { level: 1, name: 'Vencido' })).toBeInTheDocument()
  })

  it('shows Anulado', async () => {
    renderAt('/c/HAB-2026-004655')

    expect(await screen.findByRole('heading', { level: 1, name: 'Anulado' })).toBeInTheDocument()
  })

  it('shows No válido for a number that does not exist, without any card', async () => {
    renderAt('/c/HAB-2026-999999')

    expect(await screen.findByRole('heading', { level: 1, name: 'No válido' })).toBeInTheDocument()
    expect(screen.queryByText('Trabajador')).not.toBeInTheDocument()
  })

  it('shows No válido, and not the page, for a malformed id', async () => {
    renderAt('/c/not-an-id')

    expect(await screen.findByRole('heading', { level: 1, name: 'No válido' })).toBeInTheDocument()
  })

  it('shows No válido with the entity, and no worker, when the entity was revoked', async () => {
    await revokeEntity('centro-entrenamiento-cumbre-firme')
    renderAt('/c/HAB-2026-004718')

    expect(await screen.findByRole('heading', { level: 1, name: 'No válido' })).toBeInTheDocument()
    expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
    expect(screen.getByText('Revocado')).toBeInTheDocument()
    expect(screen.queryByText('Carlos Andrés Ramírez Pineda')).not.toBeInTheDocument()
    expect(screen.queryByText(/1\.020\.345\.678/)).not.toBeInTheDocument()
  })

  it('shows Verificando first', () => {
    renderAt('/c/HAB-2026-004718')

    expect(screen.getByRole('heading', { level: 1, name: 'Verificando…' })).toBeInTheDocument()
  })

  it('shows Sin verificar with a retry button when the query fails, and then the real result', async () => {
    vi.mocked(verifyCertificate).mockRejectedValueOnce(new Error('network'))
    renderAt('/c/HAB-2026-004718')

    expect(await screen.findByRole('heading', { level: 1, name: 'Sin verificar' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'No válido' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Habilitado' })).toBeInTheDocument()
  })

  it('forces the loading state with ?estado=cargando in development', async () => {
    renderAt('/c/HAB-2026-004718?estado=cargando')

    expect(screen.getByRole('heading', { level: 1, name: 'Verificando…' })).toBeInTheDocument()
    expect(verifyCertificate).not.toHaveBeenCalledWith('HAB-2026-004718')
  })

  it('forces the error state with ?estado=error, and retry shows the real result', async () => {
    renderAt('/c/HAB-2026-004718?estado=error')

    const banner = screen.getByRole('status')
    expect(within(banner).getByRole('heading', { level: 1, name: 'Sin verificar' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Habilitado' })).toBeInTheDocument()
  })
})
