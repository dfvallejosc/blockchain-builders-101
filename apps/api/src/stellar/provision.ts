import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';
import { Issuer } from '../issuers/issuer.entity.js';
import { provisionIssuer } from './provision-issuer.js';
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

    const failed: string[] = [];
    for (const issuer of issuers) {
      try {
        await provisionIssuer(client, issuer);
        console.log(`Emisor: ${issuer.id}`);
      } catch {
        failed.push(issuer.id);
      }
    }

    console.log(`Se aprovisionaron ${issuers.length - failed.length} de ${issuers.length} emisores.`);
    for (const issuerId of failed) console.error(`Falló el emisor: ${issuerId}`);
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
};

void provisionIssuers().catch(() => {
  console.error('El aprovisionamiento de Stellar falló.');
  process.exitCode = 1;
});
