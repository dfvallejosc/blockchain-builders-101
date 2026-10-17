import { z } from 'zod'
import { DataError } from '@/data/errors'
import type { CertificateStatus, CertificateType, DocumentType, VerificationResult } from '@/data/types'
import { apiClient } from '@/lib/api-client'

const UNKNOWN_CERTIFICATE: VerificationResult = { status: 'invalid', reason: 'unknown-certificate' }

const certificateTypes = ['height-work', 'confined-spaces', 'crane-operation', 'occupational-medical'] as const satisfies readonly CertificateType[]
const documentTypes = ['cc', 'ce', 'ppt', 'passport'] as const satisfies readonly DocumentType[]
const statuses = ['valid', 'expired', 'annulled'] as const satisfies readonly CertificateStatus[]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// The answer is public and goes straight to the screen, so it is checked before it is used. Fields the screen
// does not know are dropped, and a body that does not fit becomes an error instead of an invented result.
const verificationResultSchema: z.ZodType<VerificationResult> = z.union([
  z.object({
    status: z.enum(statuses),
    certificate: z.object({
      id: z.string(),
      type: z.enum(certificateTypes),
      issuedAt: z.string().regex(ISO_DATE),
      validUntil: z.string().regex(ISO_DATE),
    }),
    worker: z.object({
      fullName: z.string(),
      documentType: z.enum(documentTypes),
      documentNumber: z.string(),
    }),
    entity: z.object({ name: z.string() }),
  }),
  z.object({ status: z.literal('invalid'), reason: z.literal('unknown-certificate') }),
  z.object({
    status: z.literal('invalid'),
    reason: z.literal('entity-revoked'),
    entity: z.object({ name: z.string() }),
  }),
])

export const verifyCertificate = async (id: string): Promise<VerificationResult> => {
  const trimmed = id.trim()
  // A dot segment is not an id, and in a URL it would climb out of /verification/ to the API root.
  if (trimmed === '' || trimmed === '.' || trimmed === '..') return UNKNOWN_CERTIFICATE

  const response = await apiClient.get<unknown>(`/verification/${encodeURIComponent(trimmed)}`)
  const parsed = verificationResultSchema.safeParse(response.data)
  if (!parsed.success) throw new DataError('unknown')
  return parsed.data
}
