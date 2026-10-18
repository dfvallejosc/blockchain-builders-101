import { isClerkAPIResponseError } from '@clerk/react/errors'

export type InvitationFailure = 'bad-link' | 'generic'

const BAD_LINK_CODES = ['invitation_already_accepted', 'ticket_invalid_code']
export const invitationFailureFor = (error: unknown): InvitationFailure => {
  if (typeof error !== 'object' || error === null || !isClerkAPIResponseError(error)) return 'generic'

  if (error.errors.some(({ code }) => BAD_LINK_CODES.includes(code))) return 'bad-link'
  return 'generic'
}
