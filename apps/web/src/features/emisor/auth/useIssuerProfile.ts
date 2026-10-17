import { useAuth } from '@clerk/react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getMe, type IssuerProfile } from '@/api/me'
import type { DataError } from '@/data/errors'
import { NotIssuerError } from '@/features/auth/errors'

export const ISSUER_PROFILE_KEY = ['issuer', 'me'] as const

const fetchIssuerProfile = async (): Promise<IssuerProfile> => {
  const me = await getMe()
  if (me.role !== 'issuer' || me.issuer === null) throw new NotIssuerError()
  return me.issuer
}

export const useIssuerProfile = (): UseQueryResult<IssuerProfile, DataError | NotIssuerError> => {
  const { isSignedIn } = useAuth()

  return useQuery<IssuerProfile, DataError | NotIssuerError>({
    queryKey: ISSUER_PROFILE_KEY,
    queryFn: fetchIssuerProfile,
    enabled: isSignedIn === true,
  })
}
