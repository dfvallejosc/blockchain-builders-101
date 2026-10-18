import {
  authorizeEntry,
  Contract,
  Keypair,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  type Account,
  type Transaction,
} from '@stellar/stellar-sdk';
import { assembleTransaction } from '@stellar/stellar-sdk/rpc';
import type { Server, Api } from '@stellar/stellar-sdk/rpc';

import type { RegistryVerdict } from '../certificates/certificate-registry.js';
import { ContractError, NetworkUnavailableError } from './contract-errors.js';
import { deriveIssuerKeypair } from './issuer-keys.js';
import type { StellarClient } from './stellar-client.js';

export const NETWORK_TIMEOUT_MS = 20_000;

interface StellarConfig {
  contractId: string;
  networkPassphrase: string;
  masterSecret: string;
  adminSecret: string;
  sponsorSecret: string;
}

interface TransactionResponse {
  status: string;
  hash?: string;
  errorResultXdr?: string;
}

type ServerWithRestore = Server & {
  restoreFootprint?: (transaction: Transaction) => Promise<unknown>;
  queryContract?: <T>(
    contractId: string,
    method: string,
    args?: Record<string, unknown>,
    networkPassphrase?: string,
  ) => Promise<{ result: T }>;
};

const SUCCESS = 'SUCCESS';
const FAILED = 'FAILED';

