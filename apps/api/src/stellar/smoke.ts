import { randomBytes, randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { endOfDayInBogotaAsUnix } from './validity.js';
import { STELLAR_CLIENT, type StellarClient } from './stellar-client.js';

const EXPLORER_TRANSACTION_URL = 'https://stellar.expert/explorer/testnet/tx';
const VALID_UNTIL = '2099-12-31';

const transactionLink = (hash: string): string =>
  `${EXPLORER_TRANSACTION_URL}/${hash}`;

const runSmoke = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const client = app.get<StellarClient | undefined>(STELLAR_CLIENT);
    if (!client) {
      throw new Error('Stellar registry is not enabled.');
    }

    const issuerId = randomUUID();
    const fingerprint = randomBytes(32).toString('hex');

    await client.ensureIssuerAccount(issuerId);
    const authorizationHash = await client.authorizeIssuer(issuerId);
    console.log(`authorize: ${transactionLink(authorizationHash)}`);

    const registerHash = await client.registerCertificate({
      issuerId,
      fingerprint,
      validUntil: endOfDayInBogotaAsUnix(VALID_UNTIL),
    });
    console.log(`register: ${transactionLink(registerHash)}`);

    const validVerdict = await client.getVerdict(fingerprint);
    if (validVerdict !== 'valid') {
      throw new Error(`Expected valid verdict, got ${validVerdict}.`);
    }
    console.log(`verdict after register: ${validVerdict}`);

    const annulHash = await client.annulCertificate({ issuerId, fingerprint });
    console.log(`annul: ${transactionLink(annulHash)}`);

    const annulledVerdict = await client.getVerdict(fingerprint);
    if (annulledVerdict !== 'annulled') {
      throw new Error(`Expected annulled verdict, got ${annulledVerdict}.`);
    }
    console.log(`verdict after annul: ${annulledVerdict}`);

    const revokeHash = await client.revokeIssuer(issuerId);
    console.log(`revoke: ${transactionLink(revokeHash)}`);
  } finally {
    await app.close();
  }
};

void runSmoke().catch(() => {
  console.error('Stellar smoke test failed.');
  process.exitCode = 1;
});
