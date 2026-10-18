import {
  Account,
  Keypair,
  Networks,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';

import { ContractError, NetworkUnavailableError } from './contract-errors.js';
import { SorobanStellarClient } from './soroban-stellar-client.js';

const contractId = 'CAPRNQ7LVZWH47D4ZBDKY2OUICZ5FULE223IRWTOJR3HLR6ZEBAD3GPD';

const createConfig = () => ({
  contractId,
  networkPassphrase: Networks.TESTNET,
  masterSecret: 'task-seven-master-secret',
  adminSecret: Keypair.random().secret(),
  sponsorSecret: Keypair.random().secret(),
});

const createServer = (sponsorSecret: string) => {
  const sponsor = Keypair.fromSecret(sponsorSecret);
  const calls: string[] = [];
  let transactionCount = 0;
  return {
    calls,
    getAccount: vi.fn(async () => new Account(sponsor.publicKey(), '1')),
    simulateTransaction: vi.fn(async () => ({
      id: 'simulation',
      latestLedger: 10,
      events: [],
      _parsed: true as const,
      transactionData: {} as never,
      minResourceFee: '0',
      result: {
        auth: [],
        retval: nativeToScVal(null),
      },
    })),
    sendTransaction: vi.fn(async () => {
      calls.push(`send-${++transactionCount}`);
      return {
        status: 'PENDING' as const,
        hash: `hash-${transactionCount}`,
        latestLedger: 10,
        latestLedgerCloseTime: 0,
      };
    }),
    getTransaction: vi.fn(async (hash: string) => ({
      status: 'SUCCESS' as const,
      hash,
      ledger: 10,
      createdAt: 0,
      applicationOrder: 1,
      envelopeXdr: '',
      resultXdr: '',
      resultMetaXdr: '',
      fee: '0',
    })),
  };
};

describe('SorobanStellarClient', () => {
  it('serializes concurrent writes through the sponsor account', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const client = new SorobanStellarClient(server as never, config);
    const order: string[] = [];
    const internal = client as unknown as {
      invokeWrite: (method: string) => Promise<string>;
    };
    internal.invokeWrite = vi.fn(async (method: string) => {
      order.push(method);
      return method;
    });

    await Promise.all([
      client.extendTtl('00'.repeat(32)),
      client.extendTtl('11'.repeat(32)),
    ]);

    expect(order).toEqual(['extend_ttl', 'extend_ttl']);
  });

  it('keeps contract and network errors free of configured secrets', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    server.simulateTransaction.mockRejectedValueOnce(new Error('rpc failure'));
    const client = new SorobanStellarClient(server as never, config);

    await expect(client.extendTtl('00'.repeat(32))).rejects.toBeInstanceOf(
      NetworkUnavailableError,
    );
    await expect(client.extendTtl('00'.repeat(32))).rejects.not.toThrow(
      config.sponsorSecret,
    );
    expect(new ContractError(4).message).not.toContain(config.adminSecret);
  });

  it('rejects a request that never confirms after the network timeout', async () => {
    vi.useFakeTimers();
    try {
      const config = createConfig();
      const server = createServer(config.sponsorSecret);
      server.getAccount.mockImplementation(
        async () => await new Promise<never>(() => undefined),
      );
      server.getTransaction.mockImplementation(
        async () => await new Promise<never>(() => undefined),
      );
      const client = new SorobanStellarClient(server as never, config);
      const request = client.ensureIssuerAccount('issuer-timeout');
      const assertion = expect(request).rejects.toBeInstanceOf(
        NetworkUnavailableError,
      );
      await vi.advanceTimersByTimeAsync(20_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('restores an archived simulation once and retries once', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const simulation = {
      id: 'simulation',
      latestLedger: 10,
      events: [],
      _parsed: true as const,
      transactionData: {} as never,
      minResourceFee: '0',
      result: { auth: [], retval: nativeToScVal(null) },
    };
    server.simulateTransaction
      .mockResolvedValueOnce({ error: 'archived footprint' } as never)
      .mockResolvedValueOnce(simulation);
    const restoreFootprint = vi.fn(async () => undefined);
    const client = new SorobanStellarClient(
      { ...server, restoreFootprint } as never,
      config,
    );
    const internal = client as unknown as {
      simulateTransaction: (
        transaction: never,
        restore: boolean,
      ) => Promise<unknown>;
    };

    await internal.simulateTransaction({} as never, true);

    expect(restoreFootprint).toHaveBeenCalledTimes(1);
    expect(server.simulateTransaction).toHaveBeenCalledTimes(2);
  });

  it('maps a simulated contract code to ContractError', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const client = new SorobanStellarClient(server as never, config);
    const internal = client as unknown as {
      contractOrNetworkError: (message: string) => Error;
    };

    const error = internal.contractOrNetworkError(
      'HostError: contract error code 4',
    );

    expect(error).toBeInstanceOf(ContractError);
    expect((error as ContractError).code).toBe(4);
  });
});
