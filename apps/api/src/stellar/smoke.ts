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
      throw new Error('El registro de Stellar no está habilitado.');
    }

    const issuerId = randomUUID();
    const fingerprint = randomBytes(32).toString('hex');

    await client.ensureIssuerAccount(issuerId);
    const authorizationHash = await client.authorizeIssuer(issuerId);
    console.log(`Autorizar emisor: ${transactionLink(authorizationHash)}`);

    const registerHash = await client.registerCertificate({
      issuerId,
      fingerprint,
      validUntil: endOfDayInBogotaAsUnix(VALID_UNTIL),
    });
    console.log(`Registrar certificado: ${transactionLink(registerHash)}`);

    const validVerdict = await client.getVerdict(fingerprint);
    if (validVerdict !== 'valid') {
      throw new Error(`Se esperaba el veredicto válido y se recibió ${validVerdict}.`);
    }
    console.log(`Veredicto después del registro: ${validVerdict}`);

    const annulHash = await client.annulCertificate({ issuerId, fingerprint });
    console.log(`Anular certificado: ${transactionLink(annulHash)}`);

    const annulledVerdict = await client.getVerdict(fingerprint);
    if (annulledVerdict !== 'annulled') {
      throw new Error(`Se esperaba el veredicto anulado y se recibió ${annulledVerdict}.`);
    }
    console.log(`Veredicto después de anular: ${annulledVerdict}`);

    const revokeHash = await client.revokeIssuer(issuerId);
    console.log(`Revocar emisor: ${transactionLink(revokeHash)}`);
  } finally {
    await app.close();
  }
};

void runSmoke().catch(() => {
  console.error('La prueba de Stellar falló.');
  process.exitCode = 1;
});
