import { useEffect, useState } from 'react'
import { getCertificate, getEntity, listWorkers, type Certificate, type Entity, type Worker } from '@/data'

export type SheetData =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'ready'; certificate: Certificate; entity: Entity; worker: Worker }

const loadSheetData = async (certificateId: string, entityId: string): Promise<SheetData> => {
  const certificate = await getCertificate(certificateId)
  if (!certificate || certificate.entityId !== entityId) return { status: 'not-found' }

  const [entity, workers] = await Promise.all([getEntity(entityId), listWorkers(entityId)])
  const worker = workers.find((candidate) => candidate.id === certificate.workerId)
  if (!entity || !worker) return { status: 'not-found' }

  return { status: 'ready', certificate, entity, worker }
}

export const useSheetData = (certificateId: string, entityId: string): SheetData => {
  const [state, setState] = useState<{ certificateId: string; entityId: string; data: SheetData }>({
    certificateId,
    entityId,
    data: { status: 'loading' },
  })

  useEffect(() => {
    let active = true
    loadSheetData(certificateId, entityId).then((next) => {
      if (active) setState({ certificateId, entityId, data: next })
    })
    return () => {
      active = false
    }
  }, [certificateId, entityId])

  if (state.certificateId !== certificateId || state.entityId !== entityId) return { status: 'loading' }
  return state.data
}