export class SorobanStellarClient implements StellarClient {
  private readonly contract: Contract;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly server: ServerWithRestore,
    private readonly config: StellarConfig,
  ) {
    this.contract = new Contract(config.contractId);
  }

  async ensureIssuerAccount(issuerId: string): Promise<void> {
    const keypair = deriveIssuerKeypair(this.config.masterSecret, issuerId);
    try {
      await this.withTimeout(this.server.getAccount(keypair.publicKey()));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  authorizeIssuer(issuerId: string): Promise<string> {
    return this.enqueueWrite(() =>
      this.invokeWrite(
        'authorize_issuer',
        [
          nativeToScVal(
            deriveIssuerKeypair(this.config.masterSecret, issuerId).publicKey(),
            {
              type: 'address',
            },
          ),
        ],
        this.adminKeypair(),
      ),
    );
  }

  revokeIssuer(issuerId: string): Promise<string> {
    return this.enqueueWrite(() =>
      this.invokeWrite(
        'revoke_issuer',
        [
          nativeToScVal(
            deriveIssuerKeypair(this.config.masterSecret, issuerId).publicKey(),
            {
              type: 'address',
            },
          ),
        ],
        this.adminKeypair(),
      ),
    );
  }

  registerCertificate(input: {
    issuerId: string;
    fingerprint: string;
    validUntil: number;
  }): Promise<string> {
    return this.enqueueWrite(() =>
      this.invokeWrite(
        'register',
        [
          nativeToScVal(
            deriveIssuerKeypair(
              this.config.masterSecret,
              input.issuerId,
            ).publicKey(),
            {
              type: 'address',
            },
          ),
          nativeToScVal(Buffer.from(input.fingerprint, 'hex'), {
            type: 'bytes',
          }),
          nativeToScVal(BigInt(input.validUntil), { type: 'u64' }),
        ],
        this.issuerKeypair(input.issuerId),
      ),
    );
  }

  annulCertificate(input: {
    issuerId: string;
    fingerprint: string;
  }): Promise<string> {
    return this.enqueueWrite(() =>
      this.invokeWrite(
        'annul',
        [
          nativeToScVal(
            deriveIssuerKeypair(
              this.config.masterSecret,
              input.issuerId,
            ).publicKey(),
            {
              type: 'address',
            },
          ),
          nativeToScVal(Buffer.from(input.fingerprint, 'hex'), {
            type: 'bytes',
          }),
        ],
        this.issuerKeypair(input.issuerId),
      ),
    );
  }

  async getVerdict(fingerprint: string): Promise<RegistryVerdict> {
    try {
      if (this.server.queryContract) {
        const response = await this.withTimeout(
          this.server.queryContract<string>(
            this.config.contractId,
            'get_status',
            { fingerprint: Buffer.from(fingerprint, 'hex') },
            this.config.networkPassphrase,
          ),
        );
        return this.mapVerdict(response.result);
      }
      const simulation = await this.simulate('get_status', [
        nativeToScVal(Buffer.from(fingerprint, 'hex'), { type: 'bytes' }),
      ]);
      if (!('result' in simulation) || !simulation.result) {
        throw new NetworkUnavailableError();
      }
      return this.mapVerdict(scValToNative(simulation.result.retval));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  extendTtl(fingerprint: string): Promise<string> {
    return this.enqueueWrite(() =>
      this.invokeWrite(
        'extend_ttl',
        [nativeToScVal(Buffer.from(fingerprint, 'hex'), { type: 'bytes' })],
        this.sponsorKeypair(),
      ),
    );
  }

  private enqueueWrite(operation: () => Promise<string>): Promise<string> {
    const next = this.writeChain.then(operation, operation);
    this.writeChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async invokeWrite(
    method: string,
    args: xdr.ScVal[],
    authKeypair: Keypair,
  ): Promise<string> {
    try {
      const account = await this.withTimeout(
        this.server.getAccount(this.sponsorKeypair().publicKey()),
      );
      const transaction = this.buildTransaction(account, method, args);
      const simulation = await this.simulateTransaction(transaction, true);
      const auth = await this.signAuth(simulation, authKeypair);
      const authorized = this.buildTransaction(account, method, args, auth);
      const assembled = assembleTransaction(authorized, simulation).build();
      assembled.sign(this.sponsorKeypair());
      const response = await this.withTimeout(
        this.server.sendTransaction(assembled),
      );
      return this.waitForConfirmation(response.hash);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private async simulate(
    method: string,
    args: xdr.ScVal[],
  ): Promise<Api.SimulateTransactionResponse> {
    const account = await this.withTimeout(
      this.server.getAccount(this.sponsorKeypair().publicKey()),
    );
    return this.simulateTransaction(
      this.buildTransaction(account, method, args),
      false,
    );
  }

  private async simulateTransaction(
    transaction: Transaction,
    restore: boolean,
  ): Promise<Api.SimulateTransactionResponse> {
    let simulation = await this.withTimeout(
      this.server.simulateTransaction(transaction),
    );
    if ('error' in simulation && /archiv|footprint/i.test(simulation.error)) {
      if (!restore || !this.server.restoreFootprint)
        throw new NetworkUnavailableError();
      await this.withTimeout(this.server.restoreFootprint(transaction));
      simulation = await this.withTimeout(
        this.server.simulateTransaction(transaction),
      );
    }
    if ('error' in simulation)
      throw this.contractOrNetworkError(simulation.error);
    if (!simulation.result) throw new NetworkUnavailableError();
    return simulation;
  }

  private async signAuth(
    simulation: Api.SimulateTransactionResponse,
    keypair: Keypair,
  ): Promise<xdr.SorobanAuthorizationEntry[] | undefined> {
    if (!('result' in simulation) || !simulation.result) return undefined;
    if (!simulation.result.auth.length) return undefined;
    const expiration = simulation.latestLedger + 100;
    return Promise.all(
      simulation.result.auth.map((entry) =>
        authorizeEntry(
          entry,
          keypair,
          expiration,
          this.config.networkPassphrase,
        ),
      ),
    );
  }

  private buildTransaction(
    account: Account,
    method: string,
    args: xdr.ScVal[],
    auth?: xdr.SorobanAuthorizationEntry[],
  ): Transaction {
    return new TransactionBuilder(account, { fee: '100' })
      .setNetworkPassphrase(this.config.networkPassphrase)
      .setTimeout(30)
      .addOperation(
        Operation.invokeContractFunction({
          contract: this.config.contractId,
          function: method,
          args,
          auth,
        }),
      )
      .build();
  }

  private async waitForConfirmation(hash: string): Promise<string> {
    const started = Date.now();
    while (Date.now() - started < NETWORK_TIMEOUT_MS) {
      const response = (await this.withTimeout(
        this.server.getTransaction(hash),
      )) as TransactionResponse;
      if (response.status === SUCCESS) return hash;
      if (response.status === FAILED) {
        throw this.contractOrNetworkError(
          response.errorResultXdr ?? 'transaction failed',
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new NetworkUnavailableError();
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new NetworkUnavailableError()),
          NETWORK_TIMEOUT_MS,
        ),
      ),
    ]);
  }

  private contractOrNetworkError(message: string): Error {
    const match = message.match(/(?:error|code|contract)[^0-9]*([0-9]+)/i);
    return match
      ? new ContractError(Number(match[1]))
      : new NetworkUnavailableError();
  }

  private mapError(error: unknown): Error {
    if (
      error instanceof ContractError ||
      error instanceof NetworkUnavailableError
    )
      return error;
    return new NetworkUnavailableError();
  }

  private mapVerdict(value: unknown): RegistryVerdict {
    const normalized = String(value).toLowerCase().replace(/[_-]/g, '');
    if (normalized.includes('issuerrevoked')) return 'issuer-revoked';
    if (normalized.includes('annulled')) return 'annulled';
    if (normalized.includes('expired')) return 'expired';
    if (normalized.includes('valid')) return 'valid';
    return 'not-found';
  }

  private sponsorKeypair(): Keypair {
    return Keypair.fromSecret(this.config.sponsorSecret);
  }

  private adminKeypair(): Keypair {
    return Keypair.fromSecret(this.config.adminSecret);
  }

  private issuerKeypair(issuerId: string): Keypair {
    return deriveIssuerKeypair(this.config.masterSecret, issuerId);
  }
}
