export const ISSUERS_KEY = ['admin', 'issuers'] as const

export const issuerKey = (id: string) => [...ISSUERS_KEY, id] as const
