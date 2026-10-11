import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchField } from '@/components/ui/search-field'

const renderField = (props: Partial<React.ComponentProps<typeof SearchField>> = {}) =>
  render(<SearchField label="Buscar certificados" value="" onChange={() => undefined} {...props} />)

describe('SearchField', () => {
  it('is a search box named by its label', () => {
    renderField({ placeholder: 'Buscar por trabajador' })

    const box = screen.getByRole('searchbox', { name: 'Buscar certificados' })
    expect(box).toHaveAttribute('placeholder', 'Buscar por trabajador')
  })

  it('reports what the person types', () => {
    const onChange = vi.fn()
    renderField({ onChange })

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ramirez' } })

    expect(onChange).toHaveBeenCalledWith('ramirez')
  })

  it('has no clear button while empty', () => {
    renderField()

    expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).not.toBeInTheDocument()
  })

  it('clears the text and puts the focus back on the field', () => {
    const onChange = vi.fn()
    renderField({ value: 'ramirez', onChange })

    fireEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }))

    expect(onChange).toHaveBeenCalledWith('')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })
})
