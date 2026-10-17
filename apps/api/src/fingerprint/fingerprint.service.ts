import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  CertificateType,
  type CertificateTypeValue,
} from '../certificates/certificate-type.js';
import {
  DocumentType,
  type DocumentTypeValue,
} from '../workers/document-type.js';

// Canonical text hashed for every certificate. Changing the fields, their order or their format
// changes every fingerprint, so a new layout needs a new version here.
const FORMAT_VERSION = 'habilitapp:certificate:v1';

const SALT_BYTES = 32;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HEX_64 = /^[0-9a-f]{64}$/;

export interface FingerprintInput {
  id: string;
  issuerId: string;
  type: CertificateTypeValue;
  issuedAt: string;
  validUntil: string;
  workerDocumentType: DocumentTypeValue;
  // The value as stored for the worker, which is what the fingerprint was computed from. It is not normalized here.
  workerDocumentNumber: string;
  salt: string;
}

// The message names the invalid field and never its value, because the values can be personal data.
export class FingerprintInputError extends Error {
  constructor(field: keyof FingerprintInput) {
    super(`Invalid value for ${field}.`);
    this.name = 'FingerprintInputError';
  }
}

const isIsoDate = (value: string): boolean => {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const isOneOf = (values: readonly string[], value: string): boolean =>
  values.includes(value);

const VALIDATORS: Record<keyof FingerprintInput, (value: string) => boolean> = {
  id: (value) => UUID.test(value),
  issuerId: (value) => UUID.test(value),
  type: (value) => isOneOf(Object.values(CertificateType), value),
  issuedAt: isIsoDate,
  validUntil: isIsoDate,
  workerDocumentType: (value) => isOneOf(Object.values(DocumentType), value),
  workerDocumentNumber: (value) => value !== '' && !/[\r\n]/.test(value),
  salt: (value) => HEX_64.test(value),
};

// Fields in the order they are written in the canonical text.
const FIELD_ORDER = [
  'id',
  'issuerId',
  'type',
  'issuedAt',
  'validUntil',
  'workerDocumentType',
  'workerDocumentNumber',
  'salt',
] as const satisfies readonly (keyof FingerprintInput)[];

@Injectable()
export class FingerprintService {
  generateSalt(): string {
    return randomBytes(SALT_BYTES).toString('hex');
  }

  canonicalize(input: FingerprintInput): string {
    const lines = FIELD_ORDER.map((field) => {
      const value: unknown = input[field];
      if (typeof value !== 'string' || !VALIDATORS[field](value))
        throw new FingerprintInputError(field);
      return `${field}=${value}`;
    });
    return [FORMAT_VERSION, ...lines].join('\n');
  }

  compute(input: FingerprintInput): string {
    return createHash('sha256')
      .update(this.canonicalize(input), 'utf8')
      .digest('hex');
  }

  verify(input: FingerprintInput, fingerprint: string): boolean {
    if (!HEX_64.test(fingerprint)) return false;
    const expected = this.compute(input);
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(fingerprint, 'hex'),
    );
  }
}
