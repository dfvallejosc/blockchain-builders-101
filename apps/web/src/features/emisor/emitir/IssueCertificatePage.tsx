import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Steps } from '@/components/ui/steps'
import type { IssuerSession, Session } from '@/data'
import { DetailsStep } from '@/features/emisor/emitir/DetailsStep'
import { IssuedStep } from '@/features/emisor/emitir/IssuedStep'
import { ReviewStep } from '@/features/emisor/emitir/ReviewStep'
import { useIssueFlow, type IssueStep } from '@/features/emisor/emitir/useIssueFlow'
import { WorkerStep } from '@/features/emisor/emitir/WorkerStep'

const STEP_LABELS = ['Trabajador', 'Datos del certificado', 'Revisión', 'Emitido']
const STEP_ORDER: IssueStep[] = ['worker', 'details', 'review', 'issued']
const BLOCKED_REASON = 'No disponible: tu entidad está revocada.'

const IssueFlow = ({ session }: { session: IssuerSession }) => {
  const [params] = useSearchParams()
  const flow = useIssueFlow(session, params.get('trabajador'))
  const [registeredDismissed, setRegisteredDismissed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousStep = useRef(flow.step)

  useEffect(() => {
    if (previousStep.current === flow.step) return
    previousStep.current = flow.step
    containerRef.current?.querySelector<HTMLElement>('h2[tabindex="-1"]')?.focus()
    window.scrollTo({ top: 0 })
  }, [flow.step])

  const { load, draft } = flow

  const renderBody = () => {
    if (load.phase === 'loading') {
      return (
        <div role="status" className="grid gap-3">
          <span className="sr-only">Cargando…</span>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )
    }
    if (load.phase === 'error') {
      return (
        <EmptyState
          variant="error"
          title="No pudimos cargar tus datos"
          action={<Button variant="secondary" onClick={flow.retry}>Reintentar</Button>}
        >
          Revisa tu conexión e inténtalo de nuevo.
        </EmptyState>
      )
    }

    const { entity, workers, certificates } = load
    const worker = workers.find((candidate) => candidate.id === draft.workerId) ?? null
    const blockedReason = flow.blocked ? BLOCKED_REASON : null

    if (flow.step === 'details' && worker) {
      return (
        <div className="grid gap-5">
          {params.get('nuevo') === '1' && params.get('trabajador') === draft.workerId && !registeredDismissed && (
            <Alert tone="success" title="Trabajador registrado" onClose={() => setRegisteredDismissed(true)}>
              Ahora completa los datos del certificado.
            </Alert>
          )}
          <DetailsStep
            worker={worker}
            entity={entity}
            certificates={certificates}
            initialValues={{ type: draft.type, issuedAt: draft.issuedAt, validUntil: draft.validUntil }}
            onChangeWorker={flow.backToWorker}
            onSubmit={flow.saveDetails}
          />
        </div>
      )
    }
    if (flow.step === 'review' && worker && draft.type !== '') {
      return (
        <ReviewStep
          worker={worker}
          entity={entity}
          values={{ type: draft.type, issuedAt: draft.issuedAt, validUntil: draft.validUntil }}
          blockedReason={blockedReason}
          issuing={flow.issuing}
          failed={flow.failed}
          onBack={flow.backToDetails}
          onConfirm={flow.issue}
        />
      )
    }
    if (flow.step === 'issued' && flow.issued) {
      const issuedWorker = workers.find((candidate) => candidate.id === flow.issued?.workerId)
      if (issuedWorker) return <IssuedStep certificate={flow.issued} worker={issuedWorker} onIssueAnother={flow.issueAnother} />
    }
    return (
      <WorkerStep
        workers={workers}
        certificates={certificates}
        selectedId={draft.workerId}
        blockedReason={blockedReason}
        onSelect={flow.selectWorker}
        onContinue={flow.continueToDetails}
      />
    )
  }

  return (
    <section ref={containerRef} className="mx-auto grid w-full max-w-240 content-start gap-6 p-4 pb-16 sm:p-6 sm:pb-16 lg:p-8 lg:pb-16">
      <div>
        <h1 className="text-3xl font-bold">Emitir certificado</h1>
        <p className="mt-1 text-ha-text-muted">Elige al trabajador, completa los datos del certificado y confirma.</p>
      </div>
      <Steps steps={STEP_LABELS} current={STEP_ORDER.indexOf(flow.step)} />
      {flow.blocked && (
        <Alert tone="danger" title="Tu entidad está revocada">
          Por eso no puedes emitir certificados nuevos.
        </Alert>
      )}
      {renderBody()}
    </section>
  )
}

export const IssueCertificatePage = () => {
  const session = useOutletContext<Session>()
  return session.role === 'issuer' ? <IssueFlow session={session} /> : null
}
