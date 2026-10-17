import { Skeleton } from '@/components/ui/skeleton'

export const GateSkeleton = () => (
  <div role="status" aria-label="Cargando tu panel" className="mx-auto grid w-full max-w-3xl gap-4 p-4 sm:p-6">
    <Skeleton className="h-9 w-2/3" />
    <Skeleton className="w-1/2" />
    <Skeleton className="h-48 w-full" />
  </div>
)
