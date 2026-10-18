import {
  Account,
  Keypair,
  Networks,
  SorobanDataBuilder,
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
  it('maps the decoded CertificateStatus struct returned by queryContract', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const queryContract = vi.fn(async () => ({
      result: { verdict: 'IssuerRevoked', issuer: 'G...', valid_until: 1n },
    }));
    const client = new SorobanStellarClient(
      { ...server, queryContract } as never,
      config,
    );

    await expect(client.getVerdict('00'.repeat(32))).resolves.toBe(
      'issuer-revoked',
    );
    expect(queryContract).toHaveBeenCalledWith(
      contractId,
      'get_status',
      { fingerprint: Buffer.from('00'.repeat(32), 'hex') },
      Networks.TESTNET,
    );
  });

  it('falls back to simulation when queryContract reports an archived footprint', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const queryContract = vi.fn(async () => {
      throw new Error('archived footprint');
    });
    server.simulateTransaction.mockResolvedValueOnce({
      id: 'simulation',
      latestLedger: 10,
      events: [],
      _parsed: true as const,
      transactionData: {} as never,
      minResourceFee: '0',
      result: { auth: [], retval: nativeToScVal('Valid') },
    });
    const client = new SorobanStellarClient(
      { ...server, queryContract } as never,
      config,
    );

    await expect(client.getVerdict('00'.repeat(32))).resolves.toBe('valid');
    expect(queryContract).toHaveBeenCalledTimes(1);
    expect(server.simulateTransaction).toHaveBeenCalledTimes(1);
  });

  it('creates and sponsors a missing issuer account with the three Stellar operations', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const notFound = Object.assign(new Error('missing account'), {
      response: { status: 404 },
    });
    server.getAccount.mockRejectedValueOnce(notFound);
    const client = new SorobanStellarClient(server as never, config);

    await expect(client.ensureIssuerAccount('new-issuer')).resolves.toBeUndefined();

    const transaction = server.sendTransaction.mock.calls[0]?.[0] as {
      operations: unknown[];
    };
    expect(transaction.operations).toHaveLength(3);
    expect(server.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('maps an immediate failed submission to its contract error code', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    server.sendTransaction.mockResolvedValueOnce({
      status: 'ERROR',
      hash: 'failed',
      errorResult: 'contract error code 6',
    } as never);
    const client = new SorobanStellarClient(server as never, config);

    const internal = client as unknown as {
      submitAndConfirm: (
        transaction: never,
        deadline: { expiresAt: number },
      ) => Promise<string>;
    };
    await expect(
      internal.submitAndConfirm({} as never, { expiresAt: Date.now() + 20_000 }),
    ).rejects.toMatchObject({ code: 6 });
  });

  it('maps a failed confirmed transaction from resultXdr and diagnostics', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    server.getTransaction.mockResolvedValueOnce({
      status: 'FAILED',
      resultXdr: 'contract error code 5',
      diagnosticEventsXdr: [],
    } as never);
    const client = new SorobanStellarClient(server as never, config);
    const internal = client as unknown as {
      waitForConfirmation: (
        hash: string,
        deadline: { expiresAt: number },
      ) => Promise<string>;
    };

    await expect(
      internal.waitForConfirmation('failed-hash', {
        expiresAt: Date.now() + 20_000,
      }),
    ).rejects.toMatchObject({ code: 5 });
  });

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
      .mockResolvedValueOnce({
        ...simulation,
        restorePreamble: {
          minResourceFee: '100',
          transactionData: new SorobanDataBuilder(),
        },
      } as never)
      .mockResolvedValueOnce(simulation);
    const client = new SorobanStellarClient(server as never, config);
    const internal = client as unknown as {
      simulateTransaction: (
        transaction: never,
        account: Account,
        deadline: { expiresAt: number },
      ) => Promise<unknown>;
    };

    await internal.simulateTransaction(
      {} as never,
      new Account(Keypair.random().publicKey(), '1'),
      { expiresAt: Date.now() + 20_000 },
    );

    expect(server.sendTransaction).toHaveBeenCalledTimes(1);
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
