import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetState } from '@/data'
import { LandingPage } from '@/features/inicio/LandingPage'
import { apiClient } from '@/lib/api-client'

const DEMO_ID = 'd1eb3fd0-3e55-467c-b877-1e7c97a00f94'

const renderLanding = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )

describe('LandingPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetState()
    vi.spyOn(apiClient, 'get')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('structure', () => {
    it('has a single level-one heading', async () => {
      renderLanding()

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Comprueba en segundos si un trabajador está habilitado.' }),
      ).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    })

    it.each([
      ['Cómo funciona', 'como-funciona'],
      ['Los certificados que se pueden comprobar', 'certificados'],
      ['Un resultado que se lee de un vistazo', 'resultado'],
      ['Para quién es HabilitApp', 'entidades'],
    ])('shows the "%s" section with id #%s', (name, id) => {
      renderLanding()

      const heading = screen.getByRole('heading', { level: 2, name })
      expect(heading.closest('section')).toHaveAttribute('id', id)
    })

    it('links the navigation bar to every section', () => {
      renderLanding()

      const nav = screen.getByRole('navigation', { name: 'Secciones de la página' })
      expect(within(nav).getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '#como-funciona')
      expect(within(nav).getByRole('link', { name: 'Certificados' })).toHaveAttribute('href', '#certificados')
      expect(within(nav).getByRole('link', { name: 'El resultado' })).toHaveAttribute('href', '#resultado')
      expect(within(nav).getByRole('link', { name: 'Para quién' })).toHaveAttribute('href', '#entidades')
    })

    it('lists the three steps and the four certificate types', () => {
      renderLanding()

      expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
      for (const name of ['Trabajo en alturas', 'Espacios confinados', 'Operación de grúa', 'Concepto médico ocupacional']) {
        expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument()
      }
    })

    it('explains the four verdicts with an icon and a word', () => {
      renderLanding()

      const section = screen.getByRole('heading', { level: 2, name: 'Un resultado que se lee de un vistazo' }).closest('section')!
      for (const word of ['Habilitado', 'Vencido', 'Anulado', 'No válido']) {
        expect(within(section).getByText(word)).toBeInTheDocument()
      }
    })
  })

  describe('sign-in menu', () => {
    it('starts closed and opens with the two sign-in options', () => {
      renderLanding()

      const button = screen.getByRole('button', { name: 'Iniciar sesión' })
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('group', { name: 'Elige cómo iniciar sesión' })).not.toBeInTheDocument()

      fireEvent.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
      const menu = screen.getByRole('group', { name: 'Elige cómo iniciar sesión' })
      expect(within(menu).getByRole('link', { name: /Soy una entidad emisora/ })).toHaveAttribute('href', '/emisor/ingresar')
      expect(within(menu).getByRole('link', { name: /Administración de HabilitApp/ })).toHaveAttribute('href', '/admin/ingresar')
    })

    it('closes with Escape and gives the focus back to the button', () => {
      renderLanding()
      const button = screen.getByRole('button', { name: 'Iniciar sesión' })

      fireEvent.click(button)
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveFocus()
      expect(screen.queryByRole('group', { name: 'Elige cómo iniciar sesión' })).not.toBeInTheDocument()
    })

    it('closes when pressing the button a second time', () => {
      renderLanding()
      const button = screen.getByRole('button', { name: 'Iniciar sesión' })

      fireEvent.click(button)
      fireEvent.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('does not move the focus when pressing Escape with the menu closed', () => {
      renderLanding()
      const button = screen.getByRole('button', { name: 'Iniciar sesión' })

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(button).not.toHaveFocus()
    })

    it('closes when clicking outside', () => {
      renderLanding()
      const button = screen.getByRole('button', { name: 'Iniciar sesión' })

      fireEvent.click(button)
      fireEvent.mouseDown(screen.getByRole('heading', { level: 2, name: 'Cómo funciona' }))

      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('closes when choosing an option', () => {
      renderLanding()
      const button = screen.getByRole('button', { name: 'Iniciar sesión' })

      fireEvent.click(button)
      const menu = screen.getByRole('group', { name: 'Elige cómo iniciar sesión' })
      fireEvent.click(within(menu).getByRole('link', { name: /Soy una entidad emisora/ }))

      expect(button).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('calls to action', () => {
    it('sends the main button to the demo certificate check when one is configured', () => {
      vi.stubEnv('VITE_DEMO_CERTIFICATE_ID', DEMO_ID)
      renderLanding()

      expect(screen.getByRole('link', { name: 'Ver cómo se verifica un certificado' })).toHaveAttribute(
        'href',
        `/c/${DEMO_ID}`,
      )
    })

    it.each(['', '   '])('hides the demo link instead of sending anyone to a made-up id when the setting is %j', (value) => {
      vi.stubEnv('VITE_DEMO_CERTIFICATE_ID', value)
      renderLanding()

      expect(screen.queryByRole('link', { name: 'Ver cómo se verifica un certificado' })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Soy una entidad emisora' })).toBeInTheDocument()
    })

    it('sends "Soy una entidad emisora" to the audience section', () => {
      renderLanding()

      const hero = screen.getByRole('heading', { level: 1 }).closest('section')!
      expect(within(hero).getByRole('link', { name: 'Soy una entidad emisora' })).toHaveAttribute('href', '#entidades')
    })
  })

  describe('hero preview', () => {
    it('shows the sample certificate with the real verdict components, hidden from assistive tech', async () => {
      renderLanding()

      expect(await screen.findByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
      const preview = screen.getByTestId('hero-preview')
      expect(preview).toHaveAttribute('aria-hidden', 'true')
      expect(within(preview).getByRole('heading', { level: 1, name: 'Habilitado', hidden: true })).toBeInTheDocument()
    })

    it('draws the preview from a fixed sample and never asks the API', async () => {
      renderLanding()
      await screen.findByText('Carlos Andrés Ramírez Pineda')

      expect(apiClient.get).not.toHaveBeenCalled()
    })

    it('does not let anything inside the preview take the focus', () => {
      renderLanding()

      expect(screen.getByTestId('hero-preview')).toHaveAttribute('inert')
    })
  })

  describe('product rules', () => {
    it('never mentions medical results, restrictions or diagnoses as shown data', async () => {
      renderLanding()
      await screen.findByText('Carlos Andrés Ramírez Pineda')

      const NOTE = 'Nunca resultados médicos, restricciones ni diagnósticos.'
      const text = document.body.textContent ?? ''
      expect(text).toContain(NOTE)
      expect(text.replace(NOTE, '')).not.toMatch(/diagn[oó]stic|restricci[oó]n|resultado m[eé]dico|no apto/i)
    })

    it('does not use blockchain jargon', async () => {
      renderLanding()
      await screen.findByText('Carlos Andrés Ramírez Pineda')

      expect(document.body.textContent).not.toMatch(/blockchain|cadena de bloques|stellar|hash|contrato inteligente|wallet/i)
    })

    it('does not carry the mockup leftovers', () => {
      renderLanding()

      expect(screen.queryByText(/mockup/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Ver los estados de la verificación/ })).not.toBeInTheDocument()
    })
  })
})
