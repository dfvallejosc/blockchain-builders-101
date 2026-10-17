import { CertificateType } from '../certificates/certificate-type.js';
import { DocumentType } from '../workers/document-type.js';
import {
  FingerprintInputError,
  FingerprintService,
  type FingerprintInput,
} from './fingerprint.service.js';

const SALT = 'ab'.repeat(32);

// The expected fingerprint below was computed outside this module with
// `printf '<canonical text>' | shasum -a 256`, so it checks the format and not just stability.
const REFERENCE_FINGERPRINT =
  'ea118501206d6db5b10a77cb797f129f1fb98f5425567195765ceb59a8147650';

const buildInput = (
  overrides: Partial<FingerprintInput> = {},
): FingerprintInput => ({
  id: '7b1f0f0e-2c6d-4a52-9d58-3a1b8c4e9f10',
  issuerId: '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11',
  type: CertificateType.HeightWork,
  issuedAt: '2026-10-17',
  validUntil: '2027-10-17',
  workerDocumentType: DocumentType.Cc,
  workerDocumentNumber: '1020345678',
  salt: SALT,
  ...overrides,
});

describe('FingerprintService', () => {
  const service = new FingerprintService();

  describe('generateSalt', () => {
    it('returns 32 random bytes as 64 lowercase hexadecimal characters', () => {
      expect(service.generateSalt()).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns a different salt every time', () => {
      const salts = new Set(
        Array.from({ length: 50 }, () => service.generateSalt()),
      );

      expect(salts.size).toBe(50);
    });
  });

  describe('canonicalize', () => {
    it('writes the versioned fields in a fixed order, separated by line breaks and with no final one', () => {
      expect(service.canonicalize(buildInput())).toBe(
        [
          'habilitapp:certificate:v1',
          'id=7b1f0f0e-2c6d-4a52-9d58-3a1b8c4e9f10',
          'issuerId=3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11',
          'type=height-work',
          'issuedAt=2026-10-17',
          'validUntil=2027-10-17',
          'workerDocumentType=cc',
          'workerDocumentNumber=1020345678',
          `salt=${SALT}`,
        ].join('\n'),
      );
    });

    it('does not depend on the order the fields were given in', () => {
      const input = buildInput();
      const reversed = Object.fromEntries(
        Object.entries(input).reverse(),
      ) as unknown as FingerprintInput;

      expect(service.canonicalize(reversed)).toBe(service.canonicalize(input));
    });
  });

  describe('compute', () => {
    it('matches the SHA-256 computed outside the module', () => {
      expect(service.compute(buildInput())).toBe(REFERENCE_FINGERPRINT);
    });

    it('returns 64 lowercase hexadecimal characters', () => {
      expect(service.compute(buildInput())).toMatch(/^[0-9a-f]{64}$/);
    });

    it('gives the same fingerprint for the same data and the same salt', () => {
      expect(service.compute(buildInput())).toBe(service.compute(buildInput()));
    });

    it.each<[string, Partial<FingerprintInput>]>([
      ['id', { id: '0d3e5b8a-1c1f-4c7e-8a2b-6f4d9e2a7c33' }],
      ['issuerId', { issuerId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d' }],
      ['type', { type: CertificateType.ConfinedSpaces }],
      ['issuedAt', { issuedAt: '2026-10-18' }],
      ['validUntil', { validUntil: '2027-10-18' }],
      ['workerDocumentType', { workerDocumentType: DocumentType.Ce }],
      ['workerDocumentNumber', { workerDocumentNumber: '1020345679' }],
      ['salt', { salt: 'cd'.repeat(32) }],
    ])('changes the fingerprint when %s changes', (_field, change) => {
      expect(service.compute(buildInput(change))).not.toBe(
        REFERENCE_FINGERPRINT,
      );
    });

    it('keeps the personal data out of the fingerprint', () => {
      const fingerprint = service.compute(
        buildInput({ workerDocumentNumber: 'AB12345' }),
      );

      expect(fingerprint).not.toContain('AB12345');
      expect(fingerprint).not.toContain('ab12345');
    });
  });

  describe('input validation', () => {
    it.each<[keyof FingerprintInput, Partial<FingerprintInput>]>([
      ['id', { id: '' }],
      ['id', { id: 'not-a-uuid' }],
      ['issuerId', { issuerId: '3f0c6a52' }],
      ['type', { type: 'other' as FingerprintInput['type'] }],
      ['issuedAt', { issuedAt: '17/10/2026' }],
      ['issuedAt', { issuedAt: '2026-02-30' }],
      ['validUntil', { validUntil: '' }],
      [
        'workerDocumentType',
        { workerDocumentType: 'dni' as FingerprintInput['workerDocumentType'] },
      ],
      ['workerDocumentNumber', { workerDocumentNumber: '' }],
      ['workerDocumentNumber', { workerDocumentNumber: '1020\n345678' }],
      ['workerDocumentNumber', { workerDocumentNumber: '1020\r345678' }],
      ['salt', { salt: 'ab'.repeat(31) }],
      ['salt', { salt: 'AB'.repeat(32) }],
      ['salt', { salt: 'zz'.repeat(32) }],
    ])('rejects an invalid %s', (field, change) => {
      const input = buildInput(change);

      expect(() => service.compute(input)).toThrow(FingerprintInputError);
      expect(() => service.canonicalize(input)).toThrow(FingerprintInputError);
      expect(() => service.compute(input)).toThrow(
        `Invalid value for ${field}.`,
      );
    });

    it('does not put the personal data in the error message', () => {
      const attempt = () =>
        service.compute(
          buildInput({ workerDocumentNumber: '1020\n345678', salt: 'nope' }),
        );

      expect(attempt).toThrow(FingerprintInputError);
      try {
        attempt();
      } catch (error) {
        expect((error as Error).message).not.toContain('1020');
        expect((error as Error).message).not.toContain('345678');
      }
    });
  });

  describe('verify', () => {
    it('accepts the data and the salt that produced the fingerprint', () => {
      expect(service.verify(buildInput(), REFERENCE_FINGERPRINT)).toBe(true);
    });

    it('rejects the fingerprint when any field changed', () => {
      expect(
        service.verify(
          buildInput({ validUntil: '2028-10-17' }),
          REFERENCE_FINGERPRINT,
        ),
      ).toBe(false);
      expect(
        service.verify(
          buildInput({ workerDocumentNumber: '1020345679' }),
          REFERENCE_FINGERPRINT,
        ),
      ).toBe(false);
    });

    it('rejects the fingerprint when the salt is different', () => {
      expect(
        service.verify(
          buildInput({ salt: 'cd'.repeat(32) }),
          REFERENCE_FINGERPRINT,
        ),
      ).toBe(false);
    });

    it.each([
      '',
      'abc',
      'zz'.repeat(32),
      REFERENCE_FINGERPRINT.toUpperCase(),
      `${REFERENCE_FINGERPRINT}00`,
    ])(
      'rejects a fingerprint that is not 64 lowercase hexadecimal characters (%j)',
      (fingerprint) => {
        expect(service.verify(buildInput(), fingerprint)).toBe(false);
      },
    );

    it('still throws when the data to check is invalid', () => {
      expect(() =>
        service.verify(buildInput({ id: 'not-a-uuid' }), REFERENCE_FINGERPRINT),
      ).toThrow(FingerprintInputError);
    });
  });
});
