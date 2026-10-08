import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the greeting and the loading state while it asks the API', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Hola mundo' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Consultando la API…')
  })

  it('shows that the API is connected when /health answers ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true } as Response)))

    render(<App />)

    expect(await screen.findByText('API conectada a la base de datos')).toBeInTheDocument()
  })

  it('shows an error when the API answers with a failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false } as Response)))

    render(<App />)

    expect(await screen.findByText('No se pudo conectar con la API')).toBeInTheDocument()
  })

  it('shows an error when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    render(<App />)

    expect(await screen.findByText('No se pudo conectar con la API')).toBeInTheDocument()
  })
})
