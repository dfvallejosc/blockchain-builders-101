import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { IssuerProfile } from '@/api/me'
import type { Worker } from '@/data'
import { ReviewStep } from '@/features/emisor/emitir/ReviewStep'

const PROFILE = { id: 'e', name: 'Centro de Entrenamiento Cumbre Firme' } as IssuerProfile
const WORKER = {
  id: 'w',
  fullName: 'Carlos Andrés Ramírez Pineda',
  documentType: 'cc',
  documentNumber: '1020345678',
} as Worker
const VALUES = { type: 'height-work', issuedAt: '2026-10-09', validUntil: '2027-10-09' } as const

const renderStep = (props: Partial<ComponentProps<typeof ReviewStep>> = {}) => {
  const onBack = vi.fn()
  const onConfirm = vi.fn()
  render(
    <ReviewStep
      worker={WORKER}
      profile={PROFILE}
      values={VALUES}
      issuing={false}
      failure={null}
      onBack={onBack}
      onConfirm={onConfirm}
      {...props}
    />,
  )
  return { onBack, onConfirm }
}

describe('ReviewStep', () => {
  it('shows every data the certificate will carry', () => {
    renderStep()

    expect(screen.getByRole('heading', { name: 'Revisa antes de emitir' })).toBeInTheDocument()
    expect(screen.getByText('Carlos Andrés Ramírez Pineda')).toBeInTheDocument()
    expect(screen.getByText('C.C. 1.020.345.678')).toBeInTheDocument()
    expect(screen.getByText('Trabajo en alturas')).toBeInTheDocument()
    expect(screen.getByText('Centro de Entrenamiento Cumbre Firme')).toBeInTheDocument()
    expect(screen.getByText('9 de octubre de 2026')).toBeInTheDocument()
    expect(screen.getByText('9 de octubre de 2027')).toBeInTheDocument()
    expect(screen.getByText('Al confirmar, el certificado queda registrado')).toBeInTheDocument()
  })

  it('confirms and goes back', () => {
    const { onBack, onConfirm } = renderStep()

    fireEvent.click(screen.getByRole('button', { name: 'Emitir certificado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Volver a editar' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows Emitiendo… while issuing and cannot be pressed again', () => {
    const { onConfirm, onBack } = renderStep({ issuing: true })

    const button = screen.getByRole('button', { name: 'Emitiendo…' })
    fireEvent.click(button)

    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Volver a editar' })).toBeDisabled()
    expect(onBack).not.toHaveBeenCalled()
  })

  it('shows a generic error without internal details', () => {
    renderStep({ failure: 'failed' })

    expect(screen.getByText('No pudimos emitir el certificado')).toBeInTheDocument()
    expect(screen.getByText('Revisa los datos e inténtalo de nuevo.')).toBeInTheDocument()
    expect(screen.queryByText(/ya tiene este certificado habilitado/)).not.toBeInTheDocument()
  })

  it('explains the duplicate and keeps Volver a editar available', () => {
    const { onBack } = renderStep({ failure: 'duplicate' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Carlos Andrés Ramírez Pineda ya tiene este certificado habilitado. Podrás emitir otro cuando venza, o si lo anulas.',
    )
    expect(screen.queryByText('No pudimos emitir el certificado')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a editar' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows no failure message by default', () => {
    renderStep()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
