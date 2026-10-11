import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { RotateCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CertificateDetails } from '@/features/verificar/CertificateDetails'
import { VerdictBanner } from '@/features/verificar/VerdictBanner'
import { useVerification, type VerificationState } from '@/features/verificar/useVerification'

type ForcedState = 'cargando' | 'error'

const FORCED_STATES: Record<ForcedState, VerificationState> = {
  cargando: { phase: 'loading' },
  error: { phase: 'error' },
}

const readForcedState = (value: string | null): ForcedState | null => {
  if (!import.meta.env.DEV) return null
  return value === 'cargando' || value === 'error' ? value : null
}

interface PageFrameProps {
  state: VerificationState
  queriedAt: Date
  onRetry?: () => void
}

const PageFrame = ({ state, queriedAt, onRetry }: PageFrameProps) => (
  <article className="mx-auto grid w-full max-w-120 content-start overflow-hidden bg-ha-bg pb-6 sm:my-6 sm:rounded-lg sm:border sm:border-ha-border">
    <div className="flex items-center gap-2 border-b border-ha-border bg-ha-surface px-4 py-3 font-bold text-ha-text">
      <ShieldCheck aria-hidden="true" className="size-6 text-ha-primary" />
      HabilitApp
    </div>
    <VerdictBanner state={state} />
    {state.phase === 'error' && onRetry && (
      <div className="px-4 pt-3">
        <Button size="lg" className="w-full" onClick={onRetry}>
          <RotateCw aria-hidden="true" className="size-5" />
          Reintentar
        </Button>
      </div>
    )}
    <CertificateDetails state={state} queriedAt={queriedAt} />
    {state.phase !== 'loading' && (
      <footer className="mt-4 flex items-center justify-center gap-2 border-t border-ha-border bg-ha-surface-2 p-4 text-sm text-ha-text-muted">
        <ShieldCheck aria-hidden="true" className="size-5 text-ha-primary" />
        <b className="text-ha-text">Verificado por HabilitApp</b>
      </footer>
    )}
  </article>
)

interface VerificationViewProps {
  id: string
  initialForced: ForcedState | null
}

const VerificationView = ({ id, initialForced }: VerificationViewProps) => {
  const { state: queried, retry } = useVerification(id)
  const [forced, setForced] = useState(initialForced)
  const [queriedAt] = useState(() => new Date())

  const state = forced ? FORCED_STATES[forced] : queried
  const handleRetry = () => {
    setForced(null)
    retry()
  }

  return <PageFrame state={state} queriedAt={queriedAt} onRetry={handleRetry} />
}

export const VerifyPage = () => {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const forced = readForcedState(searchParams.get('estado'))

  if (forced === 'cargando') {
    return <PageFrame state={FORCED_STATES.cargando} queriedAt={new Date()} />
  }

  return <VerificationView key={id} id={id} initialForced={forced} />
}
