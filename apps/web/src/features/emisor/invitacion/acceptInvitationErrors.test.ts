import { ClerkAPIResponseError } from '@clerk/react/errors'
import { describe, expect, it } from 'vitest'
import { invitationFailureFor } from './acceptInvitationErrors'

const clerkError = (code: string) =>
  new ClerkAPIResponseError('Request failed', {
    data: [{ code, message: 'Clerk internal message', long_message: 'Clerk long message' }],
    status: 422,
  })

describe('invitationFailureFor', () => {
  it.each(['invitation_already_accepted', 'ticket_invalid_code'])('maps %s to a bad link', (code) => {
    expect(invitationFailureFor(clerkError(code))).toBe('bad-link')
  })

  it.each([
    'form_password_length_too_short',
    'form_password_pwned',
    'form_password_not_strong_enough',
    'form_password_validation_failed',
  ])('keeps unverified password code %s generic', (code) => {
    expect(invitationFailureFor(clerkError(code))).toBe('generic')
  })

  it('maps an unknown Clerk code to a generic failure', () => {
    expect(invitationFailureFor(clerkError('unknown_code'))).toBe('generic')
  })

  it.each([new Error('offline'), null])('maps non-Clerk errors to a generic failure', (error) => {
    expect(invitationFailureFor(error)).toBe('generic')
  })
})
