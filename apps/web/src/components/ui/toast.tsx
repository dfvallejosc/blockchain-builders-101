import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import type { AlertTone } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ToastContext, type ToastInput } from '@/components/ui/toast-context'
import { cn } from '@/lib/utils'

const AUTO_CLOSE_MS = 6000

const ICONS: Record<AlertTone, { Icon: LucideIcon; color: string }> = {
  success: { Icon: CircleCheck, color: 'text-ha-success' },
  warning: { Icon: TriangleAlert, color: 'text-ha-warning' },
  danger: { Icon: CircleX, color: 'text-ha-danger' },
  info: { Icon: Info, color: 'text-ha-primary' },
}

interface ToastEntry extends ToastInput {
  id: number
}

interface ToastItemProps {
  toast: ToastEntry
  onClose: (id: number) => void
}

const ToastItem = ({ toast, onClose }: ToastItemProps) => {
  const [paused, setPaused] = useState(false)
  const { Icon, color } = ICONS[toast.tone]
  const closesByItself = toast.tone !== 'danger'

  useEffect(() => {
    if (!closesByItself || paused) return
    const timer = setTimeout(() => onClose(toast.id), AUTO_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [closesByItself, paused, onClose, toast.id])

  return (
    <div
      data-toast
      role={toast.tone === 'danger' ? 'alert' : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-[min(380px,100%)] items-start gap-3 rounded-md border border-ha-border bg-ha-surface py-3 pr-3 pl-4 text-sm text-ha-text shadow-(--shadow-overlay)"
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', color)} />
      <div className="min-w-0 flex-1">
        <b className="block text-base">{toast.title}</b>
        {toast.message}
      </div>
      <Button iconOnly variant="ghost" aria-label="Cerrar aviso" onClick={() => onClose(toast.id)} className="-my-0.5">
        <X aria-hidden="true" className="size-5" />
      </Button>
    </div>
  )
}

interface ToastProviderProps {
  children: ReactNode
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(1)

  const show = useCallback((toast: ToastInput) => {
    const id = nextId.current++
    setToasts((current) => [...current, { ...toast, id }])
  }, [])

  const close = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-(--z-toast) grid justify-items-end gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={close} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
