import { Certificate } from './certificate.entity.js';
import { CertificateType } from './certificate-type.js';
import { toCertificateResponse } from './certificate-response.js';

describe('toCertificateResponse', () => {
  it('returns only the public certificate fields', () => {
    const certificate = Object.assign(new Certificate(), {
      number: 42,
      id: 'b54a7561-6b0f-4cc3-8225-bb5d3b75b6cc',
      issuerId: 'ee9946bd-9698-41d3-afbe-2a93dd20e46e',
      workerId: '8bfeb925-a903-4f60-8767-8c6241152058',
      type: CertificateType.HeightWork,
      issuedAt: '2026-10-17',
      validUntil: '2027-10-17',
      annulledAt: new Date('2026-10-18T03:00:00.000Z'),
      salt: 'private-salt',
      fingerprint: 'private-fingerprint',
    });

    expect(toCertificateResponse(certificate)).toEqual({
      number: 42,
      id: 'b54a7561-6b0f-4cc3-8225-bb5d3b75b6cc',
      entityId: 'ee9946bd-9698-41d3-afbe-2a93dd20e46e',
      workerId: '8bfeb925-a903-4f60-8767-8c6241152058',
      type: CertificateType.HeightWork,
      issuedAt: '2026-10-17',
      validUntil: '2027-10-17',
      annulledAt: '2026-10-18T03:00:00.000Z',
    });
  });
});
