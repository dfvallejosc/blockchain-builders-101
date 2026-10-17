import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { listWorkers, resetState, revokeEntity, signIn } from '@/data'
import { issuerRoutes } from '@/features/emisor/routes'
import { createQueryWrapper } from '@/test/query'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).demoClerkModule())
vi.mock('@/api/me', async () => (await import('@/test/clerk')).demoMeModule())

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

const CUMBRE = 'centro-entrenamiento-cumbre-firme'

const renderAt = async (path: string) => {
  await signIn('issuer', 'coordinacion@cumbrefirme.co', 'x')
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
    window.localStorage.clear()
    resetState()
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
    expect(await listWorkers(CUMBRE)).toHaveLength(12)
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

  it('registers the worker with the data layer and goes back to the entity flow', async () => {
    const router = await renderAt('/emisor/trabajadores/nuevo')
    await screen.findByLabelText(/Nombre completo/)
    fillForm()

    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
    const workers = await listWorkers(CUMBRE)
    const added = workers.find((worker) => worker.documentNumber === '1037456789')
    expect(added).toMatchObject({ fullName: 'Marta Lucía Gómez Ríos', documentType: 'cc', consentedAt: '2026-10-09' })
    expect(await screen.findByText('Trabajador registrado')).toBeInTheDocument()
  })

  it('returns to step 2 of "Emitir certificado" with the worker already chosen', async () => {
    const router = await renderAt('/emisor/trabajadores/nuevo?volver=emitir')
    await screen.findByLabelText(/Nombre completo/)
    fillForm()

    submit()

    const added = async () => (await listWorkers(CUMBRE)).find((worker) => worker.documentNumber === '1037456789')
    await waitFor(() => expect(router.state.location.pathname).toBe('/emisor/emitir'))
    const worker = await added()
    expect(router.state.location.search).toBe(`?trabajador=${worker?.id}&nuevo=1`)
    expect(await screen.findByRole('heading', { name: 'Datos del certificado' })).toBeInTheDocument()
    expect(screen.getByText('Ahora completa los datos del certificado.')).toBeInTheDocument()
  })

  it('warns when the worker is already registered in the entity', async () => {
    const router = await renderAt('/emisor/trabajadores/nuevo')
    await screen.findByLabelText(/Nombre completo/)
    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: 'Carlos Andrés Ramírez Pineda' } })
    fireEvent.change(screen.getByLabelText(/Tipo de documento/), { target: { value: 'cc' } })
    fireEvent.change(screen.getByLabelText(/Número de documento/), { target: { value: '1020345678' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /autoriza el tratamiento/ }))

    submit()

    expect(await screen.findByText('Ya registraste a esta persona')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/emisor/trabajadores/nuevo')
    expect(await listWorkers(CUMBRE)).toHaveLength(12)
  })

  it('hides the duplicate warning when the next submit has validation errors', async () => {
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

  it('blocks registering when the entity is revoked', async () => {
    await revokeEntity(CUMBRE)
    await renderAt('/emisor/trabajadores/nuevo')

    expect(await screen.findByText('Tu entidad está revocada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar trabajador' })).toBeDisabled()
  })
})
