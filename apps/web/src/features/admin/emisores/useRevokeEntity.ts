import { useCallback, useRef, useState } from 'react'
import { revokeEntity, type Entity } from '@/data'

export const useRevokeEntity = () => {
  const [revoking, setRevoking] = useState(false)
  const revokingRef = useRef(false)

  const revoke = useCallback(async (id: string): Promise<Entity | 'busy' | null> => {
    if (revokingRef.current) return 'busy'
    revokingRef.current = true
    setRevoking(true)
    try {
      return await revokeEntity(id)
    } catch {
      return null
    } finally {
      revokingRef.current = false
      setRevoking(false)
    }
  }, [])

  return { revoking, revoke }
}
