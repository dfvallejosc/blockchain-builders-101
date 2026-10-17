import { DataError } from '@/data/errors'
import type { Certificate, IssueCertificateInput } from '@/data/types'
import { apiClient } from '@/lib/api-client'

export const listCertificates = async (): Promise<Certificate[]> => {
  const response = await apiClient.get<Certificate[]>('/certificates')
  return response.data
}

export const issueCertificate = async (input: IssueCertificateInput): Promise<Certificate> => {
  try {
    const response = await apiClient.post<Certificate>('/certificates', input)
    return response.data
  } catch (error) {
    if (error instanceof DataError && error.code === 'forbidden') {
      throw new DataError('type-not-allowed')
    }
    throw error
  }
}

export const annulCertificate = async (id: string): Promise<Certificate> => {
  const response = await apiClient.post<Certificate>(`/certificates/${id}/annul`)
  return response.data
}
