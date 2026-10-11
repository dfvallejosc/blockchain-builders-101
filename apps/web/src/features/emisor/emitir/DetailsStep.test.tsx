import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Certificate, Entity, Worker } from '@/data'
import { DetailsStep } from '@/features/emisor/emitir/DetailsStep'

const ENTITY: Entity = {
  id: 'e',
  name: 'Centro',
  type: 'training-center',
  city: 'Bogotá',
  registeredAt: '2025-01-01',
  revokedAt: null,
  certificateTypes: ['height-work', 'confined-spaces'],
  nit: '',
  contactName: '',
  email: '',
  phone: '',
  ministryRegistration: '',
  issuedThisMonth: 0,
}
const WORKER: Worker = {
  id: 'w-carlos',
  entityId: 'e',
  fullName: 'Carlos Andrés Ramírez Pineda',
  documentType: 'cc',
  documentNumber: '1020345678',
  registeredAt: '2025-01-01',
  consentedAt: '2025-01-01',
}
const EMPTY = { type: '', issuedAt: '2026-10-09', validUntil: '' } as const

const renderStep = (props: Partial<ComponentProps<typeof DetailsStep>> = {}) => {
  const onSubmit = vi.fn()
  const onChangeWorker = vi.fn()
  render(
    <DetailsStep
      worker={WORKER}
      entity={ENTITY}
      certificates={[]}
      initialValues={EMPTY}
      onChangeWorker={onChangeWorker}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, onChangeWorker }
}

const fill = (type: string, validUntil: string) => {
  fireEvent.change(screen.getByLabelText(/Tipo de certificado/), { target: { value: type } })
  fireEvent.change(screen.getByLabelText(/Vigente hasta/), { target: { value: validUntil } })
}

describe('DetailsStep', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 9, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the chosen worker and only the types the entity can issue', () => {
    renderStep()

    expect(screen.getByRole('heading', { name: 'Datos del certificado' })).toBeInTheDocument()
    expect(screen.getByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
    const options = within(screen.getByLabelText(/Tipo de certificado/)).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Elige un tipo',
      'Trabajo en alturas',
      'Espacios confinados',
    ])
  })

  it('starts with today as issue date and an empty validity', () => {
    renderStep()

    expect(screen.getByLabelText(/Fecha de emisión/)).toHaveValue('2026-10-09')
    expect(screen.getByLabelText(/Vigente hasta/)).toHaveValue('')
    expect(screen.getByText('Por defecto es hoy, 9 de octubre de 2026.')).toBeInTheDocument()
  })

  it('submits valid details', async () => {
    const { onSubmit } = renderStep()

    fill('height-work', '2027-10-09')
    fireEvent.click(screen.getByRole('button', { name: 'Revisar resumen' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ type: 'height-work', issuedAt: '2026-10-09', validUntil: '2027-10-09' }),
    )
  })

  it('shows an error summary with every problem and marks the fields invalid', async () => {
    const { onSubmit } = renderStep({ initialValues: { type: '', issuedAt: '2026-10-20', validUntil: '2026-10-01' } })

    fireEvent.click(screen.getByRole('button', { name: 'Revisar resumen' }))

    const summary = await screen.findByRole('alert')
    expect(within(summary).getByText('Revisa 3 campos antes de continuar')).toBeInTheDocument()
    expect(within(summary).getAllByRole('button')).toHaveLength(3)
    expect(within(summary).getAllByRole('button').every((button) => button.className.includes('min-h-(--touch-min)'))).toBe(true)
    expect(summary.parentElement).toHaveFocus()
    expect(screen.getByLabelText(/Tipo de certificado/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Fecha de emisión/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Vigente hasta/)).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('moves the focus to a field from the summary', async () => {
    renderStep()

    fireEvent.click(screen.getByRole('button', { name: 'Revisar resumen' }))
    const summary = await screen.findByRole('alert')
    await waitFor(() => expect(summary.parentElement).toHaveFocus())
    fireEvent.click(within(summary).getByRole('button', { name: 'Tipo de certificado' }))

    expect(screen.getByLabelText(/Tipo de certificado/)).toHaveFocus()
  })

  it('shows an inline error when leaving an invalid field', async () => {
    renderStep()

    const type = screen.getByLabelText(/Tipo de certificado/)
    fireEvent.focus(type)
    fireEvent.blur(type)

    expect(await screen.findByText('Elige el tipo de certificado.')).toBeInTheDocument()
  })

  it('warns, without blocking, when the worker already has that certificate valid', async () => {
    const duplicate: Certificate = {
      number: 1,
      id: 'HAB-2026-000001',
      entityId: 'e',
      workerId: 'w-carlos',
      type: 'height-work',
      issuedAt: '2026-01-01',
      validUntil: '2027-10-05',
      annulledAt: null,
    }
    const { onSubmit } = renderStep({ certificates: [duplicate] })

    fireEvent.change(screen.getByLabelText(/Tipo de certificado/), { target: { value: 'height-work' } })

    const warning = await screen.findByText('Carlos Andrés Ramírez Pineda ya tiene este certificado habilitado')
    expect(warning).toBeInTheDocument()
    expect(
      screen.getByText(
        'Su certificado de Trabajo en alturas está vigente hasta el 5 de octubre de 2027. Si emites otro, los dos seguirán habilitados.',
      ),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Vigente hasta/), { target: { value: '2027-10-09' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar resumen' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })

  it('does not warn for another type or for an expired certificate', () => {
    const expired: Certificate = {
      number: 1,
      id: 'HAB-2025-000001',
      entityId: 'e',
      workerId: 'w-carlos',
      type: 'height-work',
      issuedAt: '2025-01-01',
      validUntil: '2026-01-01',
      annulledAt: null,
    }
    renderStep({ certificates: [expired] })

    fireEvent.change(screen.getByLabelText(/Tipo de certificado/), { target: { value: 'height-work' } })

    expect(screen.queryByText(/ya tiene este certificado habilitado/)).not.toBeInTheDocument()
  })

  it('keeps what was typed when changing the worker', () => {
    const { onChangeWorker } = renderStep()

    fill('confined-spaces', '2027-01-01')
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar trabajador' }))

    expect(onChangeWorker).toHaveBeenCalledWith({ type: 'confined-spaces', issuedAt: '2026-10-09', validUntil: '2027-01-01' })
  })

  it('goes back to the worker step with Volver', () => {
    const { onChangeWorker } = renderStep()

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onChangeWorker).toHaveBeenCalledTimes(1)
  })
})
