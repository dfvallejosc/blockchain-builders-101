import type { Entity, NewEntityInput } from '@/data/types'
import { apiClient } from '@/lib/api-client'

// Same format the API uses for "today": YYYY-MM-DD in Bogota. The screens format dates by splitting on "-".
const BOGOTA_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' })

export const toBogotaDate = (iso: string): string => BOGOTA_DATE.format(new Date(iso))

// The API answers the front `Entity` fields, but with full ISO timestamps in the two date fields.
const toEntity = (issuer: Entity): Entity => ({
  ...issuer,
  registeredAt: toBogotaDate(issuer.registeredAt),
  revokedAt: issuer.revokedAt === null ? null : toBogotaDate(issuer.revokedAt),
})

export const listIssuers = async (): Promise<Entity[]> => {
  const response = await apiClient.get<Entity[]>('/issuers')
  return response.data.map(toEntity)
}

export const getIssuer = async (id: string): Promise<Entity> => {
  const response = await apiClient.get<Entity>(`/issuers/${encodeURIComponent(id)}`)
  return toEntity(response.data)
}

export const registerIssuer = async (input: NewEntityInput): Promise<Entity> => {
  const response = await apiClient.post<Entity>('/issuers', input)
  return toEntity(response.data)
}

export const revokeIssuer = async (id: string): Promise<Entity> => {
  const response = await apiClient.post<Entity>(`/issuers/${encodeURIComponent(id)}/revoke`)
  return toEntity(response.data)
}
