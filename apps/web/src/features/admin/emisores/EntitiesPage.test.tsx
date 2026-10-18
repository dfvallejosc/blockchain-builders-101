import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderAdminAt, resetAdminTestState } from '@/test/admin'
import { issuersApi } from '@/test/issuers-api'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).sessionClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/issuers', async () => (await import('@/test/issuers-api')).issuersApi)

const renderPage = async () => renderAdminAt('/admin/emisores')

const table = () => screen.getByRole('table', { name: 'Tabla de emisores' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const waitForRows = async (count = 8) => {
  await screen.findByRole('table', { name: 'Tabla de emisores' })
  await waitFor(() => expect(bodyRows()).toHaveLength(count))
}
const search = (value: string) =>
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar emisor por nombre' }), { target: { value } })

describe('EntitiesPage', () => {
  beforeEach(() => {
    resetAdminTestState()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows the title, the description and the count', async () => {
    await renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Emisores' })).toBeInTheDocument()
    expect(
      screen.getByText('Entidades autorizadas para emitir certificados. Solo las que se registran aquí pueden hacerlo.'),
    ).toBeInTheDocument()
    await waitForRows()
    expect(screen.getByText('Mostrando 8 de 8 emisores')).toBeInTheDocument()
  })

  it('lists the issuers with their type, city, status, date and certificates of the month', async () => {
    await renderPage()
    await waitForRows()

    const first = bodyRows()[0]
    expect(within(first).getByRole('link', { name: 'Centro de Capacitación Grúas del Valle' })).toHaveAttribute(
      'href',
      '/admin/emisores/centro-capacitacion-gruas-del-valle',
    )
    expect(first).toHaveTextContent('Centro de entrenamiento')
    expect(first).toHaveTextContent('Manizales')
    expect(first).toHaveTextContent('Habilitado')
    expect(first).toHaveTextContent('26 de mayo de 2026')
    expect(first).toHaveTextContent('3')
    const revoked = bodyRows().find((row) => row.textContent?.includes('Bahía Norte'))
    expect(revoked).toHaveTextContent('Revocado')
  })

  it('starts with the most recently registered issuer first', async () => {
    await renderPage()
    await waitForRows()

    expect(bodyRows()[0]).toHaveTextContent('Grúas del Valle')
    expect(bodyRows().at(-1)).toHaveTextContent('Cumbre Firme')
  })

  it('has a link to register an issuer in the page, besides the one in the side bar', async () => {
    await renderPage()
    await waitForRows()

    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Registrar emisor' })).toHaveAttribute(
      'href',
      '/admin/emisores/nuevo',
    )
  })

  it('finds issuers by name ignoring accents and case, and says so when nothing matches', async () => {
    await renderPage()
    await waitForRows()

    search('RIO claro')
    await waitFor(() => expect(bodyRows()).toHaveLength(1))
    expect(bodyRows()[0]).toHaveTextContent('Salud Laboral Río Claro')
    expect(screen.getByText('Mostrando 1 de 8 emisores')).toBeInTheDocument()

    search('zzz')
    expect(await screen.findByText('No encontramos emisores')).toBeInTheDocument()
    expect(screen.getByText('Ningún emisor coincide con “zzz”.')).toBeInTheDocument()
  })

  it('filters by status and shows both together as a union', async () => {
    await renderPage()
    await waitForRows()

    fireEvent.click(screen.getByRole('button', { name: 'Revocado' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Revocado' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Habilitado' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(8))
  })

  it('clears the search and the filters with "Limpiar filtros"', async () => {
    await renderPage()
    await waitForRows()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()

    search('consultorio')
    fireEvent.click(screen.getByRole('button', { name: 'Revocado' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(2))

    fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0])

    await waitForRows()
    expect(screen.getByRole('searchbox', { name: 'Buscar emisor por nombre' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Revocado' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('sorts by the name column when its header is pressed', async () => {
    await renderPage()
    await waitForRows()

    fireEvent.click(within(table()).getByRole('button', { name: 'Entidad' }))
    fireEvent.click(within(table()).getByRole('button', { name: 'Entidad' }))

    await waitFor(() => expect(bodyRows()[0]).toHaveTextContent('Salud Laboral Río Claro'))
  })

  it('shows the skeleton while loading', async () => {
    const original = issuersApi.listIssuers.getMockImplementation()!
    let release: (() => void) | undefined
    issuersApi.listIssuers.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => {
            void original().then(resolve)
          }
        }),
    )
    await renderPage()

    expect(await screen.findByRole('table', { name: 'Tabla de emisores' })).toHaveAttribute('aria-busy', 'true')
    release?.()
    await waitForRows()
  })

  it('shows an error with a retry when the issuers cannot be loaded', async () => {
    issuersApi.listIssuers.mockRejectedValueOnce(new Error('boom'))
    await renderPage()

    expect(await screen.findByText('No pudimos cargar los emisores')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitForRows()
  })

  it('shows an empty state with access to register, and no search, when there are no issuers', async () => {
    issuersApi.listIssuers.mockResolvedValueOnce([])
    await renderPage()

    expect(await screen.findByText('Aún no hay emisores registrados')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    const links = within(screen.getByRole('main')).getAllByRole('link', { name: 'Registrar emisor' })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/admin/emisores/nuevo')
  })
})
