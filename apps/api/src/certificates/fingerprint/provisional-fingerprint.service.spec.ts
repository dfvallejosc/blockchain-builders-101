import { createHash } from 'node:crypto';
import { CertificateType } from '../certificate-type.js';
import { DocumentType } from '../../workers/document-type.js';
import { ProvisionalFingerprintService } from './provisional-fingerprint.service.js';
import type { FingerprintFields } from './fingerprint.service.js';

const fields: FingerprintFields = {
  certificateId: 'certificate-123',
  issuerId: 'issuer-456',
  type: CertificateType.HeightWork,
  issuedAt: '2026-10-17T12:00:00.000Z',
  validUntil: '2027-10-17T12:00:00.000Z',
  documentType: DocumentType.Cc,
  documentNumber: 'AB12345',
};

const salt = '0123456789abcdef0123456789abcdef';

const expectedFingerprint = (input: FingerprintFields, fingerprintSalt: string): string =>
  createHash('sha256')
    .update(
      `v1\n${input.certificateId}\n${input.issuerId}\n${input.type}\n${input.issuedAt}\n${input.validUntil}\n${input.documentType}\n${input.documentNumber}\n${fingerprintSalt}`,
    )
    .digest('hex');

describe('ProvisionalFingerprintService', () => {
  const service = new ProvisionalFingerprintService();

  it('generates a unique 32-character hexadecimal salt', () => {
    const firstSalt = service.generateSalt();
    const secondSalt = service.generateSalt();

    expect(firstSalt).toMatch(/^[a-f0-9]{32}$/);
    expect(secondSalt).toMatch(/^[a-f0-9]{32}$/);
    expect(firstSalt).not.toBe(secondSalt);
  });

  it('returns the same 64-character hexadecimal fingerprint for the same input', () => {
    const fingerprint = service.compute(fields, salt);

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(service.compute(fields, salt)).toBe(fingerprint);
  });

  it.each([
    ['certificateId', { certificateId: 'certificate-789' }],
    ['issuerId', { issuerId: 'issuer-987' }],
    ['type', { type: CertificateType.ConfinedSpaces }],
    ['issuedAt', { issuedAt: '2026-10-18T12:00:00.000Z' }],
    ['validUntil', { validUntil: '2027-10-18T12:00:00.000Z' }],
    ['documentType', { documentType: DocumentType.Passport }],
    ['documentNumber', { documentNumber: 'CD67890' }],
  ] as const)('changes the fingerprint when %s changes', (_field, change) => {
    expect(service.compute({ ...fields, ...change }, salt)).not.toBe(service.compute(fields, salt));
  });

  it('changes the fingerprint when the salt changes', () => {
    expect(service.compute(fields, `${salt}a`)).not.toBe(service.compute(fields, salt));
  });

  it('matches the fixed SHA-256 vector', () => {
    expect(service.compute(fields, salt)).toBe(expectedFingerprint(fields, salt));
  });
});
