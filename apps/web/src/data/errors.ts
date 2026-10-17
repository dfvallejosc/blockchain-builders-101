export type DataErrorCode =
  | 'invalid-credentials'
  | 'not-found'
  | 'duplicate'
  | 'consent-required'
  | 'entity-revoked'
  | 'type-not-allowed'
  | 'invalid-dates'
  | 'invalid-input'
  | 'unauthorized'
  | 'unavailable'
  | 'unknown'

export class DataError extends Error {
  readonly code: DataErrorCode

  constructor(code: DataErrorCode) {
    super(code)
    this.name = 'DataError'
    this.code = code
  }
}
