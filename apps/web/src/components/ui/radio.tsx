import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface RadioProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string
  hideLabel?: boolean
}

export const Radio = ({ label, hideLabel = false, className, ...props }: RadioProps) => (
  <label
    className={cn(
      'inline-flex min-h-(--touch-min) cursor-pointer items-center gap-3 text-base has-disabled:cursor-not-allowed has-disabled:text-ha-disabled-fg',
      className,
    )}
  >
    <input
      type="radio"
      className="size-5 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-ha-border-strong bg-ha-surface transition-colors duration-(--duration-fast) checked:border-ha-primary checked:bg-ha-primary checked:shadow-[inset_0_0_0_3px_var(--ha-surface)] enabled:hover:border-ha-text enabled:checked:hover:border-ha-primary-hover enabled:checked:hover:bg-ha-primary-hover aria-invalid:border-ha-danger disabled:cursor-not-allowed disabled:border-ha-border disabled:bg-ha-surface-2 checked:disabled:border-ha-border checked:disabled:bg-ha-border"
      {...props}
    />
    <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
  </label>
)
