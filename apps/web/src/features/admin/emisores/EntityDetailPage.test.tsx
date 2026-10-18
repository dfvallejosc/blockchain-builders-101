import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { today } from '@/data/clock'
import { formatLongDate } from '@/features/verificar/format'
import { DataError } from '@/data/errors'
import { renderAdminAt, resetAdminTestState } from '@/test/admin'
import { issuersApi } from '@/test/issuers-api'

vi.mock('@clerk/react', async () => (await import('@/test/clerk')).sessionClerkModule())
vi.mock('@/api/me', () => ({ getMe: vi.fn() }))
vi.mock('@/api/issuers', async () => (await import('@/test/issuers-api')).issuersApi)

const ACTIVE_ID = 'centro-entrenamiento-cumbre-firme'
const ACTIVE_NAME = 'Centro de Entrenamiento Cumbre Firme'
const REVOKED_ID = 'consultorio-medico-bahia-norte'

const renderPage = async (id: string) => renderAdminAt(`/admin/emisores/${id}`)

const revokeButton = () => screen.queryByRole('button', { name: 'Revocar emisor' })
const openDialog = () => fireEvent.click(screen.getByRole('button', { name: 'Revocar emisor' }))
const dialog = () => screen.getByRole('dialog', { name: `¿Revocar a ${ACTIVE_NAME}?` })
const type = (text: string) => fireEvent.change(within(dialog()).getByLabelText(/Escribe/), { target: { value: text } })
const confirm = () => within(dialog()).getByRole('button', { name: 'Revocar emisor' })

