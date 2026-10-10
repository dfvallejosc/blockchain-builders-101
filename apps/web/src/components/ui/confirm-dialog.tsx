import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Ban, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  tone?: 'default' | 'destructive'
  confirmLabel: string
  cancelLabel?: string
  confirmText?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
  children: ReactNode
}

const matches = (typed: string, expected: string): boolean => typed.trim().toLowerCase() === expected.trim().toLowerCase()

export const ConfirmDialog = ({
  open,
  title,
  tone = 'default',
  confirmLabel,
  cancelLabel = 'Cancelar',
  confirmText,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [typed, setTyped] = useState('')
  const destructive = tone === 'destructive'
  const Icon = destructive ? Ban : Info
  const canConfirm = !loading && (confirmText === undefined || matches(typed, confirmText))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setTyped('')
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault()
    onCancel()
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget || confirmText !== undefined) return
    onCancel()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="m-auto w-[min(440px,100%)] max-w-[calc(100vw-32px)] rounded-lg border border-ha-border bg-ha-surface p-0 text-ha-text shadow-(--shadow-overlay) backdrop:bg-ha-scrim"
    >
      <div className="flex items-start gap-3 px-5 pt-5">
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-md',
            destructive ? 'bg-ha-danger-bg text-ha-danger' : 'bg-ha-primary-soft text-ha-primary',
          )}
        >
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <h3 id="confirm-dialog-title" className="flex-1 pt-2 text-xl font-bold">
          {title}
        </h3>
      </div>
      <div className="grid gap-4 px-5 pt-4 pb-5">
        <div>{children}</div>
        {confirmText !== undefined && (
          <Field label={`Escribe ${confirmText} para confirmar`}>
            {(control) => <Input {...control} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />}
          </Field>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-ha-border px-5 py-4">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          loading={loading}
          loadingText="Procesando…"
          disabled={!canConfirm && !loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
