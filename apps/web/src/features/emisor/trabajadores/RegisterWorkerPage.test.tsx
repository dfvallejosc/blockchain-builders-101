import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { getMe, type IssuerProfile } from '@/api/me'
import { listWorkers, registerWorker } from '@/api/workers'
import { DataError } from '@/data/errors'
import type { Worker } from '@/data/types'
import { issuerRoutes } from '@/features/emisor/routes'
import { createQueryWrapper } from '@/test/query'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).signedInClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/workers', () => ({ listWorkers: vi.fn(), registerWorker: vi.fn() }))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

const PROFILE: IssuerProfile = {
  id: 'e-1',
  name: 'Centro de Entrenamiento Cumbre Firme',
  certificateTypes: ['height-work'],
  nit: '901.456.223-8',
  city: 'Medellín',
}

const CREATED: Worker = {
  id: 'w-marta',
  entityId: 'e-1',
  fullName: 'Marta Lucía Gómez Ríos',
  documentType: 'cc',
  documentNumber: '1037456789',
  registeredAt: '2026-10-09',
  consentedAt: '2026-10-09',
}

const renderAt = async (path: string) => {
  const router = createMemoryRouter(issuerRoutes, { initialEntries: [path] })
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
    { wrapper: createQueryWrapper() },
  )
  return router
}

const fillForm = ({ consent = true }: { consent?: boolean } = {}) => {
  fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: 'Marta Lucía Gómez Ríos' } })
  fireEvent.change(screen.getByLabelText(/Tipo de documento/), { target: { value: 'cc' } })
  fireEvent.change(screen.getByLabelText(/Número de documento/), { target: { value: '1037456789' } })
  if (consent) fireEvent.click(screen.getByRole('checkbox', { name: /autoriza el tratamiento/ }))
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Registrar trabajador' }))

