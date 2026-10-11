import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { fieldControlClass } from '@/components/ui/field-control'
import { cn } from '@/lib/utils'

export const Select = ({ className, children, ...props }: ComponentProps<'select'>) => (
  <span className="relative block">
    <select className={cn(fieldControlClass, 'cursor-pointer appearance-none pr-10', className)} {...props}>
      {children}
    </select>
    <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ha-text-muted" />
  </span>
)
