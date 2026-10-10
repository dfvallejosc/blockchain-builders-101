import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox', () => {
  it('is a checkbox labeled by its text', () => {
    render(<Checkbox label="El trabajador autoriza el tratamiento de sus datos" />)

    expect(screen.getByRole('checkbox', { name: 'El trabajador autoriza el tratamiento de sus datos' })).not.toBeChecked()
  })

  it('toggles by clicking the label text', () => {
    const onChange = vi.fn()
    render(<Checkbox label="Acepto" onChange={onChange} />)

    fireEvent.click(screen.getByText('Acepto'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('can be disabled', () => {
    render(<Checkbox label="Acepto" disabled />)

    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('can be flagged invalid', () => {
    render(<Checkbox label="Acepto" aria-invalid />)

    expect(screen.getByRole('checkbox')).toBeInvalid()
  })

  it('puts className on the row, not on the input', () => {
    render(<Checkbox label="X" className="custom-row" />)

    expect(screen.getByText('X').closest('label')).toHaveClass('custom-row')
    expect(screen.getByRole('checkbox')).not.toHaveClass('custom-row')
  })

  it('keeps combined states: checked and disabled, checked and invalid', () => {
    render(
      <>
        <Checkbox label="Off" checked disabled readOnly />
        <Checkbox label="Bad" checked aria-invalid readOnly />
      </>,
    )

    expect(screen.getByRole('checkbox', { name: 'Off' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Off' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Bad' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Bad' })).toBeInvalid()
  })
})
