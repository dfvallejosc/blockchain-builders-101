import { HEADERS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../auth/decorators.js';
import type { VerificationResult } from './verification-result.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

const result: VerificationResult = { status: 'invalid', reason: 'unknown-certificate' };

describe('VerificationController', () => {
  it('passes the id as it comes to the service and returns its result', async () => {
    const verify = vi.fn<VerificationService['verify']>().mockResolvedValue(result);
    const controller = new VerificationController({ verify } as unknown as VerificationService);

    await expect(controller.verify('not-even-a-uuid')).resolves.toBe(result);
    expect(verify).toHaveBeenCalledWith('not-even-a-uuid');
  });

  it('is public, so the coordinator needs no account', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, VerificationController)).toBe(true);
    expect(Reflect.getMetadata(ROLES_KEY, VerificationController)).toBeUndefined();
  });

  it('forbids caching, since the status changes and the answer carries the worker document', () => {
    const handler = Object.getOwnPropertyDescriptor(VerificationController.prototype, 'verify')?.value as object;

    expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toEqual([{ name: 'Cache-Control', value: 'no-store' }]);
  });
});
