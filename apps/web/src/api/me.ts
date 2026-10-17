import type { CertificateType } from '@/data/types'
import { apiClient } from '@/lib/api-client'

export interface IssuerProfile {
  id: string
  name: string
  certificateTypes: CertificateType[]
  nit: string
  city: string
}

export interface MeResponse {
  role: 'admin' | 'issuer'
  issuer: IssuerProfile | null
}

export const getMe = async (): Promise<MeResponse> => {
  const response = await apiClient.get<MeResponse>('/me')
  return response.data
}
