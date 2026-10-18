import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataError } from '@/data/errors'
import { renderAdminAt, resetAdminTestState } from '@/test/admin'
import { issuersApi } from '@/test/issuers-api'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).sessionClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/issuers', async () => (await import('@/test/issuers-api')).issuersApi)

const renderPage = async () => renderAdminAt('/admin/emisores/nuevo')

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
  beforeEach(() => {
    resetAdminTestState()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 14, 12))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('shows the screen texts and the two sections', async () => {
    await renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Registrar emisor' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Al registrar la entidad, le enviaremos una invitación al correo de contacto para que cree su acceso. Revisa bien el NIT y el correo: ese correo será su usuario.',
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
    expect(screen.getByLabelText(/NIT/)).toHaveAccessibleDescription(/Escribe el NIT de la entidad\./)
    expect(issuersApi.registerIssuer).not.toHaveBeenCalled()
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
    expect(
      screen.getByText('Enviamos una invitación a laura.pardo@torrefirme.co. Torre Firme Salud podrá emitir cuando la acepte.'),
    ).toBeInTheDocument()
    expect(issuersApi.registerIssuer).toHaveBeenCalledTimes(1)
  })

  it('saves the issuer as Habilitado with the normalized NIT and phone', async () => {
    await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm({ nit: '9014823185', phone: '310-555-0199' })

    submit()

    await waitFor(async () => expect((await issuersApi.listIssuers()).some((entity) => entity.id === 'torre-firme-salud')).toBe(true))
    const saved = (await issuersApi.listIssuers()).find((entity) => entity.id === 'torre-firme-salud')
    expect(saved).toMatchObject({
      nit: '901.482.318-5',
      phone: '310 555 0199',
      revokedAt: null,
      registeredAt: '2026-10-14',
      certificateTypes: ['height-work'],
      email: 'laura.pardo@torrefirme.co',
    })
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

    const alert = await screen.findByText('Ya hay un emisor con esos datos')
    await waitFor(() => expect(alert.closest('[tabindex="-1"]')).toHaveFocus())
    expect(router.state.location.pathname).toBe('/admin/emisores/nuevo')
    expect((await issuersApi.listIssuers()).length).toBe(8)
    expect(
      screen.getByText(
        'El NIT o el correo ya están registrados. Si es el correo, puede que ya tenga una cuenta o una invitación pendiente.',
      ),
    ).toBeInTheDocument()
  })

  it('shows a generic error when saving fails for another reason', async () => {
    issuersApi.registerIssuer.mockRejectedValueOnce(new Error('boom'))
    const router = await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm()

    submit()

    const alert = await screen.findByText('No pudimos registrar al emisor')
    await waitFor(() => expect(alert.closest('[tabindex="-1"]')).toHaveFocus())
    expect(router.state.location.pathname).toBe('/admin/emisores/nuevo')
    expect(
      screen.getByText(
        'No se guardó ningún cambio. Inténtalo de nuevo en un momento y, si dudas, revisa la lista antes de reintentar.',
      ),
    ).toBeInTheDocument()
  })

  it.each([
    ['a 5xx or a network failure', new DataError('unavailable')],
    ['a 400', new DataError('invalid-input')],
  ])('shows the same failure text on %s, and nothing was saved', async (_label, failure) => {
    issuersApi.registerIssuer.mockRejectedValueOnce(failure)
    await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm()

    submit()

    expect(await screen.findByText('No pudimos registrar al emisor')).toBeInTheDocument()
    expect(screen.getByText(/No se guardó ningún cambio/)).toBeInTheDocument()
    expect((await issuersApi.listIssuers()).length).toBe(8)
  })

  it('sends only once when the button is pressed twice', async () => {
    const router = await renderPage()
    await screen.findByLabelText(/Nombre de la entidad/)
    fillForm()
    const button = screen.getByRole('button', { name: 'Registrar emisor' })

    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/emisores/torre-firme-salud'))
    expect(issuersApi.registerIssuer).toHaveBeenCalledTimes(1)
  })

  it('goes back to the list with Cancelar', async () => {
    const router = await renderPage()

    fireEvent.click(await screen.findByRole('link', { name: 'Cancelar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/emisores'))
  })
})
