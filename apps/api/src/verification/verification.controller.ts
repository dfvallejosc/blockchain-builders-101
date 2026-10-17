import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import type { VerificationResult } from './verification-result.js';
import { VerificationService } from './verification.service.js';

// The id is not validated here on purpose: a malformed id must get the same answer as an unknown one.
@Controller('verification')
@Public()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  verify(@Param('id') id: string): Promise<VerificationResult> {
    return this.verificationService.verify(id);
  }
}
