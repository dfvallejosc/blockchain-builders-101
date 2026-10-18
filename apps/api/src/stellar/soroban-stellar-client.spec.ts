import {
  Account,
  Keypair,
  Networks,
  SorobanDataBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
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

// The shape the contract really returns: a struct whose unit-variant `verdict` is a one-element vector.
const statusScVal = (variant: string): xdr.ScVal =>
  xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('issuer'), val: xdr.ScVal.scvVoid() }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('valid_until'), val: nativeToScVal(0n, { type: 'u64' }) }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('verdict'),
      val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant)]),
    }),
  ]);

const restoreSimulation = {
  id: 'simulation',
  latestLedger: 10,
  events: [],
  _parsed: true as const,
  transactionData: new SorobanDataBuilder(),
  minResourceFee: '0',
  result: { auth: [], retval: nativeToScVal(null) },
  restorePreamble: { minResourceFee: '100', transactionData: new SorobanDataBuilder() },
};

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
      transactionData: new SorobanDataBuilder(),
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
  it.each([
    ['Valid', 'valid'],
    ['Expired', 'expired'],
    ['Annulled', 'annulled'],
    ['IssuerRevoked', 'issuer-revoked'],
    ['NotFound', 'not-found'],
  ])('maps the %s verdict of the decoded CertificateStatus struct', async (variant, expected) => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const queryContract = vi.fn(async () => ({ result: scValToNative(statusScVal(variant)) }));
    const client = new SorobanStellarClient({ ...server, queryContract } as never, config);

    await expect(client.getVerdict('00'.repeat(32))).resolves.toBe(expected);
    expect(queryContract).toHaveBeenCalledWith(
      contractId,
      'get_status',
      { fingerprint: Buffer.from('00'.repeat(32), 'hex') },
      Networks.TESTNET,
    );
  });

  it('accepts a verdict decoded as a plain tag object', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const queryContract = vi.fn(async () => ({ result: { verdict: { tag: 'Annulled' } } }));
    const client = new SorobanStellarClient({ ...server, queryContract } as never, config);

    await expect(client.getVerdict('00'.repeat(32))).resolves.toBe('annulled');
  });

  it.each([
    ['a bare string', 'Valid'],
    ['an unknown variant', { verdict: ['Mystery'] }],
    ['a number', { verdict: 42 }],
    ['an inherited property name', { verdict: ['constructor'] }],
  ])('fails closed instead of reading %s as not-found', async (_label, result) => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const queryContract = vi.fn(async () => ({ result }));
    const client = new SorobanStellarClient({ ...server, queryContract } as never, config);

    await expect(client.getVerdict('00'.repeat(32))).rejects.toBeInstanceOf(NetworkUnavailableError);
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
      result: { auth: [], retval: statusScVal('Valid') },
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
    server.getAccount.mockRejectedValueOnce(new Error('Account not found: GISSUER'));
    const client = new SorobanStellarClient(server as never, config);

    await expect(client.ensureIssuerAccount('new-issuer')).resolves.toBeUndefined();

    const transaction = server.sendTransaction.mock.calls[0]?.[0] as {
      operations: unknown[];
    };
    expect(transaction.operations).toHaveLength(3);
    expect(server.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('serializes concurrent missing-account provisioning through the sponsor queue', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const notFound = new Error('Account not found: GISSUER');
    const sponsor = Keypair.fromSecret(config.sponsorSecret).publicKey();
    server.getAccount.mockImplementation(async (publicKey: string) => {
      if (publicKey === sponsor) return new Account(sponsor, '1');
      throw notFound;
    });
    const client = new SorobanStellarClient(server as never, config);

    await Promise.all([
      client.ensureIssuerAccount('issuer-one'),
      client.ensureIssuerAccount('issuer-two'),
    ]);

    expect(server.sendTransaction).toHaveBeenCalledTimes(2);
    expect(server.getAccount).toHaveBeenCalledTimes(4);
  });

  it('refreshes the sponsor account after simulation before sending the write', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    const client = new SorobanStellarClient(server as never, config);

    await client.extendTtl('00'.repeat(32));

    expect(server.getAccount).toHaveBeenCalledTimes(2);
  });

  it('maps an immediate failed submission to its contract error code', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    server.sendTransaction.mockResolvedValueOnce({
      status: 'ERROR',
      hash: 'failed',
      errorResult: 'HostError: Error(Contract, #6)',
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
      resultXdr: 'HostError: Error(Contract, #5)',
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
    server.simulateTransaction.mockRejectedValue(new Error('rpc failure'));
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

  it('restores an archived write once, with consecutive sequences, and retries once', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    server.simulateTransaction.mockResolvedValueOnce(restoreSimulation as never);
    const client = new SorobanStellarClient(server as never, config);

    await client.extendTtl('00'.repeat(32));

    const sent = server.sendTransaction.mock.calls.map(([transaction]) => (transaction as { sequence: string }).sequence);
    // Every lookup returns the account at sequence 1, so the restore and the write both use 2, never 3.
    expect(sent).toEqual(['2', '2']);
    expect(server.simulateTransaction).toHaveBeenCalledTimes(2);
  });

  it('queues the restore that a read needs behind the writes already waiting', async () => {
    const config = createConfig();
    const server = createServer(config.sponsorSecret);
    server.simulateTransaction.mockResolvedValueOnce(restoreSimulation as never);
    server.simulateTransaction.mockResolvedValue({ ...restoreSimulation, restorePreamble: undefined, result: { auth: [], retval: statusScVal('Valid') } } as never);
    const client = new SorobanStellarClient(server as never, config);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    (client as unknown as { invokeWrite: () => Promise<string> }).invokeWrite = async () => {
      await gate;
      return 'write';
    };

    const write = client.extendTtl('00'.repeat(32));
    const verdict = client.getVerdict('11'.repeat(32));
    await new Promise((resolve) => setTimeout(resolve, 20));
    const sentWhileWriteIsRunning = server.sendTransaction.mock.calls.length;
    release();

    await Promise.all([write, verdict]);
    expect(sentWhileWriteIsRunning).toBe(0);
    expect(server.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('gives each queued write its own time budget from the moment it starts', async () => {
    vi.useFakeTimers();
    try {
      const config = createConfig();
      const server = createServer(config.sponsorSecret);
      const client = new SorobanStellarClient(server as never, config);
      const budgets: number[] = [];
      (client as unknown as { invokeWrite: (...args: unknown[]) => Promise<string> }).invokeWrite = async (
        _method,
        _args,
        _keypair,
        deadline,
      ) => {
        budgets.push((deadline as { expiresAt: number }).expiresAt - Date.now());
        await new Promise((resolve) => setTimeout(resolve, 15_000));
        return 'done';
      };

      const writes = Promise.all([
        client.extendTtl('00'.repeat(32)),
        client.extendTtl('11'.repeat(32)),
        client.extendTtl('22'.repeat(32)),
      ]);
      await vi.advanceTimersByTimeAsync(45_000);
      await writes;

      expect(budgets).toEqual([20_000, 20_000, 20_000]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('maps only the real contract error form to a ContractError', () => {
    const config = createConfig();
    const client = new SorobanStellarClient(createServer(config.sponsorSecret) as never, config);
    const internal = client as unknown as { contractOrNetworkError: (message: string) => Error };

    const error = internal.contractOrNetworkError('HostError: Error(Contract, #4)');

    expect(error).toBeInstanceOf(ContractError);
    expect((error as ContractError).code).toBe(4);
  });

  it.each([
    'txBadSeq',
    'insufficient fee, minimum 4500',
    'budget exceeded after 4 retries',
    'error code 4',
    'contract 4 failed',
    'HostError: Error(Contract, #9)',
  ])('does not read a contract code out of "%s"', (message) => {
    const config = createConfig();
    const client = new SorobanStellarClient(createServer(config.sponsorSecret) as never, config);
    const internal = client as unknown as { contractOrNetworkError: (message: string) => Error };

    expect(internal.contractOrNetworkError(message)).toBeInstanceOf(NetworkUnavailableError);
  });
});
