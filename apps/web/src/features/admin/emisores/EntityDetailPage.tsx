import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Ban } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusChip } from '@/components/ui/status-chip'
import { useToast } from '@/components/ui/toast-context'
import { useEntity } from '@/features/admin/emisores/useEntity'
import { useRevokeEntity } from '@/features/admin/emisores/useRevokeEntity'
import { TYPE_LABEL } from '@/features/admin/emisores/entityRows'
import { cn } from '@/lib/utils'
import { certificateTypeLabel, formatLongDate } from '@/features/verificar/format'

const LIST_PATH = '/admin/emisores'

const BackLink = () => (
  <Link to={LIST_PATH} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-self-start')}>
    <ArrowLeft aria-hidden="true" className="size-5" />
    Volver a emisores
  </Link>
)

const Row = ({ term, children }: { term: string; children: string }) => (
  <div className="grid gap-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
    <dt className="text-sm text-ha-text-muted">{term}</dt>
    <dd>{children}</dd>
  </div>
)

const Layout = ({ children }: { children: ReactNode }) => (
  <section className="mx-auto grid w-full max-w-4xl content-start gap-6 p-4 pb-16 sm:p-6 sm:pb-16 lg:p-8 lg:pb-16">
    <BackLink />
    {children}
  </section>
)

const LoadingState = () => (
  <Layout>
    <div role="status" aria-label="Cargando emisor" className="grid gap-4">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="w-1/2" />
      <Skeleton className="h-48 w-full" />
    </div>
  </Layout>
)

const EntityDetail = ({ id }: { id: string }) => {
  const toast = useToast()
  const { load, retry, replace } = useEntity(id)
  const { revoking, revoke } = useRevokeEntity()
  const [confirming, setConfirming] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusAfterRevoke = useRef(false)
  const revokedAt = load.phase === 'ready' ? load.entity.revokedAt : null

  useEffect(() => {
    if (focusAfterRevoke.current && revokedAt !== null && !confirming) {
      focusAfterRevoke.current = false
      headingRef.current?.focus()
    }
  }, [revokedAt, confirming])

  if (load.phase === 'loading') return <LoadingState />

  if (load.phase === 'error' || load.phase === 'not-found') {
    return (
      <Layout>
        {load.phase === 'error' ? (
          <EmptyState
            variant="error"
            title="No pudimos cargar el emisor"
            action={<Button variant="secondary" onClick={retry}>Reintentar</Button>}
          >
            Revisa tu conexión e inténtalo de nuevo.
          </EmptyState>
        ) : (
          <EmptyState
            variant="no-results"
            title="No encontramos este emisor"
            action={<Link to={LIST_PATH} className={buttonVariants({ variant: 'secondary' })}>Ver emisores</Link>}
          >
            Puede que el enlace esté incompleto. Vuelve a la lista para elegirlo.
          </EmptyState>
        )}
      </Layout>
    )
  }

  const { entity } = load

  const confirmRevoke = async () => {
    const revoked = await revoke(entity.id)
    if (revoked === 'busy') return
    setConfirming(false)
    if (revoked === null) {
      toast.show({
        tone: 'danger',
        title: 'No pudimos revocar al emisor',
        message: 'No se hizo ningún cambio. Inténtalo de nuevo.',
      })
      return
    }
    focusAfterRevoke.current = true
    replace(revoked)
    toast.show({
      tone: 'success',
      title: 'Emisor revocado',
      message: `${entity.name} ya no puede emitir y sus certificados dejaron de verse como válidos.`,
    })
  }

  return (
    <Layout>
      {revokedAt !== null && (
        <Alert tone="danger" title={`Emisor revocado el ${formatLongDate(revokedAt)}`}>
          Ninguno de sus certificados se verifica como válido y la entidad no puede emitir nuevos.
        </Alert>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
            {entity.name}
          </h1>
          <StatusChip status={revokedAt === null ? 'valid' : 'revoked'} />
        </div>
        <p className="mt-1 text-ha-text-muted">
          {`${TYPE_LABEL[entity.type]} · ${entity.city} · Registrado el ${formatLongDate(entity.registeredAt)}`}
        </p>
      </div>

      <section className="grid gap-4 rounded-lg border border-ha-border bg-ha-surface p-5">
        <h2 className="text-lg font-semibold">Datos de la entidad</h2>
        <dl className="grid gap-4">
          <Row term="Tipo de entidad">{TYPE_LABEL[entity.type]}</Row>
          <Row term="Ciudad">{entity.city}</Row>
          <Row term="NIT">{entity.nit}</Row>
          <Row term="Persona de contacto">{entity.contactName}</Row>
          <Row term="Correo (usuario de acceso)">{entity.email}</Row>
          <Row term="Teléfono">{entity.phone}</Row>
          <Row term="Certificados que emite">{entity.certificateTypes.map(certificateTypeLabel).join(', ')}</Row>
          <Row term="Registro ante el Ministerio del Trabajo">{entity.ministryRegistration || '—'}</Row>
          <Row term="Registrado el">{formatLongDate(entity.registeredAt)}</Row>
          {revokedAt !== null && <Row term="Revocado el">{formatLongDate(revokedAt)}</Row>}
        </dl>
      </section>

      <section className="grid gap-2 rounded-lg border border-ha-border bg-ha-surface p-5">
        <h2 className="text-lg font-semibold">Certificados emitidos este mes</h2>
        <p className="text-3xl font-bold tabular-nums">{entity.issuedThisMonth}</p>
      </section>

      {revokedAt === null && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-ha-border bg-ha-surface p-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Revocar emisor</h2>
            <p className="mt-1 max-w-[62ch] text-ha-text-muted">
              Todos los certificados de esta entidad dejarán de verse como válidos en todas las obras y no podrá emitir
              nuevos. Úsalo solo cuando sea necesario.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            <Ban aria-hidden="true" className="size-5" />
            Revocar emisor
          </Button>
        </section>
      )}

      <ConfirmDialog
        open={confirming}
        tone="destructive"
        title={`¿Revocar a ${entity.name}?`}
        confirmLabel="Revocar emisor"
        confirmText={entity.name}
        loading={revoking}
        onConfirm={confirmRevoke}
        onCancel={() => setConfirming(false)}
      >
        <p>
          Todos los certificados de esta entidad dejarán de verse como válidos en todas las obras. Tampoco podrá emitir
          nuevos.
        </p>
        <p className="mt-2">El cambio se aplica de inmediato.</p>
      </ConfirmDialog>
    </Layout>
  )
}

export const EntityDetailPage = () => {
  const { id = '' } = useParams()
  return <EntityDetail key={id} id={id} />
}
