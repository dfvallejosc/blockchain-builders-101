import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from '@/components/ui/empty-state'

describe('EmptyState', () => {
  it('shows title, sentence and one action', () => {
    render(
      <EmptyState variant="empty" title="Aún no hay certificados" action={<button type="button">Emitir certificado</button>}>
        Cuando emitas el primero, aparecerá aquí.
      </EmptyState>,
    )

    expect(screen.getByRole('heading', { name: 'Aún no hay certificados' })).toBeInTheDocument()
    expect(screen.getByText('Cuando emitas el primero, aparecerá aquí.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Emitir certificado' })).toBeInTheDocument()
  })

  it('works without description and without action', () => {
    render(<EmptyState variant="no-results" title="Sin resultados" />)

    expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeInTheDocument()
  })

  it('uses the danger style only for the load error', () => {
    const { container: error } = render(<EmptyState variant="error" title="No pudimos cargar" />)
    const { container: empty } = render(<EmptyState variant="empty" title="Nada" />)

    expect(error.querySelector('[data-icon-box]')).toHaveClass('text-ha-danger')
    expect(empty.querySelector('[data-icon-box]')).not.toHaveClass('text-ha-danger')
  })
})
