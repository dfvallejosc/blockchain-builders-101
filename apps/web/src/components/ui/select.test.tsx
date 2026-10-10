import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'

describe('Select', () => {
  it('is a native combobox with its options', () => {
    render(
      <Select aria-label="Ciudad" defaultValue="">
        <option value="">Elige una ciudad</option>
        <option value="bogota">Bogotá</option>
        <option value="medellin">Medellín</option>
      </Select>,
    )

    expect(screen.getByRole('combobox', { name: 'Ciudad' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Medellín' })).toBeInTheDocument()
  })

  it('reports the chosen value', () => {
    const onChange = vi.fn()
    render(
      <Select aria-label="Ciudad" defaultValue="" onChange={onChange}>
        <option value="">Elige</option>
        <option value="cali">Cali</option>
      </Select>,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cali' } })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('combobox')).toHaveValue('cali')
  })

  it('works inside a Field with label, help and error', () => {
    render(
      <Field label="Tipo de entidad" help="Elige uno." error="Elige un tipo.">
        {(control) => (
          <Select {...control} defaultValue="">
            <option value="">Elige un tipo</option>
          </Select>
        )}
      </Field>,
    )

    const select = screen.getByLabelText('Tipo de entidad')
    expect(select).toBeInvalid()
    expect(select).toHaveAccessibleDescription('Elige uno. Elige un tipo.')
  })

  it('can be disabled', () => {
    render(
      <Select aria-label="Ciudad" disabled>
        <option>Bogotá</option>
      </Select>,
    )

    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
