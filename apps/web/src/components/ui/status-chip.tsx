import { Ban, CircleCheck, CircleX, Clock, Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ChipStatus = 'valid' | 'expired' | 'invalid' | 'annulled' | 'in-review' | 'revoked'

interface ChipDefinition {
  label: string
  Icon: LucideIcon
  tone: string
}

const CHIPS: Record<ChipStatus, ChipDefinition> = {
  valid: { label: 'Habilitado', Icon: CircleCheck, tone: 'bg-ha-success-bg text-ha-success' },
  expired: { label: 'Vencido', Icon: Clock, tone: 'bg-ha-warning-bg text-ha-warning' },
  invalid: { label: 'No válido', Icon: CircleX, tone: 'bg-ha-danger-bg text-ha-danger' },
  annulled: { label: 'Anulado', Icon: Ban, tone: 'bg-ha-danger-bg text-ha-danger' },
  'in-review': { label: 'En revisión', Icon: Info, tone: 'bg-ha-neutral-bg text-ha-neutral' },
  revoked: { label: 'Revocado', Icon: Ban, tone: 'bg-ha-danger-bg text-ha-danger' },
}

interface StatusChipProps {
  status: ChipStatus
  size?: 'md' | 'sm'
}

export const StatusChip = ({ status, size = 'md' }: StatusChipProps) => {
  const { label, Icon, tone } = CHIPS[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        size === 'md' ? 'h-7 pr-3 pl-2 text-sm' : 'h-6 pr-2 pl-1.5 text-xs',
        tone,
      )}
    >
      <Icon aria-hidden="true" className={size === 'md' ? 'size-4' : 'size-3.5'} />
      {label}
    </span>
  )
}