describe('EntityDetailPage', () => {
  beforeEach(() => {
    resetAdminTestState()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows the name, the status and the summary line of an active issuer', async () => {
    await renderPage(ACTIVE_ID)

    expect(await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })).toBeInTheDocument()
    expect(screen.getByText('Habilitado')).toBeInTheDocument()
    expect(screen.getByText('Centro de entrenamiento · Bogotá · Registrado el 17 de junio de 2025')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the data of the entity', async () => {
    await renderPage(ACTIVE_ID)
    await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })

    expect(screen.getByRole('heading', { level: 2, name: 'Datos de la entidad' })).toBeInTheDocument()
    const rows = Object.fromEntries(
      screen.getAllByRole('term').map((term) => [term.textContent, term.nextElementSibling?.textContent]),
    )
    expect(rows).toMatchObject({
      'Tipo de entidad': 'Centro de entrenamiento',
      Ciudad: 'Bogotá',
      NIT: '901.482.317-5',
      'Persona de contacto': 'Marcela Uribe Restrepo',
      'Correo (usuario de acceso)': 'coordinacion@cumbrefirme.co',
      Teléfono: '310 555 0142',
      'Certificados que emite': 'Trabajo en alturas, Espacios confinados, Operación de grúa',
      'Registro ante el Ministerio del Trabajo': 'MT-2024-01873',
      'Registrado el': '17 de junio de 2025',
    })
    expect(rows).not.toHaveProperty('Revocado el')
  })

  it('shows how many certificates the issuer emitted this month', async () => {
    await renderPage(ACTIVE_ID)

    const card = (await screen.findByRole('heading', { level: 2, name: 'Certificados emitidos este mes' })).closest('section')
    expect(card).toHaveTextContent('8')
  })

  it('offers to revoke an active issuer', async () => {
    await renderPage(ACTIVE_ID)
    await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })

    expect(screen.getByRole('heading', { level: 2, name: 'Revocar emisor' })).toBeInTheDocument()
    expect(revokeButton()).toBeInTheDocument()
  })

  it('shows a revoked issuer with its alert, its date and no revoke action', async () => {
    await renderPage(REVOKED_ID)

    expect(await screen.findByRole('heading', { level: 1, name: 'Consultorio Médico Bahía Norte' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Emisor revocado el 19 de agosto de 2026')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ninguno de sus certificados se verifica como válido y la entidad no puede emitir nuevos.',
    )
    expect(screen.getByText('Revocado')).toBeInTheDocument()
    expect(screen.getByText('Revocado el').nextElementSibling).toHaveTextContent('19 de agosto de 2026')
    expect(revokeButton()).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Revocar emisor' })).not.toBeInTheDocument()
  })

  it('links back to the list of issuers', async () => {
    await renderPage(ACTIVE_ID)

    expect(await screen.findByRole('link', { name: 'Volver a emisores' })).toHaveAttribute('href', '/admin/emisores')
  })

  it('shows a loading state while the issuer is loading', async () => {
    issuersApi.getIssuer.mockImplementation(() => new Promise(() => undefined))
    await renderPage(ACTIVE_ID)

    expect(await screen.findByRole('status', { name: 'Cargando emisor' })).toBeInTheDocument()
  })

  it('tells the admin when the issuer does not exist', async () => {
    await renderPage('no-existe')

    expect(await screen.findByRole('heading', { name: 'No encontramos este emisor' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver emisores' })).toHaveAttribute('href', '/admin/emisores')
  })

  it('offers to retry when the issuer cannot be loaded', async () => {
    issuersApi.getIssuer.mockRejectedValueOnce(new Error('boom'))
    await renderPage(ACTIVE_ID)

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar el emisor' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })).toBeInTheDocument()
  })

  it('does not show the previous issuer while another one is loading', async () => {
    const router = await renderPage(ACTIVE_ID)
    await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })
    issuersApi.getIssuer.mockImplementation(() => new Promise(() => undefined))

    await router.navigate('/admin/emisores/salud-laboral-rio-claro')

    expect(await screen.findByRole('status', { name: 'Cargando emisor' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: ACTIVE_NAME })).not.toBeInTheDocument()
    expect(revokeButton()).not.toBeInTheDocument()
  })

  describe('revoking', () => {
    it('asks for confirmation naming the issuer and keeps the action disabled until its name is typed', async () => {
      await renderPage(ACTIVE_ID)
      await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })

      openDialog()

      expect(dialog()).toHaveTextContent(
        'Todos los certificados de esta entidad dejarán de verse como válidos en todas las obras. Tampoco podrá emitir nuevos.',
      )
      expect(dialog()).toHaveTextContent('El cambio se aplica de inmediato.')
      expect(confirm()).toBeDisabled()
      type('otro nombre')
      expect(confirm()).toBeDisabled()
      type(ACTIVE_NAME)
      expect(confirm()).toBeEnabled()
    })

    it('does nothing when the admin cancels', async () => {
      await renderPage(ACTIVE_ID)
      await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })
      openDialog()

      fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancelar' }))

      expect(issuersApi.revokeIssuer).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(revokeButton()).toBeInTheDocument()
    })

    it('revokes the issuer, shows the alert, removes the action and tells the admin', async () => {
      await renderPage(ACTIVE_ID)
      await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })
      openDialog()
      type(ACTIVE_NAME)

      fireEvent.click(confirm())

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(`Emisor revocado el ${formatLongDate(today())}`))
      expect(issuersApi.revokeIssuer).toHaveBeenCalledWith(ACTIVE_ID)
      expect(screen.getByText('Revocado')).toBeInTheDocument()
      expect(screen.queryByText('Habilitado')).not.toBeInTheDocument()
      expect(revokeButton()).not.toBeInTheDocument()
      expect(screen.getByText('Revocado el').nextElementSibling).toHaveTextContent(formatLongDate(today()))
      expect(await screen.findByText('Emisor revocado')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: ACTIVE_NAME })).toHaveFocus()
    })

    it('moves focus to the title only after the confirmation dialog is closed', async () => {
      await renderPage(ACTIVE_ID)
      const heading = await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })
      const openDialogsWhenFocused: number[] = []
      heading.addEventListener('focus', () => openDialogsWhenFocused.push(document.querySelectorAll('dialog[open]').length))
      openDialog()
      type(ACTIVE_NAME)

      fireEvent.click(confirm())
      await screen.findByRole('alert')

      expect(heading).toHaveFocus()
      expect(openDialogsWhenFocused).toEqual([0])
    })

    it('leaves the issuer revoked in the list', async () => {
      await renderPage(ACTIVE_ID)
      await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })
      openDialog()
      type(ACTIVE_NAME)
      fireEvent.click(confirm())
      await screen.findByRole('alert')

      const entity = (await issuersApi.listIssuers()).find((candidate) => candidate.id === ACTIVE_ID)
      expect(entity?.revokedAt).toBe(today())
    })

    it('shows no revocation notice at all, neither failure nor success, when the session ended while revoking', async () => {
      issuersApi.revokeIssuer.mockRejectedValueOnce(new DataError('unauthorized'))
      await renderPage(ACTIVE_ID)
      await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })
      openDialog()
      type(ACTIVE_NAME)

      fireEvent.click(confirm())

      await waitFor(() => expect(issuersApi.revokeIssuer).toHaveBeenCalledTimes(1))
      expect(screen.queryByText('No pudimos revocar al emisor')).not.toBeInTheDocument()
      expect(screen.queryByText('Emisor revocado')).not.toBeInTheDocument()
      expect(screen.queryByText(/Emisor revocado el/)).not.toBeInTheDocument()
    })

    it('keeps the issuer active and warns the admin when revoking fails', async () => {
      issuersApi.revokeIssuer.mockRejectedValueOnce(new Error('boom'))
      await renderPage(ACTIVE_ID)
      await screen.findByRole('heading', { level: 1, name: ACTIVE_NAME })
      openDialog()
      type(ACTIVE_NAME)

      fireEvent.click(confirm())

      expect(await screen.findByText('No pudimos revocar al emisor')).toBeInTheDocument()
      expect(screen.queryByText(/Emisor revocado el/)).not.toBeInTheDocument()
      expect(screen.getByText('Habilitado')).toBeInTheDocument()
      expect(revokeButton()).toBeInTheDocument()
    })
  })
})
