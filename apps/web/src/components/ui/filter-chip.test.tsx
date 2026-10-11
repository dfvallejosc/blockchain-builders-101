import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FilterChip } from '@/components/ui/filter-chip'

describe('FilterChip', () => {
  it('is a toggle button that reports it is not pressed', () => {
    render(<FilterChip pressed={false} onPressedChange={() => undefined}>Vencido</FilterChip>)

    expect(screen.getByRole('button', { name: 'Vencido' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('asks for the opposite value when clicked', () => {
    const onPressedChange = vi.fn()
    const { rerender } = render(<FilterChip pressed={false} onPressedChange={onPressedChange}>Vencido</FilterChip>)

    fireEvent.click(screen.getByRole('button', { name: 'Vencido' }))
    expect(onPressedChange).toHaveBeenLastCalledWith(true)

    rerender(<FilterChip pressed onPressedChange={onPressedChange}>Vencido</FilterChip>)
    fireEvent.click(screen.getByRole('button', { name: 'Vencido' }))
    expect(onPressedChange).toHaveBeenLastCalledWith(false)
  })

  it('shows a hidden check icon only when pressed so the state is not told by color alone', () => {
    const { container, rerender } = render(<FilterChip pressed={false} onPressedChange={() => undefined}>Vencido</FilterChip>)
    expect(container.querySelector('svg')).not.toBeInTheDocument()

    rerender(<FilterChip pressed onPressedChange={() => undefined}>Vencido</FilterChip>)
    expect(screen.getByRole('button', { name: 'Vencido' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
