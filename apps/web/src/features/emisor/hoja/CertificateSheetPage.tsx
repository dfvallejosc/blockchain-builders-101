import { useEffect, useRef } from 'react'
import { Download } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { certificateStatus, type Certificate, type Worker } from '@/data'
import { CertificateSheet } from '@/features/emisor/hoja/CertificateSheet'
import { useSheetData } from '@/features/emisor/hoja/useSheetData'
import { formatCertificateId } from '@/data/certificate-id'
import { formatLongDate } from '@/features/verificar/format'
import { cn } from '@/lib/utils'

const PAGE_CLASS = 'sheet-page grid min-h-screen content-start justify-items-center gap-5 px-4 pt-6 pb-12 print:block print:min-h-0 print:p-0'

const SheetBar = ({ annulled }: { annulled: boolean }) => (
  <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
    <div className="grid justify-items-end gap-1 text-right">
      <Button disabled={annulled} aria-describedby="sheet-help" onClick={() => window.print()}>
        <Download aria-hidden="true" className="size-5" />
        Descargar o imprimir
      </Button>
      <p id="sheet-help" className="text-sm text-ha-text-muted">
        {annulled
          ? 'No disponible: el certificado está anulado.'
          : 'Para descargarlo, elige “Guardar como PDF” como destino en el cuadro de impresión.'}
      </p>
    </div>
  </div>
)

const SheetNotice = ({ certificate, status }: { certificate: Certificate; status: ReturnType<typeof certificateStatus> }) => {
  if (status === 'annulled') {
    return (
      <div className="print:hidden">
        <Alert tone="danger" title="Este certificado está anulado">
          Nadie puede usarlo. No lo entregues al trabajador.
        </Alert>
      </div>
    )
  }
  if (status === 'expired') {
    return (
      <div className="print:hidden">
        <Alert tone="info" title={`Este certificado venció el ${formatLongDate(certificate.validUntil)}`} />
      </div>
    )
  }
  return null
}

const useDocumentTitle = (certificate: Certificate | null, worker: Worker | null) => {
  const previousTitle = useRef(document.title)

  useEffect(() => {
    return () => {
      document.title = previousTitle.current
    }
  }, [])

  useEffect(() => {
    document.title = certificate && worker
      ? `Certificado ${formatCertificateId(certificate.number, certificate.issuedAt)} · ${worker.fullName}`
      : 'Hoja del certificado'
  }, [certificate, worker])
}

export const CertificateSheetPage = () => {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const data = useSheetData(id)
  const ready = data.status === 'ready' ? data : null
  useDocumentTitle(ready?.certificate ?? null, ready?.worker ?? null)

  if (data.status === 'loading') {
    return (
      <main className={PAGE_CLASS}>
        <Skeleton className="aspect-[8.5/11] h-auto w-full" />
      </main>
    )
  }

  if (data.status === 'error') {
    return (
      <main className={PAGE_CLASS}>
        <EmptyState
          variant="error"
          title="No pudimos cargar el certificado"
          action={
            <Button variant="secondary" onClick={() => void queryClient.invalidateQueries({ queryKey: ['issuer'] })}>
              Reintentar
            </Button>
          }
        >
          Revisa tu conexión e inténtalo de nuevo.
        </EmptyState>
      </main>
    )
  }

  if (data.status === 'not-found') {
    return (
      <main className={PAGE_CLASS}>
        <EmptyState
          variant="no-results"
          title="No encontramos este certificado"
          action={
            <Link to="/emisor/emitir" className={cn(buttonVariants({ variant: 'secondary' }))}>
              Emitir un certificado
            </Link>
          }
        >
          Puede que el enlace esté incompleto.
        </EmptyState>
      </main>
    )
  }

  const { certificate, profile, worker } = data
  const status = certificateStatus(certificate)
  const annulled = status === 'annulled'

  return (
    <main className={PAGE_CLASS}>
      <h1 className="sr-only">{`Hoja del certificado ${formatCertificateId(certificate.number, certificate.issuedAt)}`}</h1>
      <SheetBar annulled={annulled} />
      <SheetNotice certificate={certificate} status={status} />
      <div className={cn(annulled && 'print:hidden')}>
        <CertificateSheet
          certificate={certificate}
          profile={profile}
          worker={worker}
          verifyUrl={`${window.location.origin}/c/${certificate.id}`}
        />
      </div>
    </main>
  )
}
