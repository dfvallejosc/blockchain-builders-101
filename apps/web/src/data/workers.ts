import { today } from '@/data/clock'
import { DataError } from '@/data/errors'
import { selectEntities, selectWorkers } from '@/data/selectors'
import { readState, writeState } from '@/data/storage'
import type { NewWorkerInput, Worker } from '@/data/types'

export const listWorkers = async (entityId: string): Promise<Worker[]> =>
  selectWorkers(readState()).filter((worker) => worker.entityId === entityId)

export const registerWorker = async (entityId: string, input: NewWorkerInput): Promise<Worker> => {
  if (!input.dataConsent) throw new DataError('consent-required')

  const state = readState()
  if (!selectEntities(state).some((entity) => entity.id === entityId)) throw new DataError('not-found')

  const documentNumber = input.documentNumber.trim()
  const isDuplicate = selectWorkers(state).some(
    (worker) =>
      worker.entityId === entityId &&
      worker.documentType === input.documentType &&
      worker.documentNumber === documentNumber,
  )
  if (isDuplicate) throw new DataError('duplicate')

  const date = today()
  const worker: Worker = {
    id: `w-added-${state.addedWorkers.length + 1}`,
    entityId,
    fullName: input.fullName.trim(),
    documentType: input.documentType,
    documentNumber,
    registeredAt: date,
    consentedAt: date,
  }
  writeState({ ...state, addedWorkers: [worker, ...state.addedWorkers] })
  return worker
}
