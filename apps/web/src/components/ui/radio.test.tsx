import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Radio } from '@/components/ui/radio'

describe('Radio', () => {
  it('is a radio labeled by its text', () => {
    render(<Radio name="w" label="Carlos" />)

    expect(screen.getByRole('radio', { name: 'Carlos' })).not.toBeChecked()
  })

  it('is selected by clicking the label text', () => {
    const onChange = vi.fn()
    render(<Radio name="w" label="Carlos" onChange={onChange} />)

    fireEvent.click(screen.getByText('Carlos'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('radio')).toBeChecked()
  })

  it('keeps an accessible name while hiding the visible label', () => {
    render(<Radio name="w" label="Elegir a Carlos" hideLabel />)

    expect(screen.getByRole('radio', { name: 'Elegir a Carlos' })).toBeInTheDocument()
    expect(screen.getByText('Elegir a Carlos')).toHaveClass('sr-only')
  })

  it('can be disabled', () => {
    render(<Radio name="w" label="Carlos" disabled />)

    expect(screen.getByRole('radio')).toBeDisabled()
  })
})
