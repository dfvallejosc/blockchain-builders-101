import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterChipProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: ReactNode
}

export const FilterChip = ({ pressed, onPressedChange, children }: FilterChipProps) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={() => onPressedChange(!pressed)}
    className={cn(
      'inline-flex min-h-(--control-sm) cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm transition-colors duration-(--duration-fast) ease-(--ease-standard) pointer-coarse:min-h-(--touch-min)',
      pressed
        ? 'border-ha-primary bg-ha-primary-soft font-semibold text-ha-text hover:bg-ha-primary-soft-active'
        : 'border-ha-border-strong bg-ha-surface font-medium text-ha-text hover:bg-ha-surface-2 active:bg-ha-border',
    )}
  >
    {pressed && <Check aria-hidden="true" className="size-4 text-ha-primary" />}
    {children}
  </button>
)
