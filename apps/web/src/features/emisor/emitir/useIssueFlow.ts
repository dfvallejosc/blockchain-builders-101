import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DataError,
  getEntity,
  issueCertificate,
  listCertificates,
  listWorkers,
  type Certificate,
  type CertificateType,
  type Entity,
  type IssuerSession,
  type Worker,
} from '@/data'
import { today } from '@/data/clock'

export type IssueStep = 'worker' | 'details' | 'review' | 'issued'

export interface DetailsFormValues {
  type: CertificateType | ''
  issuedAt: string
  validUntil: string
}

export interface IssueDraft extends DetailsFormValues {
  workerId: string | null
}

export type LoadState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; entity: Entity; workers: Worker[]; certificates: Certificate[] }

interface LoadedData {
  entity: Entity
  workers: Worker[]
  certificates: Certificate[]
}

const emptyDraft = (): IssueDraft => ({ workerId: null, type: '', issuedAt: today(), validUntil: '' })

const fetchAll = async (entityId: string): Promise<LoadedData> => {
  const [entity, workers, certificates] = await Promise.all([
    getEntity(entityId),
    listWorkers(entityId),
    listCertificates(entityId),
  ])
  if (!entity) throw new DataError('not-found')
  return { entity, workers, certificates }
}

export const useIssueFlow = (session: IssuerSession, initialWorkerId: string | null) => {
  const { entityId } = session
  const [load, setLoad] = useState<LoadState>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [step, setStep] = useState<IssueStep>('worker')
  const [draft, setDraft] = useState<IssueDraft>(emptyDraft)
  const [issued, setIssued] = useState<Certificate | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [failed, setFailed] = useState(false)
  const seeded = useRef(false)
  const issuingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchAll(entityId)
      .then((data) => {
        if (cancelled) return
        setLoad({ phase: 'ready', ...data })
        const canSeed =
          !seeded.current &&
          initialWorkerId !== null &&
          data.entity.revokedAt === null &&
          data.workers.some((worker) => worker.id === initialWorkerId)
        if (!canSeed) return
        seeded.current = true
        setDraft((current) => ({ ...current, workerId: initialWorkerId }))
        setStep('details')
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [entityId, initialWorkerId, attempt])

  const blocked = load.phase === 'ready' && load.entity.revokedAt !== null

  const selectWorker = useCallback((id: string) => {
    setDraft((current) => ({ ...current, workerId: id }))
  }, [])

  const continueToDetails = useCallback(() => {
    if (draft.workerId === null || blocked) return
    setStep('details')
  }, [draft.workerId, blocked])

  const saveDetails = useCallback((values: DetailsFormValues) => {
    setDraft((current) => ({ ...current, ...values }))
    setStep('review')
  }, [])

  const backToWorker = useCallback((values?: DetailsFormValues) => {
    if (values) setDraft((current) => ({ ...current, ...values }))
    setStep('worker')
  }, [])

  const backToDetails = useCallback(() => setStep('details'), [])

  const refresh = useCallback(async () => {
    try {
      setLoad({ phase: 'ready', ...(await fetchAll(entityId)) })
    } catch {
      // Keep the previous data visible when a refresh fails.
    }
  }, [entityId])

  const issue = useCallback(async () => {
    if (issuingRef.current || draft.workerId === null || draft.type === '') return
    issuingRef.current = true
    setIssuing(true)
    setFailed(false)
    try {
      const certificate = await issueCertificate(entityId, {
        workerId: draft.workerId,
        type: draft.type,
        issuedAt: draft.issuedAt,
        validUntil: draft.validUntil,
      })
      setIssued(certificate)
      setStep('issued')
    } catch (error) {
      if (!(error instanceof DataError && error.code === 'entity-revoked')) setFailed(true)
    } finally {
      issuingRef.current = false
      setIssuing(false)
    }
    await refresh()
  }, [draft, entityId, refresh])

  const issueAnother = useCallback(() => {
    setDraft(emptyDraft())
    setIssued(null)
    setFailed(false)
    setStep('worker')
  }, [])

  const retry = useCallback(() => {
    setLoad({ phase: 'loading' })
    setAttempt((current) => current + 1)
  }, [])

  return {
    load,
    step,
    draft,
    issued,
    issuing,
    failed,
    blocked,
    selectWorker,
    continueToDetails,
    saveDetails,
    backToWorker,
    backToDetails,
    issue,
    issueAnother,
    retry,
  }
}
