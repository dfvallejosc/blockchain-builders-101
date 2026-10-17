import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { issueCertificate, listCertificates } from '@/api/certificates'
import type { IssuerProfile } from '@/api/me'
import { DataError, type Certificate, type CertificateType, type Worker } from '@/data'
import { today } from '@/data/clock'
import type { IssueCertificateInput } from '@/data/types'
import { useIssuerProfile } from '@/features/emisor/auth/useIssuerProfile'
import { CERTIFICATES_KEY } from '@/features/emisor/certificados/useCertificates'
import { useWorkersQuery } from '@/features/emisor/trabajadores/useWorkers'

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
  | { phase: 'ready'; profile: IssuerProfile; workers: Worker[]; certificates: Certificate[] }

export type IssueFailure = 'duplicate' | 'failed' | null

const emptyDraft = (): IssueDraft => ({ workerId: null, type: '', issuedAt: today(), validUntil: '' })

const failureOf = (error: unknown): IssueFailure => {
  if (!(error instanceof DataError)) return 'failed'
  if (error.code === 'duplicate') return 'duplicate'
  if (error.code === 'unauthorized' || error.code === 'entity-revoked') return null
  return 'failed'
}

export const useIssueFlow = (initialWorkerId: string | null) => {
  const queryClient = useQueryClient()
  const profile = useIssuerProfile()
  const workers = useWorkersQuery()
  const certificates = useQuery({ queryKey: CERTIFICATES_KEY, queryFn: listCertificates })
  const [step, setStep] = useState<IssueStep>('worker')
  const [draft, setDraft] = useState<IssueDraft>(emptyDraft)
  const [issued, setIssued] = useState<Certificate | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [failure, setFailure] = useState<IssueFailure>(null)
  const [seeded, setSeeded] = useState(false)
  const issuingRef = useRef(false)
  const mutation = useMutation({ mutationFn: (input: IssueCertificateInput) => issueCertificate(input) })
  const { mutateAsync } = mutation

  const queries = [profile, workers, certificates]
  const load: LoadState =
    profile.data && workers.data && certificates.data
      ? { phase: 'ready', profile: profile.data, workers: workers.data, certificates: certificates.data }
      : queries.some((query) => query.isError && !query.isFetching)
        ? { phase: 'error' }
        : { phase: 'loading' }

  if (!seeded && initialWorkerId !== null && workers.data?.some((worker) => worker.id === initialWorkerId)) {
    setSeeded(true)
    setDraft((current) => ({ ...current, workerId: initialWorkerId }))
    setStep('details')
  }

  const selectWorker = useCallback((id: string) => {
    setDraft((current) => ({ ...current, workerId: id }))
  }, [])

  const continueToDetails = useCallback(() => {
    if (draft.workerId === null) return
    setStep('details')
  }, [draft.workerId])

  const saveDetails = useCallback((values: DetailsFormValues) => {
    setDraft((current) => ({ ...current, ...values }))
    setFailure(null)
    setStep('review')
  }, [])

  const backToWorker = useCallback((values?: DetailsFormValues) => {
    if (values) setDraft((current) => ({ ...current, ...values }))
    setFailure(null)
    setStep('worker')
  }, [])

  const backToDetails = useCallback(() => {
    setFailure(null)
    setStep('details')
  }, [])

  const issue = useCallback(async () => {
    if (issuingRef.current || draft.workerId === null || draft.type === '') return
    issuingRef.current = true
    setIssuing(true)
    setFailure(null)
    try {
      const certificate = await mutateAsync({
        workerId: draft.workerId,
        type: draft.type,
        issuedAt: draft.issuedAt,
        validUntil: draft.validUntil,
      })
      setIssued(certificate)
      setStep('issued')
      void queryClient.invalidateQueries({ queryKey: CERTIFICATES_KEY })
    } catch (error) {
      const reason = failureOf(error)
      setFailure(reason)
      // The details step reads the certificates to block a duplicate, so a 409 means they are stale.
      if (reason === 'duplicate') void queryClient.invalidateQueries({ queryKey: CERTIFICATES_KEY })
    } finally {
      issuingRef.current = false
      setIssuing(false)
    }
  }, [draft, queryClient, mutateAsync])

  const issueAnother = useCallback(() => {
    setDraft(emptyDraft())
    setIssued(null)
    setFailure(null)
    setStep('worker')
  }, [])

  const retry = useCallback(() => {
    for (const query of [profile, workers, certificates]) {
      if (query.isError) void query.refetch()
    }
  }, [profile, workers, certificates])

  return {
    load,
    step,
    draft,
    issued,
    issuing,
    failure,
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
