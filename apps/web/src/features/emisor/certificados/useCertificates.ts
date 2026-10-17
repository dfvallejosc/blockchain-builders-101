import { useQuery } from '@tanstack/react-query'
import { listCertificates } from '@/api/certificates'
import { listWorkers } from '@/api/workers'
import type { Certificate, Worker } from '@/data'
import { WORKERS_KEY } from '@/features/emisor/trabajadores/useWorkers'

export const CERTIFICATES_KEY = ['issuer', 'certificates'] as const

export type CertificatesState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; workers: Worker[]; certificates: Certificate[] }

export const useCertificates = () => {
  const certificates = useQuery({ queryKey: CERTIFICATES_KEY, queryFn: listCertificates })
  const workers = useQuery({ queryKey: WORKERS_KEY, queryFn: listWorkers })

  const load: CertificatesState =
    certificates.data && workers.data
      ? { phase: 'ready', workers: workers.data, certificates: certificates.data }
      : [certificates, workers].some((query) => query.isError && !query.isFetching)
        ? { phase: 'error' }
        : { phase: 'loading' }

  const retry = () => {
    for (const query of [certificates, workers]) {
      if (query.isError) void query.refetch()
    }
  }

  return { load, retry }
}
