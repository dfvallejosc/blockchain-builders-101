import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyRoutes } from '@/features/verificar/routes'
import {
  ANNULLED_ID,
  EXPIRED_ID,
  installVerificationApi,
  REVOKED_ID,
  VALID_ID,
  type VerificationApiStub,
} from '@/test/verification-api'

const renderAt = (path: string) => {
  const router = createMemoryRouter(verifyRoutes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

const MEDICAL_WORDS = /diagn[oó]stic|restricci[oó]n|resultado m[eé]dico|apto|no apto/i

describe('VerifyPage', () => {
  let api: VerificationApiStub

  beforeEach(() => {
    api = installVerificationApi()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
    api.restore()
  })

  it('shows Habilitado with the worker, the certificate and the entity', async () => {
    renderAt(`/c/${VALID_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Habilitado' })).toBeInTheDocument()
    expect(screen.getByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
    expect(screen.getByText('C.C. 1.020.345.678')).toBeInTheDocument()
    expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
    expect(screen.queryByText(MEDICAL_WORDS)).not.toBeInTheDocument()
  })

  it('shows Vencido', async () => {
    renderAt(`/c/${EXPIRED_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Vencido' })).toBeInTheDocument()
  })

  it('shows Anulado', async () => {
    renderAt(`/c/${ANNULLED_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Anulado' })).toBeInTheDocument()
  })

  it('shows No válido for a number that does not exist, without any card', async () => {
    renderAt('/c/d9999999-0000-4000-8000-000000000000')

    expect(await screen.findByRole('heading', { level: 1, name: 'No válido' })).toBeInTheDocument()
    expect(screen.queryByText('Trabajador')).not.toBeInTheDocument()
  })

  it('shows No válido, and not the page, for a malformed id', async () => {
    renderAt('/c/not-an-id')

    expect(await screen.findByRole('heading', { level: 1, name: 'No válido' })).toBeInTheDocument()
  })

  it('shows No válido with the entity, and no worker, when the entity was revoked', async () => {
    renderAt(`/c/${REVOKED_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'No válido' })).toBeInTheDocument()
    expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
    expect(screen.getByText('Revocado')).toBeInTheDocument()
    expect(screen.queryByText('Carlos Andrés Ramírez Pineda')).not.toBeInTheDocument()
    expect(screen.queryByText(/1\.020\.345\.678/)).not.toBeInTheDocument()
  })

  it('shows Verificando first', () => {
    renderAt(`/c/${VALID_ID}`)

    expect(screen.getByRole('heading', { level: 1, name: 'Verificando…' })).toBeInTheDocument()
  })

  it('shows Sin verificar with a retry button when the query fails, and then the real result', async () => {
    api.failNext()
    renderAt(`/c/${VALID_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sin verificar' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'No válido' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Habilitado' })).toBeInTheDocument()
  })

  it('forces the loading state with ?estado=cargando in development', async () => {
    renderAt(`/c/${VALID_ID}?estado=cargando`)

    expect(screen.getByRole('heading', { level: 1, name: 'Verificando…' })).toBeInTheDocument()
    expect(api.calls).not.toContain(VALID_ID)
  })

  it('forces the error state with ?estado=error, and retry shows the real result', async () => {
    renderAt(`/c/${VALID_ID}?estado=error`)

    const banner = screen.getByRole('status')
    expect(within(banner).getByRole('heading', { level: 1, name: 'Sin verificar' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Habilitado' })).toBeInTheDocument()
  })

  it.each(['error', 'cargando'] as const)('clears forced %s when the same id loses its estado query', async (estado) => {
    const router = renderAt(`/c/${VALID_ID}?estado=${estado}`)

    await act(async () => {
      await router.navigate(`/c/${VALID_ID}`)
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Habilitado' })).toBeInTheDocument()
  })

  it('does not say "Verificado por HabilitApp" when the query could not be verified', async () => {
    renderAt(`/c/${VALID_ID}?estado=error`)

    expect(screen.getByRole('heading', { level: 1, name: 'Sin verificar' })).toBeInTheDocument()
    expect(screen.queryByText('Verificado por HabilitApp')).not.toBeInTheDocument()
  })

  it('stamps the retried query with the time of the retry', async () => {
    renderAt(`/c/${VALID_ID}?estado=error`)
    vi.setSystemTime(new Date(2026, 9, 9, 15, 30))

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText(/^Consulta: .*3:30/)).toBeInTheDocument()
  })
})
