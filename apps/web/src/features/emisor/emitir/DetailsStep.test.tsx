import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import type { IssuerProfile } from '@/api/me'
import type { Certificate, Worker } from '@/data'
import { DetailsStep } from '@/features/emisor/emitir/DetailsStep'

const PROFILE: IssuerProfile = {
  id: 'e',
  name: 'Centro',
  certificateTypes: ['height-work', 'confined-spaces'],
  nit: '901.456.223-8',
  city: 'Bogotá',
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
    <MemoryRouter>
      <DetailsStep
        worker={WORKER}
        profile={PROFILE}
        certificates={[]}
        initialValues={EMPTY}
        onChangeWorker={onChangeWorker}
        onSubmit={onSubmit}
        {...props}
      />
    </MemoryRouter>,
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

  it('shows the chosen worker and only the types of the profile', () => {
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

    await waitFor(() => expect(screen.getByLabelText(/Tipo de certificado/)).toHaveFocus())
  })

  it('shows an inline error when leaving an invalid field', async () => {
    renderStep()

    const type = screen.getByLabelText(/Tipo de certificado/)
    fireEvent.focus(type)
    fireEvent.blur(type)

    expect(await screen.findByText('Elige el tipo de certificado.')).toBeInTheDocument()
  })

  const certificate = (overrides: Partial<Certificate>): Certificate => ({
    number: 1,
    id: '3f2b7c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c',
    entityId: 'e',
    workerId: 'w-carlos',
    type: 'height-work',
    issuedAt: '2026-01-01',
    validUntil: '2027-10-05',
    annulledAt: null,
    ...overrides,
  })

  it('blocks Revisar resumen when the worker already has that certificate valid', async () => {
    const { onSubmit } = renderStep({ certificates: [certificate({})] })

    fill('height-work', '2027-10-09')

    const alert = await screen.findByRole('status')
    expect(alert).toHaveTextContent(
      'Carlos Andrés Ramírez Pineda ya tiene este certificado habilitado hasta el 5 de octubre de 2027. Podrás emitir otro cuando venza, o si lo anulas.',
    )
    expect(within(alert).getByRole('link', { name: 'Ver certificados' })).toHaveAttribute('href', '/emisor/certificados')
    const button = screen.getByRole('button', { name: 'Revisar resumen' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(/ya tiene este certificado habilitado/)
    fireEvent.click(button)
    fireEvent.submit(button.closest('form') as HTMLFormElement)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still blocks on the last day of validity', async () => {
    renderStep({ certificates: [certificate({ validUntil: '2026-10-09' })] })

    fireEvent.change(screen.getByLabelText(/Tipo de certificado/), { target: { value: 'height-work' } })

    expect(await screen.findByText(/hasta el 9 de octubre de 2026/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisar resumen' })).toBeDisabled()
  })

  it.each([
    ['expired', certificate({ validUntil: '2026-10-08' })],
    ['annulled', certificate({ annulledAt: '2026-05-01' })],
    ['of another type', certificate({ type: 'confined-spaces' })],
    ['of another worker', certificate({ workerId: 'w-other' })],
  ])('does not block for a certificate that is %s', async (_label, other) => {
    const { onSubmit } = renderStep({ certificates: [other] })

    fill('height-work', '2027-10-09')

    expect(screen.queryByText(/ya tiene este certificado habilitado/)).not.toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Revisar resumen' })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })

  it('unblocks when the type changes to one the worker does not have', async () => {
    renderStep({ certificates: [certificate({})] })
    fireEvent.change(screen.getByLabelText(/Tipo de certificado/), { target: { value: 'height-work' } })
    expect(await screen.findByRole('button', { name: 'Revisar resumen' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Tipo de certificado/), { target: { value: 'confined-spaces' } })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Revisar resumen' })).toBeEnabled())
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
