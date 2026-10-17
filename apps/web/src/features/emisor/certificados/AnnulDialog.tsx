import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast-context'
import type { Certificate } from '@/data'
import { useAnnulCertificate } from '@/features/emisor/certificados/useAnnulCertificate'

const MESSAGES = {
  'already-annulled': 'Este certificado ya estaba anulado.',
  failed: 'No pudimos anular el certificado. Inténtalo de nuevo.',
} as const

interface AnnulDialogProps {
  certificate: Certificate
  code: string
  open: boolean
  onClose: () => void
}

export const AnnulDialog = ({ certificate, code, open, onClose }: AnnulDialogProps) => {
  const { annul, annulling } = useAnnulCertificate()
  const toast = useToast()
  const [problem, setProblem] = useState<keyof typeof MESSAGES | null>(null)

  const close = () => {
    setProblem(null)
    onClose()
  }

  const confirm = async () => {
    setProblem(null)
    try {
      const result = await annul(certificate.id)
      if (result !== 'annulled') {
        setProblem(result)
        return
      }
      toast.show({ tone: 'success', title: 'Certificado anulado', message: `${code} ya no se puede usar.` })
      close()
    } catch {
      // The session gate is already ending the session.
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title="Anular certificado"
      tone="destructive"
      confirmLabel="Anular certificado"
      confirmText="ANULAR"
      loading={annulling}
      onConfirm={() => void confirm()}
      onCancel={close}
    >
      <div className="grid gap-3">
        <p>Vas a anular el certificado {code}. No se puede deshacer.</p>
        {problem !== null && <Alert tone="danger" title={MESSAGES[problem]} />}
      </div>
    </ConfirmDialog>
  )
}
