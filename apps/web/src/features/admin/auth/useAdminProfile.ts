import { useAuth } from '@clerk/react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getMe } from '@/api/me'
import type { DataError } from '@/data/errors'
import { NotAdminError } from '@/features/auth/errors'

export const ADMIN_PROFILE_KEY = ['admin', 'me'] as const

export interface AdminProfile {
  role: 'admin'
}

const fetchAdminProfile = async (): Promise<AdminProfile> => {
  const me = await getMe()
  if (me.role !== 'admin') throw new NotAdminError()
  return { role: 'admin' }
}

export const useAdminProfile = (): UseQueryResult<AdminProfile, DataError | NotAdminError> => {
  const { isSignedIn } = useAuth()

  return useQuery<AdminProfile, DataError | NotAdminError>({
    queryKey: ADMIN_PROFILE_KEY,
    queryFn: fetchAdminProfile,
    enabled: isSignedIn === true,
  })
}
