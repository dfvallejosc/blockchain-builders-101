import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button, buttonVariants } from '@/components/ui/button'

describe('Button', () => {
  it('renders a button of type "button" by default', () => {
    render(<Button>Emitir certificado</Button>)

    expect(screen.getByRole('button', { name: 'Emitir certificado' })).toHaveAttribute('type', 'button')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Registrar emisor</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Registrar emisor' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Anular certificado
      </Button>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Anular certificado' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('styles the variants differently', () => {
    expect(buttonVariants({ variant: 'primary' })).toContain('bg-ha-primary')
    expect(buttonVariants({ variant: 'destructive' })).toContain('bg-ha-danger')
    expect(buttonVariants({ variant: 'secondary' })).toContain('border-ha-border-strong')
    expect(buttonVariants({ variant: 'ghost' })).toContain('text-ha-primary')
  })

  it('uses 44 px by default and the three sizes differ', () => {
    expect(buttonVariants({})).toContain('min-h-(--control-md)')
    expect(buttonVariants({ size: 'sm' })).toContain('min-h-(--control-sm)')
    expect(buttonVariants({ size: 'lg' })).toContain('min-h-(--control-lg)')
  })

  describe('loading', () => {
    it('shows the loading text, marks the button busy and hides the label from assistive tech', () => {
      render(
        <Button loading loadingText="Emitiendo…">
          Emitir certificado
        </Button>,
      )

      const button = screen.getByRole('button', { name: 'Emitiendo…' })
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(screen.queryByRole('button', { name: /Emitir certificado/ })).not.toBeInTheDocument()
    })

    it('keeps the label as the accessible name when loading without loadingText', () => {
      const onClick = vi.fn()
      render(
        <Button loading onClick={onClick}>
          Guardar
        </Button>,
      )

      const button = screen.getByRole('button', { name: 'Guardar' })
      expect(button).toHaveAttribute('aria-busy', 'true')
      fireEvent.click(button)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('does not call onClick while loading', () => {
      const onClick = vi.fn()
      render(
        <Button loading loadingText="Emitiendo…" onClick={onClick}>
          Emitir certificado
        </Button>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Emitiendo…' }))

      expect(onClick).not.toHaveBeenCalled()
    })

    it('does not submit a form while loading', () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit" loading loadingText="Guardando…">
            Guardar
          </Button>
        </form>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Guardando…' }))

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('submits a form when not loading', () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit">Guardar</Button>
        </form>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
  })

  it('renders an icon-only button with its accessible name', () => {
    render(
      <Button iconOnly aria-label="Cerrar aviso">
        <svg aria-hidden="true" />
      </Button>,
    )

    expect(screen.getByRole('button', { name: 'Cerrar aviso' })).toBeInTheDocument()
  })
})
