export class NotIssuerError extends Error {
  constructor() {
    super('not-issuer')
    this.name = 'NotIssuerError'
  }
}
