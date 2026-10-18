import { Module } from '@nestjs/common';
import { ConfigService, type ConfigType } from '@nestjs/config';
import { Server } from '@stellar/stellar-sdk/rpc';
import { stellarConfig } from '../config/stellar.config.js';
import { SorobanStellarClient } from './soroban-stellar-client.js';
import { STELLAR_CLIENT, type StellarClient } from './stellar-client.js';

const createStellarClient = (
  config: ConfigService,
): StellarClient | undefined => {
  const stellar =
    config.getOrThrow<ConfigType<typeof stellarConfig>>('stellar');
  if (stellar.driver !== 'stellar') return undefined;

  if (
    !stellar.rpcUrl ||
    !stellar.networkPassphrase ||
    !stellar.contractId ||
    !stellar.masterSecret
  ) {
    throw new Error('Stellar configuration is incomplete.');
  }
  if (!stellar.adminSecret || !stellar.sponsorSecret) {
    throw new Error('Stellar configuration is incomplete.');
  }

  return new SorobanStellarClient(new Server(stellar.rpcUrl), {
    contractId: stellar.contractId,
    networkPassphrase: stellar.networkPassphrase,
    masterSecret: stellar.masterSecret,
    adminSecret: stellar.adminSecret,
    sponsorSecret: stellar.sponsorSecret,
  });
};

@Module({
  providers: [
    {
      provide: STELLAR_CLIENT,
      inject: [ConfigService],
      useFactory: createStellarClient,
    },
  ],
  exports: [STELLAR_CLIENT],
})
export class StellarModule {}
