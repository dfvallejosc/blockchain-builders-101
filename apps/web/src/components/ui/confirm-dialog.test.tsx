import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const Harness = ({ onConfirm = () => undefined, confirmText = 'ANULAR' }: { onConfirm?: () => void; confirmText?: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <ConfirmDialog
        open={open}
        tone="destructive"
        title="Anular certificado"
        confirmLabel="Anular certificado"
        confirmText={confirmText}
        onConfirm={() => {
          onConfirm()
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
      >
        Vas a anular el certificado HAB-2026-003981. No se puede deshacer.
      </ConfirmDialog>
    </>
  )
}

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))
const confirmButton = () => screen.getByRole('button', { name: 'Anular certificado' })
const type = (text: string) => fireEvent.change(screen.getByLabelText(/Escribe/), { target: { value: text } })

describe('ConfirmDialog', () => {
  it('is closed until opened and then shows the title and the body', () => {
    render(<Harness />)
    expect(screen.queryByText(/Vas a anular/)).not.toBeVisible()

    open()

    expect(screen.getByRole('dialog', { name: 'Anular certificado' })).toBeInTheDocument()
    expect(screen.getByText(/Vas a anular el certificado HAB-2026-003981/)).toBeInTheDocument()
  })

  it('keeps the confirm button disabled until the typed text matches', () => {
    render(<Harness />)
    open()

    expect(confirmButton()).toBeDisabled()
    type('ANULA')
    expect(confirmButton()).toBeDisabled()
    type('ANULAR')
    expect(confirmButton()).toBeEnabled()
  })

  it('ignores case and surrounding spaces when matching', () => {
    render(<Harness />)
    open()

    type('  anular ')

    expect(confirmButton()).toBeEnabled()
  })

  it('accepts a configurable text such as the entity name', () => {
    render(<Harness confirmText="Centro de Entrenamiento Cumbre Firme" />)
    open()

    type('centro de entrenamiento cumbre firme')

    expect(confirmButton()).toBeEnabled()
  })

  it('calls onConfirm only after the text matches', () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    open()

    fireEvent.click(confirmButton())
    expect(onConfirm).not.toHaveBeenCalled()

    type('ANULAR')
    fireEvent.click(confirmButton())
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancels with the Cancelar button', () => {
    render(<Harness />)
    open()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clears the typed text when it is opened again', () => {
    render(<Harness />)
    open()
    type('ANULAR')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    open()

    expect(screen.getByLabelText(/Escribe/)).toHaveValue('')
    expect(confirmButton()).toBeDisabled()
  })

  it('does not close when the backdrop is clicked while it asks for typed text', () => {
    render(<Harness />)
    open()

    fireEvent.click(screen.getByRole('dialog', { name: 'Anular certificado' }))

    expect(screen.getByRole('dialog', { name: 'Anular certificado' })).toBeInTheDocument()
  })

  it('closes on Escape (native cancel event)', () => {
    render(<Harness />)
    open()

    fireEvent(screen.getByRole('dialog', { name: 'Anular certificado' }), new Event('cancel', { cancelable: true }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('blocks the confirm button while loading', () => {
    render(
      <ConfirmDialog
        open
        tone="destructive"
        title="Revocar emisor"
        confirmLabel="Revocar emisor"
        confirmText="Cumbre Firme"
        loading
        onConfirm={() => undefined}
        onCancel={() => undefined}
      >
        Cuerpo
      </ConfirmDialog>,
    )

    expect(screen.getByRole('button', { name: 'Procesando…' })).toHaveAttribute('aria-busy', 'true')
  })

  it('needs no typed text when confirmText is not given', () => {
    render(
      <ConfirmDialog open title="Salir" confirmLabel="Salir" onConfirm={() => undefined} onCancel={() => undefined}>
        ¿Seguro?
      </ConfirmDialog>,
    )

    expect(screen.queryByLabelText(/Escribe/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir' })).toBeEnabled()
  })
})
