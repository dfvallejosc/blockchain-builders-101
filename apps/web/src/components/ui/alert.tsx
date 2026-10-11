import type { ReactNode } from 'react'
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AlertTone = 'success' | 'warning' | 'danger' | 'info'

const TONES: Record<AlertTone, { Icon: LucideIcon; box: string; icon: string }> = {
  success: { Icon: CircleCheck, box: 'border-ha-success/40 bg-ha-success-bg', icon: 'text-ha-success' },
  warning: { Icon: TriangleAlert, box: 'border-ha-warning/40 bg-ha-warning-bg', icon: 'text-ha-warning' },
  danger: { Icon: CircleX, box: 'border-ha-danger/40 bg-ha-danger-bg', icon: 'text-ha-danger' },
  info: { Icon: Info, box: 'border-ha-primary/35 bg-ha-primary-soft', icon: 'text-ha-primary' },
}

interface AlertProps {
  tone: AlertTone
  title: string
  children?: ReactNode
  action?: ReactNode
  onClose?: () => void
}

export const Alert = ({ tone, title, children, action, onClose }: AlertProps) => {
  const { Icon, box, icon } = TONES[tone]

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-md border px-4 py-3 text-sm text-ha-text', box)}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', icon)} />
      <div className="min-w-0 flex-1">
        <b className="block text-base">{title}</b>
        {children}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <Button iconOnly variant="ghost" aria-label="Cerrar aviso" onClick={onClose} className="-my-1.5 -mr-2">
          <X aria-hidden="true" className="size-5" />
        </Button>
      )}
    </div>
  )
}
