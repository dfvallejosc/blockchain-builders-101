export class NotIssuerError extends Error {
  constructor() {
    super('not-issuer')
    this.name = 'NotIssuerError'
  }
}

export class NotAdminError extends Error {
  constructor() {
    super('not-admin')
    this.name = 'NotAdminError'
  }
}
