import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';
import { Issuer } from '../issuers/issuer.entity.js';
import { STELLAR_CLIENT, type StellarClient } from './stellar-client.js';

const provisionIssuers = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const client = app.get<StellarClient | undefined>(STELLAR_CLIENT);
    if (!client) {
      throw new Error('El registro de Stellar no está habilitado.');
    }

    const issuers = await app
      .get(DataSource)
      .getRepository(Issuer)
      .find({
        order: { id: 'ASC' },
      });

    let revokedCount = 0;
    for (const issuer of issuers) {
      await client.ensureIssuerAccount(issuer.id);
      await client.authorizeIssuer(issuer.id);
      if (issuer.revokedAt) {
        await client.revokeIssuer(issuer.id);
        revokedCount += 1;
      }
      console.log(`Emisor: ${issuer.id}`);
    }

    console.log(`Se aprovisionaron ${issuers.length} emisores.`);
    console.log(`Se reaplicó la revocación a ${revokedCount} emisores.`);
  } finally {
    await app.close();
  }
};

void provisionIssuers().catch(() => {
  console.error('El aprovisionamiento de Stellar falló.');
  process.exitCode = 1;
});
