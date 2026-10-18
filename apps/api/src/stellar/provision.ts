import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';
import { Issuer } from '../issuers/issuer.entity.js';
import { ContractError, NetworkUnavailableError } from './contract-errors.js';
import { provisionIssuer } from './provision-issuer.js';
import { STELLAR_CLIENT, type StellarClient } from './stellar-client.js';

// Only the kind of failure is printed, never the message: it could carry configuration details.
const describeFailure = (error: unknown): string => {
  if (error instanceof ContractError) return `error ${error.code} del contrato`;
  return error instanceof NetworkUnavailableError ? 'la red no respondió' : 'error inesperado';
};

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
      } catch (error) {
        failed.push(`${issuer.id} (${describeFailure(error)})`);
      }
    }

    console.log(`Se aprovisionaron ${issuers.length - failed.length} de ${issuers.length} emisores.`);
    for (const failure of failed) console.error(`Falló el emisor: ${failure}`);
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
};

void provisionIssuers().catch(() => {
  console.error('El aprovisionamiento de Stellar falló.');
  process.exitCode = 1;
});
