import { isAxiosError } from 'axios'
import { DataError } from '@/data/errors'

export const mapApiError = (error: unknown): DataError => {
  if (error instanceof DataError) return error
  if (!isAxiosError(error)) return new DataError('unknown')

  const response = error.response
  if (!response) return new DataError('unavailable')
  if (response.status >= 500 && response.status <= 599) {
    return new DataError('unavailable')
  }

  switch (response.status) {
    case 400:
      return new DataError('invalid-input')
    case 401:
      return new DataError('unauthorized')
    case 403: {
      const data: unknown = response.data
      if (
        typeof data === 'object'
        && data !== null
        && 'code' in data
        && data.code === 'issuer-revoked'
      ) {
        return new DataError('entity-revoked')
      }
      return new DataError('unauthorized')
    }
    case 404:
      return new DataError('not-found')
    case 409:
      return new DataError('duplicate')
    default:
      return new DataError('unknown')
  }
}
