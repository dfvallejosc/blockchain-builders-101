import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import { listEntities, resetState, signIn } from '@/data'
import * as entitiesModule from '@/data/entities'
import { adminRoutes } from '@/features/admin/routes'

vi.mock('@/data/entities', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/entities')>()
  return { ...actual, registerEntity: vi.fn(actual.registerEntity) }
})

const renderPage = async () => {
  await signIn('admin', 'daniela.rojas@habilitapp.co', 'x')
  const router = createMemoryRouter(adminRoutes, { initialEntries: ['/admin/emisores/nuevo'] })
  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  )
  return router
}

interface FormInput {
  name: string
  nit: string
  email: string
  phone: string
  contactName: string
}

const DEFAULTS: FormInput = {
  name: 'Torre Firme Salud',
  nit: '901.482.318-5',
  email: 'laura.pardo@torrefirme.co',
  phone: '310 555 0199',
  contactName: 'Laura Pardo Soto',
}

const fillForm = (overrides: Partial<FormInput> = {}, { withCertificate = true } = {}) => {
  const values = { ...DEFAULTS, ...overrides }
  fireEvent.change(screen.getByLabelText(/Nombre de la entidad/), { target: { value: values.name } })
  fireEvent.change(screen.getByLabelText(/Tipo de entidad/), { target: { value: 'clinic' } })
  fireEvent.change(screen.getByLabelText(/Ciudad/), { target: { value: 'Bogotá' } })
  if (withCertificate) {
    fireEvent.click(screen.getByRole('button', { name: /Certificados que emite/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Trabajo en alturas' }))
  }
  fireEvent.change(screen.getByLabelText(/NIT/), { target: { value: values.nit } })
  fireEvent.change(screen.getByLabelText(/Persona de contacto/), { target: { value: values.contactName } })
  fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: values.email } })
  fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: values.phone } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Registrar emisor' }))

describe('RegisterEntityPage', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    resetState()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 14, 12))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const actual = await vi.importActual<typeof import('@/data/entities')>('@/data/entities')
    vi.mocked(entitiesModule.registerEntity).mockReset()
    vi.mocked(entitiesModule.registerEntity).mockImplementation(actual.registerEntity)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the screen texts and the two sections', async () => {
    await renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Registrar emisor' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Cuando registres la entidad, podrá emitir certificados. Revisa bien el NIT y el correo: el correo será su usuario de acceso.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Datos de la entidad' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Contacto y acceso' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Número de registro ante el Ministerio del Trabajo/)).not.toBeRequired()
  })

  it('offers the two entity types, the cities and the four certificate types', async () => {
    await renderPage()
    const type = await screen.findByLabelText(/Tipo de entidad/)

    expect(Array.from((type as HTMLSelectElement).options).map((option) => option.text)).toEqual([
      'Elige un tipo',
      'Consultorio de salud ocupacional',
      'Centro de entrenamiento',
    ])
    expect((screen.getByLabelText(/Ciudad/) as HTMLSelectElement).options).toHaveLength(11)
    fireEvent.click(screen.getByRole('button', { name: /Certificados que emite/ }))
    expect(screen.getAllByRole('checkbox').map((box) => box.getAttribute('aria-label') ?? box.closest('label')?.textContent)).toEqual([
      'Trabajo en alturas',
      'Espacios confinados',
      'Operación de grúa',
      'Concepto médico ocupacional',
    ])
  })

  it('shows an error summary with a link per field, and focuses the summary, when sent empty', async () => {
    await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)

    submit()

    const summary = await screen.findByText('Revisa 8 campos antes de continuar')
    await waitFor(() => expect(summary.closest('[tabindex="-1"]')).toHaveFocus())
    expect(screen.getByLabelText(/Nombre de la entidad/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/NIT/)).toHaveAccessibleDescription(/Revisa|Escribe el NIT/)
    expect(entitiesModule.registerEntity).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Teléfono' }))
    await waitFor(() => expect(screen.getByLabelText(/Teléfono/)).toHaveFocus())
  })

  it('links the certificates error to the certificates control', async () => {
    await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm({}, { withCertificate: false })

    submit()

    expect(await screen.findByText('Elige al menos un tipo de certificado.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Certificados que emite' }))
    expect(screen.getByRole('button', { name: /Certificados que emite/, expanded: false })).toHaveFocus()
  })

  it('registers the issuer, tells so, and goes to its detail page', async () => {
    const router = await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm({ nit: '9014823185', phone: '310-555-0199' })

    submit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/emisores/torre-firme-salud'))
    expect(router.state.location.search).toBe('?nuevo=1')
    expect(await screen.findByText('Emisor registrado')).toBeInTheDocument()
    expect(screen.getByText('Torre Firme Salud ya puede emitir certificados.')).toBeInTheDocument()
    expect(entitiesModule.registerEntity).toHaveBeenCalledTimes(1)
  })

  it('saves the issuer as Habilitado with the normalized NIT and phone, and its email can sign in', async () => {
    await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm({ nit: '9014823185', phone: '310-555-0199' })

    submit()

    await waitFor(async () => expect((await listEntities()).some((entity) => entity.id === 'torre-firme-salud')).toBe(true))
    const saved = (await listEntities()).find((entity) => entity.id === 'torre-firme-salud')
    expect(saved).toMatchObject({
      nit: '901.482.318-5',
      phone: '310 555 0199',
      revokedAt: null,
      registeredAt: '2026-10-14',
      certificateTypes: ['height-work'],
      email: 'laura.pardo@torrefirme.co',
    })
    await expect(signIn('issuer', 'laura.pardo@torrefirme.co', 'x')).resolves.toMatchObject({ role: 'issuer' })
  })

  it.each([
    ['name without accents', { name: 'Salud Laboral Rio Claro' }],
    ['NIT typed without punctuation', { nit: '9014823175' }],
    ['NIT typed with spaces', { nit: '901 482 317 5' }],
    ['email in capital letters', { email: 'COORDINACION@CUMBREFIRME.CO' }],
  ])('warns instead of registering when the %s is already taken', async (_label, overrides) => {
    const router = await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm(overrides)

    submit()

    expect(await screen.findByText('Ya hay un emisor con esos datos')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/emisores/nuevo')
    expect((await listEntities()).length).toBe(8)
  })

  it('shows a generic error when saving fails for another reason', async () => {
    vi.mocked(entitiesModule.registerEntity).mockRejectedValueOnce(new Error('boom'))
    const router = await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm()

    submit()

    expect(await screen.findByText('No pudimos registrar al emisor')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/emisores/nuevo')
  })

  it('sends only once when the button is pressed twice', async () => {
    const router = await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm()
    const button = screen.getByRole('button', { name: 'Registrar emisor' })

    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/emisores/torre-firme-salud'))
    expect(entitiesModule.registerEntity).toHaveBeenCalledTimes(1)
  })

  it('goes back to the list with Cancelar', async () => {
    const router = await renderPage()

    fireEvent.click(await screen.findByRole('link', { name: 'Cancelar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/emisores'))
  })
})
