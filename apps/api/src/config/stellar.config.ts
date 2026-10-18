import { registerAs } from '@nestjs/config';
import type { RegistryDriverValue } from './env.validation.js';

export const stellarConfig = registerAs('stellar', () => ({
  driver: (process.env.REGISTRY_DRIVER ?? 'postgres') as RegistryDriverValue,
  rpcUrl: process.env.STELLAR_RPC_URL,
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE,
  contractId: process.env.STELLAR_CONTRACT_ID,
  masterSecret: process.env.STELLAR_MASTER_SECRET,
  adminSecret: process.env.STELLAR_ADMIN_SECRET,
  sponsorSecret: process.env.STELLAR_SPONSOR_SECRET,
}));
