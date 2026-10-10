import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/field'

describe('Field', () => {
  it('links the visible label to the control', () => {
    render(<Field label="Nombre completo">{(control) => <Input {...control} />}</Field>)

    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument()
  })

  it('marks required fields in the label with "(obligatorio)" and sets aria-required', () => {
    render(
      <Field label="Correo" required>
        {(control) => <Input {...control} />}
      </Field>,
    )

    const input = screen.getByLabelText(/Correo/)
    expect(screen.getByText('(obligatorio)')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-required', 'true')
  })

  it('does not mark optional fields', () => {
    render(<Field label="Teléfono">{(control) => <Input {...control} />}</Field>)

    expect(screen.queryByText('(obligatorio)')).not.toBeInTheDocument()
  })

  it('describes the control with the help text', () => {
    render(
      <Field label="NIT" help="Con dígito de verificación.">
        {(control) => <Input {...control} />}
      </Field>,
    )

    expect(screen.getByLabelText('NIT')).toHaveAccessibleDescription('Con dígito de verificación.')
  })

  it('shows the error with an icon, flags the control invalid and describes it by help and error', () => {
    render(
      <Field label="NIT" help="Con dígito de verificación." error="Escribe un NIT válido.">
        {(control) => <Input {...control} />}
      </Field>,
    )

    const input = screen.getByLabelText('NIT')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Con dígito de verificación. Escribe un NIT válido.')
    expect(screen.getByText('Escribe un NIT válido.')).toBeInTheDocument()
  })

  it('has no aria-invalid and no error text without an error', () => {
    render(<Field label="Ciudad">{(control) => <Input {...control} />}</Field>)

    expect(screen.getByLabelText('Ciudad')).not.toHaveAttribute('aria-invalid')
  })

  it('gives distinct ids to two fields on the same page', () => {
    render(
      <>
        <Field label="Uno" help="Ayuda uno">
          {(control) => <Input {...control} />}
        </Field>
        <Field label="Dos" help="Ayuda dos">
          {(control) => <Input {...control} />}
        </Field>
      </>,
    )

    expect(screen.getByLabelText('Uno').id).not.toBe(screen.getByLabelText('Dos').id)
    expect(screen.getByLabelText('Uno')).toHaveAccessibleDescription('Ayuda uno')
    expect(screen.getByLabelText('Dos')).toHaveAccessibleDescription('Ayuda dos')
  })

  it('lets the Input be disabled', () => {
    render(
      <Field label="Entidad">
        {(control) => <Input {...control} disabled />}
      </Field>,
    )

    expect(screen.getByLabelText('Entidad')).toBeDisabled()
  })
})
