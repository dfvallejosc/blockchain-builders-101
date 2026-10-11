import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepsProps {
  steps: string[]
  current: number
}

export const Steps = ({ steps, current }: StepsProps) => (
  <ol aria-label="Pasos" className="flex list-none flex-col gap-2 p-0 md:flex-row">
    {steps.map((label, index) => {
      const state = index < current ? 'completado' : index === current ? 'actual' : 'pendiente'
      return (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className={cn(
            'flex min-h-(--touch-min) flex-1 items-center gap-3 border-b-3 pb-1 text-sm font-semibold',
            index < current && 'border-ha-primary text-ha-text',
            index === current && 'border-ha-primary font-bold text-ha-text',
            index > current && 'border-ha-border text-ha-text-muted',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-sm text-sm font-bold',
              index < current && 'bg-ha-primary-soft text-ha-primary',
              index === current && 'bg-ha-primary text-ha-on-primary',
              index > current && 'bg-ha-surface-2 text-ha-text-muted',
            )}
          >
            {index < current ? <Check className="size-4 stroke-[3]" /> : index + 1}
          </span>
          <span>{label}</span>
          <span className="sr-only">{`Paso ${index + 1} de ${steps.length}, ${state}`}</span>
        </li>
      )
    })}
  </ol>
)
