import type { ReactNode } from 'react'
import { Inbox, SearchX, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyVariant = 'empty' | 'no-results' | 'error'

const ICONS: Record<EmptyVariant, LucideIcon> = {
  empty: Inbox,
  'no-results': SearchX,
  error: TriangleAlert,
}

interface EmptyStateProps {
  variant: EmptyVariant
  title: string
  children?: ReactNode
  action?: ReactNode
}

export const EmptyState = ({ variant, title, children, action }: EmptyStateProps) => {
  const Icon = ICONS[variant]

  return (
    <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
      <span
        data-icon-box
        className={cn(
          'grid size-16 place-items-center rounded-lg',
          variant === 'error' ? 'bg-ha-danger-bg text-ha-danger' : 'bg-ha-surface-2 text-ha-text-muted',
        )}
      >
        <Icon aria-hidden="true" className="size-8" />
      </span>
      <h4 className="text-xl font-bold">{title}</h4>
      {children && <p className="max-w-[36ch] text-ha-text-muted">{children}</p>}
      {action}
    </div>
  )
}
