import { useEffect, useState } from 'react'

export type ApiStatus = 'loading' | 'ok' | 'error'

export const useApiHealth = (): ApiStatus => {
  const [status, setStatus] = useState<ApiStatus>('loading')

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${import.meta.env.VITE_API_URL}/health`, { signal: controller.signal })
      .then((response) => setStatus(response.ok ? 'ok' : 'error'))
      .catch((error: unknown) => {
        const aborted = error instanceof DOMException && error.name === 'AbortError'
        if (!aborted) setStatus('error')
      })

    return () => controller.abort()
  }, [])

  return status
}
