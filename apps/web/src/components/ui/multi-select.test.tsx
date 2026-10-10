import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Field } from '@/components/ui/field'
import { MultiSelect } from '@/components/ui/multi-select'

const OPTIONS = [
  { value: 'height-work', label: 'Trabajo en alturas' },
  { value: 'confined-spaces', label: 'Espacios confinados' },
  { value: 'crane-operation', label: 'Operación de grúa' },
]

const summary = (count: number) => (count === 1 ? '1 tipo seleccionado' : `${count} tipos seleccionados`)

const Harness = ({ initial = [], onChange }: { initial?: string[]; onChange?: (value: string[]) => void }) => {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <>
      <MultiSelect
        id="types"
        options={OPTIONS}
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange?.(next)
        }}
        placeholder="Elegir certificados"
        summary={summary}
      />
      <button type="button">Fuera</button>
    </>
  )
}

describe('MultiSelect', () => {
  it('shows the placeholder when nothing is selected and the list is closed', () => {
    render(<Harness />)

    expect(screen.getByRole('button', { name: 'Elegir certificados' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('opens the list of checkboxes', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Elegir certificados' }))

    expect(screen.getByRole('button', { name: 'Elegir certificados' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('selects options and summarizes the count', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Elegir certificados' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Trabajo en alturas' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Operación de grúa' }))

    expect(onChange).toHaveBeenLastCalledWith(['height-work', 'crane-operation'])
    expect(screen.getByRole('button', { name: '2 tipos seleccionados' })).toBeInTheDocument()
  })

  it('unselects an option', () => {
    render(<Harness initial={['height-work', 'confined-spaces']} />)

    fireEvent.click(screen.getByRole('button', { name: '2 tipos seleccionados' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Trabajo en alturas' }))

    expect(screen.getByRole('button', { name: '1 tipo seleccionado' })).toBeInTheDocument()
  })

  it('closes with Escape and returns the focus to its button', () => {
    render(<Harness />)
    const button = screen.getByRole('button', { name: 'Elegir certificados' })
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Trabajo en alturas' }))

    fireEvent.keyDown(screen.getByRole('checkbox', { name: 'Trabajo en alturas' }), { key: 'Escape' })

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 tipo seleccionado' })).toHaveFocus()
  })

  it('closes when clicking outside', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Elegir certificados' }))

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Fuera' }))

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('works inside a Field with label and error', () => {
    render(
      <Field label="Certificados que emite" required error="Elige al menos uno.">
        {(control) => (
          <MultiSelect
            {...control}
            options={OPTIONS}
            value={[]}
            onChange={() => undefined}
            placeholder="Elegir certificados"
            summary={summary}
          />
        )}
      </Field>,
    )

    const button = screen.getByRole('button', { name: 'Certificados que emite(obligatorio)' })
    expect(button).toHaveAttribute('aria-invalid', 'true')
    expect(button).toHaveAccessibleDescription('Elige al menos uno. Elegir certificados')
  })

  it('describes the button with the summary outside a Field', () => {
    render(<Harness initial={['height-work', 'confined-spaces']} />)

    expect(screen.getByRole('button', { name: '2 tipos seleccionados' })).toHaveAccessibleDescription('2 tipos seleccionados')
  })

  it('includes the summary and the help text in the description inside a Field', () => {
    render(
      <Field label="Certificados que emite" help="Elige los que aplican.">
        {(control) => (
          <MultiSelect
            {...control}
            options={OPTIONS}
            value={['height-work']}
            onChange={() => undefined}
            placeholder="Elegir certificados"
            summary={summary}
          />
        )}
      </Field>,
    )

    expect(screen.getByRole('button', { name: 'Certificados que emite' })).toHaveAccessibleDescription(
      'Elige los que aplican. 1 tipo seleccionado',
    )
  })
})
