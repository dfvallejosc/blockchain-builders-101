import type { NewWorkerInput, Worker } from '@/data/types'
import { apiClient } from '@/lib/api-client'

export const listWorkers = async (): Promise<Worker[]> => {
  const response = await apiClient.get<Worker[]>('/workers')
  return response.data
}

export const registerWorker = async (input: NewWorkerInput): Promise<Worker> => {
  const response = await apiClient.post<Worker>('/workers', input)
  return response.data
}
