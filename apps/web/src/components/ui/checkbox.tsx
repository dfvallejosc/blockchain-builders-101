import type { ComponentProps } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string
}

export const Checkbox = ({ label, className, ...props }: CheckboxProps) => (
  <label
    className={cn(
      'inline-flex min-h-(--touch-min) cursor-pointer items-center gap-3 text-base has-disabled:cursor-not-allowed has-disabled:text-ha-disabled-fg',
      className,
    )}
  >
    <span className="relative inline-grid shrink-0">
      <input
        type="checkbox"
        className="peer size-5 cursor-pointer appearance-none rounded-sm border-2 border-ha-border-strong bg-ha-surface transition-colors duration-(--duration-fast) checked:border-ha-primary checked:bg-ha-primary enabled:hover:border-ha-text enabled:checked:hover:border-ha-primary-hover enabled:checked:hover:bg-ha-primary-hover aria-invalid:border-ha-danger disabled:cursor-not-allowed disabled:border-ha-border disabled:bg-ha-surface-2 checked:disabled:border-ha-border checked:disabled:bg-ha-border checked:aria-invalid:border-ha-danger checked:aria-invalid:bg-ha-danger"
        {...props}
      />
      <Check
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-auto size-3.5 stroke-[3.5] text-ha-on-primary opacity-0 peer-checked:opacity-100 peer-disabled:text-ha-disabled-fg"
      />
    </span>
    {label}
  </label>
)