describe('RegisterWorkerPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_dummy')
    vi.mocked(getMe).mockReset().mockResolvedValue({ role: 'issuer', issuer: PROFILE })
    vi.mocked(listWorkers).mockReset().mockResolvedValue([])
    vi.mocked(registerWorker).mockReset().mockResolvedValue(CREATED)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('says it never asks for medical results, restrictions or diagnoses', async () => {
    await renderAt('/emisor/trabajadores/nuevo')

    expect(await screen.findByRole('heading', { level: 1, name: 'Registrar trabajador' })).toBeInTheDocument()
    expect(
      screen.getByText(/Nunca pedimos resultados médicos, restricciones ni diagnósticos\./),
    ).toBeInTheDocument()
  })

  it('offers the four document types', async () => {
    await renderAt('/emisor/trabajadores/nuevo')
    const select = await screen.findByLabelText(/Tipo de documento/)

    expect(Array.from((select as HTMLSelectElement).options).map((option) => option.text)).toEqual([
      'Elige un tipo',
      'Cédula de ciudadanía',
      'Cédula de extranjería',
      'Permiso por protección temporal (PPT)',
      'Pasaporte',
    ])
  })

  it('does not register without the authorization and explains why', async () => {
    await renderAt('/emisor/trabajadores/nuevo')
    await screen.findByLabelText(/Nombre completo/)
    fillForm({ consent: false })

    submit()

    expect(
      await screen.findAllByText('Sin la autorización del trabajador no podemos registrarlo. Pídesela antes de continuar.'),
    ).not.toHaveLength(0)
    expect(registerWorker).not.toHaveBeenCalled()
  })

  it('shows inline errors and an error summary that links to each field', async () => {
    await renderAt('/emisor/trabajadores/nuevo')
    fireEvent.change(await screen.findByLabelText(/Nombre completo/), { target: { value: 'Marta' } })
    fireEvent.change(screen.getByLabelText(/Tipo de documento/), { target: { value: 'cc' } })
    fireEvent.change(screen.getByLabelText(/Número de documento/), { target: { value: '123' } })

    submit()

    const summary = await screen.findByText('Revisa 3 campos antes de continuar')
    await waitFor(() => expect(summary.closest('[tabindex="-1"]')).toHaveFocus())
    expect(screen.getByLabelText(/Nombre completo/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Número de documento/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Número de documento/)).toHaveAccessibleDescription(/El número de documento es muy corto\./)

    fireEvent.click(screen.getByRole('button', { name: 'Número de documento' }))
    await waitFor(() => expect(screen.getByLabelText(/Número de documento/)).toHaveFocus())
  })

  it('registers the worker through the API and goes back to the entity flow', async () => {
    const router = await renderAt('/emisor/trabajadores/nuevo')
    await screen.findByLabelText(/Nombre completo/)
    fillForm()

    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
    expect(registerWorker).toHaveBeenCalledWith({
      fullName: 'Marta Lucía Gómez Ríos',
      documentType: 'cc',
      documentNumber: '1037456789',
      dataConsent: true,
    })
    expect(await screen.findByText('Trabajador registrado')).toBeInTheDocument()
  })

  it('returns to step 2 of "Emitir certificado" with the worker already chosen', async () => {
    const router = await renderAt('/emisor/trabajadores/nuevo?volver=emitir')
    await screen.findByLabelText(/Nombre completo/)
    fillForm()

    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
    expect(router.state.location.search).toBe('?trabajador=w-marta&nuevo=1')
  })

  it('warns when the worker is already registered in the entity', async () => {
    vi.mocked(registerWorker).mockRejectedValue(new DataError('duplicate'))
    const router = await renderAt('/emisor/trabajadores/nuevo')
    await screen.findByLabelText(/Nombre completo/)
    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: 'Carlos Andrés Ramírez Pineda' } })
    fireEvent.change(screen.getByLabelText(/Tipo de documento/), { target: { value: 'cc' } })
    fireEvent.change(screen.getByLabelText(/Número de documento/), { target: { value: '1020345678' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /autoriza el tratamiento/ }))

    submit()

    expect(await screen.findByText('Ya registraste a esta persona')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/emisor/trabajadores/nuevo')
  })

  it('shows a generic failure when the API fails for any other reason', async () => {
    vi.mocked(registerWorker).mockRejectedValue(new DataError('unavailable'))
    const router = await renderAt('/emisor/trabajadores/nuevo')
    await screen.findByLabelText(/Nombre completo/)
    fillForm()

    submit()

    expect(await screen.findByText('No pudimos registrar al trabajador')).toBeInTheDocument()
    expect(screen.queryByText('Ya registraste a esta persona')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/emisor/trabajadores/nuevo')
  })

  it('sends one request when the form is submitted twice quickly', async () => {
    let release: (worker: Worker) => void = () => undefined
    vi.mocked(registerWorker).mockImplementation(
      () =>
        new Promise<Worker>((resolve) => {
          release = resolve
        }),
    )
    const router = await renderAt('/emisor/trabajadores/nuevo')
    await screen.findByLabelText(/Nombre completo/)
    fillForm()

    submit()
    submit()
    await waitFor(() => expect(registerWorker).toHaveBeenCalledTimes(1))
    release(CREATED)

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
    expect(registerWorker).toHaveBeenCalledTimes(1)
  })

  it('hides the duplicate warning when the next submit has validation errors', async () => {
    vi.mocked(registerWorker).mockRejectedValue(new DataError('duplicate'))
    await renderAt('/emisor/trabajadores/nuevo')
    await screen.findByLabelText(/Nombre completo/)
    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: 'Carlos Andrés Ramírez Pineda' } })
    fireEvent.change(screen.getByLabelText(/Tipo de documento/), { target: { value: 'cc' } })
    fireEvent.change(screen.getByLabelText(/Número de documento/), { target: { value: '1020345678' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /autoriza el tratamiento/ }))
    submit()
    expect(await screen.findByText('Ya registraste a esta persona')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Número de documento/), { target: { value: '123' } })
    submit()

    expect(await screen.findByText('Revisa 1 campo antes de continuar')).toBeInTheDocument()
    expect(screen.queryByText('Ya registraste a esta persona')).not.toBeInTheDocument()
  })

  it('cancels back to the entity flow', async () => {
    const router = await renderAt('/emisor/trabajadores/nuevo')

    fireEvent.click(await screen.findByRole('link', { name: 'Cancelar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
  })
})
