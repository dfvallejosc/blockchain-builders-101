import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <span aria-hidden="true" className={cn('block h-3.5 animate-pulse rounded-sm bg-ha-surface-2 motion-reduce:animate-none', className)} />
)
