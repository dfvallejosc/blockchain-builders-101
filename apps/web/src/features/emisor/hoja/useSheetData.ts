import { useQuery } from '@tanstack/react-query'
import { listCertificates } from '@/api/certificates'
import type { IssuerProfile } from '@/api/me'
import type { Certificate, Worker } from '@/data'
import { useIssuerProfile } from '@/features/emisor/auth/useIssuerProfile'
import { useWorkersQuery } from '@/features/emisor/trabajadores/useWorkers'

export type SheetData =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; certificate: Certificate; profile: IssuerProfile; worker: Worker }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const useSheetData = (certificateId: string): SheetData => {
  const certificates = useQuery({ queryKey: ['issuer', 'certificates'], queryFn: listCertificates })
  const workers = useWorkersQuery()
  const profile = useIssuerProfile()

  if (!certificates.data || !workers.data || !profile.data) {
    const failed = [certificates, workers, profile].some((query) => query.isError && !query.isFetching)
    return { status: failed ? 'error' : 'loading' }
  }
  if (!UUID.test(certificateId)) return { status: 'not-found' }

  const certificate = certificates.data.find((candidate) => candidate.id === certificateId)
  const worker = workers.data.find((candidate) => candidate.id === certificate?.workerId)
  if (!certificate || !worker) return { status: 'not-found' }

  return { status: 'ready', certificate, profile: profile.data, worker }
}
