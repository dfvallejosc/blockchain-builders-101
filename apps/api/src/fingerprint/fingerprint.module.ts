import { Module } from '@nestjs/common';
import { FingerprintService } from './fingerprint.service.js';

@Module({
  providers: [FingerprintService],
  exports: [FingerprintService],
})
export class FingerprintModule {}
