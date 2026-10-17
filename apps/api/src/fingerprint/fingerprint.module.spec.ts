import { Test } from '@nestjs/testing';
import { FingerprintModule } from './fingerprint.module.js';
import { FingerprintService } from './fingerprint.service.js';

describe('FingerprintModule', () => {
  it('provides the service on its own, with no database or network', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FingerprintModule],
    }).compile();

    expect(moduleRef.get(FingerprintService)).toBeInstanceOf(
      FingerprintService,
    );
  });
});
