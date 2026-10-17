// PROVISIONAL: replace with the TA-19 fingerprint module and delete this file.
import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { FingerprintFields, FingerprintService } from './fingerprint.service.js';

@Injectable()
export class ProvisionalFingerprintService implements FingerprintService {
  generateSalt(): string {
    return randomBytes(16).toString('hex');
  }

  compute(fields: FingerprintFields, salt: string): string {
    return createHash('sha256')
      .update(
        `v1\n${fields.certificateId}\n${fields.issuerId}\n${fields.type}\n${fields.issuedAt}\n${fields.validUntil}\n${fields.documentType}\n${fields.documentNumber}\n${salt}`,
      )
      .digest('hex');
  }
}
