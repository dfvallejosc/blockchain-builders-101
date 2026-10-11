import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from '@/components/ui/alert'

describe('Alert', () => {
  it('shows the title and the text', () => {
    render(
      <Alert tone="info" title="Acceso enviado">
        Le enviamos las instrucciones por correo.
      </Alert>,
    )

    expect(screen.getByText('Acceso enviado')).toBeInTheDocument()
    expect(screen.getByText('Le enviamos las instrucciones por correo.')).toBeInTheDocument()
  })

  it('uses role "status" for calm tones and role "alert" for danger', () => {
    const { rerender } = render(<Alert tone="success" title="Listo" />)
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(<Alert tone="danger" title="No pudimos iniciar tu sesión" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders an optional action', () => {
    render(<Alert tone="warning" title="Entidad revocada" action={<a href="/x">Ver motivo</a>} />)

    expect(screen.getByRole('link', { name: 'Ver motivo' })).toBeInTheDocument()
  })

  it('shows a close button only when onClose is given, and calls it', () => {
    const onClose = vi.fn()
    const { rerender } = render(<Alert tone="info" title="Aviso" />)
    expect(screen.queryByRole('button', { name: 'Cerrar aviso' })).not.toBeInTheDocument()

    rerender(<Alert tone="info" title="Aviso" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('hides the tone icon from assistive tech', () => {
    const { container } = render(<Alert tone="danger" title="Error" />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
