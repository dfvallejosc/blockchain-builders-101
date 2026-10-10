import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Steps } from '@/components/ui/steps'

const STEPS = ['Elegir trabajador', 'Datos del certificado', 'Resumen', 'Certificado emitido']

describe('Steps', () => {
  it('lists every step in order', () => {
    render(<Steps steps={STEPS} current={1} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveTextContent('Elegir trabajador')
    expect(items[3]).toHaveTextContent('Certificado emitido')
  })

  it('marks only the current step', () => {
    render(<Steps steps={STEPS} current={1} />)

    const items = screen.getAllByRole('listitem')
    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(items[0]).not.toHaveAttribute('aria-current')
    expect(items[2]).not.toHaveAttribute('aria-current')
  })

  it('says in words which steps are done, current and pending (not only color)', () => {
    render(<Steps steps={STEPS} current={1} />)

    expect(screen.getByText('Paso 1 de 4, completado')).toBeInTheDocument()
    expect(screen.getByText('Paso 2 de 4, actual')).toBeInTheDocument()
    expect(screen.getByText('Paso 3 de 4, pendiente')).toBeInTheDocument()
  })

  it('is a named list', () => {
    render(<Steps steps={STEPS} current={0} />)

    expect(screen.getByRole('list', { name: 'Pasos' })).toBeInTheDocument()
  })
})
