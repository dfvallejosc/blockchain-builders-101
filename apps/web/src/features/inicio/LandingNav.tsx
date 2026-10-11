import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'

const SECTION_LINKS = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Certificados', href: '#certificados' },
  { label: 'El resultado', href: '#resultado' },
  { label: 'Para quién', href: '#entidades' },
]

const SIGN_IN_OPTIONS = [
  {
    to: '/emisor/ingresar',
    title: 'Soy una entidad emisora',
    description: 'Consultorio o centro de entrenamiento: emitir y consultar certificados.',
  },
  {
    to: '/admin/ingresar',
    title: 'Administración de HabilitApp',
    description: 'Equipo interno: registrar y revocar entidades.',
  },
]

const MENU_ID = 'sign-in-menu'

const SignInMenu = () => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const handleMouseDown = (event: MouseEvent) => {
      if (event.target instanceof Node && wrapRef.current?.contains(event.target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative ml-auto">
      <Button
        ref={buttonRef}
        variant="secondary"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={MENU_ID}
        onClick={() => setOpen((current) => !current)}
      >
        Iniciar sesión
      </Button>
      {open && (
        <div
          id={MENU_ID}
          role="group"
          aria-label="Elige cómo iniciar sesión"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-(--z-menu) w-[min(22.5rem,calc(100vw-2rem))] rounded-lg border border-ha-border bg-ha-surface p-2 shadow-(--shadow-overlay)"
        >
          <p className="px-3 py-2 text-sm font-semibold text-ha-text-muted">Elige cómo quieres entrar</p>
          {SIGN_IN_OPTIONS.map((option, index) => (
            <div key={option.to}>
              {index > 0 && <div className="mx-2 my-1 h-px bg-ha-border" />}
              <Link
                to={option.to}
                onClick={() => setOpen(false)}
                className="flex min-h-(--touch-min) flex-col rounded-md p-3 text-ha-text no-underline hover:bg-ha-primary-soft active:bg-ha-primary-soft-active"
              >
                <b className="text-base font-semibold">{option.title}</b>
                <span className="text-sm text-ha-text-muted">{option.description}</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const LandingNav = () => (
  <header className="sticky top-0 z-(--z-menu) border-b border-ha-border bg-ha-surface">
    <div className="mx-auto flex h-17 max-w-295 items-center gap-6 px-4 md:px-6">
      <Link to="/" aria-label="HabilitApp, inicio" className="flex items-center gap-3 text-lg font-bold text-ha-text no-underline">
        <Logo className="size-8" />
        HabilitApp
      </Link>
      <nav aria-label="Secciones de la página" className="ml-4 hidden gap-1 md:flex">
        {SECTION_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="inline-flex min-h-(--touch-min) items-center rounded-md px-3 font-medium text-ha-text no-underline hover:bg-ha-surface-2"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <SignInMenu />
    </div>
  </header>
)
