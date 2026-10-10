import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepsProps {
  steps: string[]
  current: number
}

export const Steps = ({ steps, current }: StepsProps) => (
  <ol aria-label="Pasos" className="flex flex-wrap gap-x-6 gap-y-3">
    {steps.map((label, index) => {
      const state = index < current ? 'completado' : index === current ? 'actual' : 'pendiente'
      return (
        <li key={label} aria-current={index === current ? 'step' : undefined} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'grid size-7 place-items-center rounded-full border-2 text-sm font-bold',
              index < current && 'border-ha-primary bg-ha-primary text-ha-on-primary',
              index === current && 'border-ha-primary bg-ha-primary-soft text-ha-primary',
              index > current && 'border-ha-border-strong bg-ha-surface text-ha-text-muted',
            )}
          >
            {index < current ? <Check className="size-4 stroke-[3]" /> : index + 1}
          </span>
          <span className={cn('text-sm', index === current ? 'font-bold' : 'font-medium text-ha-text-muted')}>{label}</span>
          <span className="sr-only">{`Paso ${index + 1} de ${steps.length}, ${state}`}</span>
        </li>
      )
    })}
  </ol>
)
