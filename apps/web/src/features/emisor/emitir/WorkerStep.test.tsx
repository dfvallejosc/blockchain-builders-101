import type { ComponentProps } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Certificate, Worker } from '@/data'
import { WorkerStep } from '@/features/emisor/emitir/WorkerStep'

const worker = (id: string, fullName: string, documentNumber: string): Worker => ({
  id,
  entityId: 'e',
  fullName,
  documentType: 'cc',
  documentNumber,
  registeredAt: '2025-01-01',
  consentedAt: '2025-01-01',
})

const WORKERS = [
  worker('w-carlos', 'Carlos Andrés Ramírez Pineda', '1020345678'),
  worker('w-paola', 'Paola Andrea Niño Vargas', '52418903'),
]

const certificate = (number: number, workerId: string): Certificate => ({
  number,
  id: `HAB-2026-00000${number}`,
  entityId: 'e',
  workerId,
  type: 'height-work',
  issuedAt: '2026-01-01',
  validUntil: '2027-01-01',
  annulledAt: null,
})

const CERTIFICATES = [certificate(1, 'w-carlos'), certificate(2, 'w-carlos'), certificate(3, 'w-paola')]

const renderStep = (props: Partial<ComponentProps<typeof WorkerStep>> = {}) => {
  const onSelect = vi.fn()
  const onContinue = vi.fn()
  render(
    <MemoryRouter>
      <WorkerStep
        workers={WORKERS}
        certificates={CERTIFICATES}
        selectedId={null}
        onSelect={onSelect}
        onContinue={onContinue}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onSelect, onContinue }
}

describe('WorkerStep', () => {
  it('lists the workers with their document and how many certificates each has', () => {
    renderStep()

    expect(screen.getByRole('heading', { name: 'Elige al trabajador' })).toBeInTheDocument()
    expect(screen.getByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
    expect(screen.getByText('C.C. 1.020.345.678')).toBeInTheDocument()
    const carlosRow = screen.getByText('Carlos Andrés Ramírez Pineda').closest('tr')
    expect(carlosRow).toHaveTextContent('2')
    expect(screen.getByText('Mostrando 2 de 2 trabajadores')).toBeInTheDocument()
  })

  it('selects a worker through its radio', () => {
    const { onSelect } = renderStep()

    fireEvent.click(screen.getByRole('radio', { name: 'Elegir a Paola Andrea Niño Vargas' }))

    expect(onSelect).toHaveBeenCalledWith('w-paola')
  })

  it('disables Continuar until a worker is selected', () => {
    renderStep({ selectedId: null })

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(screen.getByText('Elige a un trabajador para continuar.')).toBeInTheDocument()
  })

  it('continues once a worker is selected', () => {
    const { onContinue } = renderStep({ selectedId: 'w-paola' })

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it.each([['ramirez'], ['RAMÍREZ'], ['1020345678'], ['1.020.345.678']])(
    'finds a worker searching for %s',
    (query) => {
      renderStep()

      fireEvent.change(screen.getByLabelText('Buscar por nombre o documento'), { target: { value: query } })

      expect(screen.getByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
      expect(screen.queryByText('Paola Andrea Niño Vargas')).not.toBeInTheDocument()
      expect(screen.getByText('Mostrando 1 de 2 trabajadores')).toBeInTheDocument()
    },
  )

  it('keeps saying who is chosen when the search hides that worker', () => {
    renderStep({ selectedId: 'w-carlos' })

    fireEvent.change(screen.getByLabelText('Buscar por nombre o documento'), { target: { value: 'paola' } })

    expect(screen.queryByText('Carlos Andrés Ramírez Pineda')).not.toBeInTheDocument()
    expect(screen.getByText('Elegiste a Carlos Andrés Ramírez Pineda.')).toBeInTheDocument()
  })

  it('shows an empty result with a way to clear the search', () => {
    renderStep()

    fireEvent.change(screen.getByLabelText('Buscar por nombre o documento'), { target: { value: 'zzz' } })
    expect(screen.getByText('No encontramos trabajadores')).toBeInTheDocument()

    fireEvent.click(within(screen.getByRole('region', { name: 'Lista de trabajadores' })).getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(screen.getByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
  })

  it('links to register a new worker coming back to this screen', () => {
    renderStep()

    expect(screen.getByRole('link', { name: /Registrar trabajador nuevo/ })).toHaveAttribute(
      'href',
      '/emisor/trabajadores/nuevo?volver=emitir',
    )
  })

  it('shows an empty state when the entity has no workers yet', () => {
    renderStep({ workers: [], certificates: [] })

    expect(screen.getByRole('heading', { name: 'Aún no hay trabajadores' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Registrar trabajador/ })).toHaveAttribute(
      'href',
      '/emisor/trabajadores/nuevo?volver=emitir',
    )
  })
})
