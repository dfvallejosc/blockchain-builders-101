import {
  authorizeEntry,
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
import { Api, type Server } from '@stellar/stellar-sdk/rpc';

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

interface Deadline {
  readonly expiresAt: number;
}

type QueryServer = Server & {
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
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly server: QueryServer,
    private readonly config: StellarConfig,
  ) {
  }

  async ensureIssuerAccount(issuerId: string): Promise<void> {
    await this.enqueueWrite(async (deadline) => {
      const issuer = this.issuerKeypair(issuerId);
      try {
        await this.withTimeout(this.server.getAccount(issuer.publicKey()), deadline);
        return undefined;
      } catch (error) {
        if (!this.isAccountNotFound(error)) throw this.mapError(error);
      }

      try {
        const sponsor = await this.withTimeout(
          this.server.getAccount(this.sponsorKeypair().publicKey()),
          deadline,
        );
        const transaction = new TransactionBuilder(sponsor, { fee: '100' })
          .setNetworkPassphrase(this.config.networkPassphrase)
          .setTimeout(30)
          .addOperation(
            Operation.beginSponsoringFutureReserves({ sponsoredId: issuer.publicKey() }),
          )
          .addOperation(
            Operation.createAccount({ destination: issuer.publicKey(), startingBalance: '0' }),
          )
          .addOperation(
            Operation.endSponsoringFutureReserves({ source: issuer.publicKey() }),
          )
          .build();
        transaction.sign(this.sponsorKeypair(), issuer);
        await this.submitAndConfirm(transaction, deadline);
      } catch (error) {
        throw this.mapError(error);
      }
      return undefined;
    });
  }

  authorizeIssuer(issuerId: string): Promise<string> {
    return this.enqueueWrite((deadline) =>
      this.invokeWrite(
        'authorize_issuer',
        [nativeToScVal(this.issuerKeypair(issuerId).publicKey(), { type: 'address' })],
        this.adminKeypair(),
        deadline,
      ),
    );
  }

  revokeIssuer(issuerId: string): Promise<string> {
    return this.enqueueWrite((deadline) =>
      this.invokeWrite(
        'revoke_issuer',
        [nativeToScVal(this.issuerKeypair(issuerId).publicKey(), { type: 'address' })],
        this.adminKeypair(),
        deadline,
      ),
    );
  }

  registerCertificate(input: { issuerId: string; fingerprint: string; validUntil: number }): Promise<string> {
    return this.enqueueWrite((deadline) =>
      this.invokeWrite(
        'register',
        [
          nativeToScVal(this.issuerKeypair(input.issuerId).publicKey(), { type: 'address' }),
          nativeToScVal(Buffer.from(input.fingerprint, 'hex'), { type: 'bytes' }),
          nativeToScVal(BigInt(input.validUntil), { type: 'u64' }),
        ],
        this.issuerKeypair(input.issuerId),
        deadline,
      ),
    );
  }

  annulCertificate(input: { issuerId: string; fingerprint: string }): Promise<string> {
    return this.enqueueWrite((deadline) =>
      this.invokeWrite(
        'annul',
        [
          nativeToScVal(this.issuerKeypair(input.issuerId).publicKey(), { type: 'address' }),
          nativeToScVal(Buffer.from(input.fingerprint, 'hex'), { type: 'bytes' }),
        ],
        this.issuerKeypair(input.issuerId),
        deadline,
      ),
    );
  }

  async getVerdict(fingerprint: string): Promise<RegistryVerdict> {
    const deadline = this.createDeadline();
    try {
      if (this.server.queryContract) {
        try {
          const response = await this.withTimeout(
            this.server.queryContract<{ verdict: unknown }>(
              this.config.contractId,
              'get_status',
              { fingerprint: Buffer.from(fingerprint, 'hex') },
              this.config.networkPassphrase,
            ),
            deadline,
          );
          return this.mapVerdict(response.result.verdict);
        } catch (error) {
          if (!/archiv|footprint/i.test(String(error))) throw error;
        }
      }
      const simulation = await this.simulate(
        'get_status',
        [nativeToScVal(Buffer.from(fingerprint, 'hex'), { type: 'bytes' })],
        deadline,
      );
      if (!Api.isSimulationSuccess(simulation) || !simulation.result)
        throw new NetworkUnavailableError();
      return this.mapVerdict(scValToNative(simulation.result.retval));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  extendTtl(fingerprint: string): Promise<string> {
    return this.enqueueWrite((deadline) =>
      this.invokeWrite(
        'extend_ttl',
        [nativeToScVal(Buffer.from(fingerprint, 'hex'), { type: 'bytes' })],
        this.sponsorKeypair(),
        deadline,
      ),
    );
  }

  private enqueueWrite<T>(operation: (deadline: Deadline) => Promise<T>): Promise<T> {
    const deadline = this.createDeadline();
    const next = this.writeChain.then(() => operation(deadline), () => operation(deadline));
    this.writeChain = next.then(() => undefined, () => undefined);
    return next;
  }

  private async invokeWrite(method: string, args: xdr.ScVal[], authKeypair: Keypair, deadline: Deadline): Promise<string> {
    try {
      const account = await this.withTimeout(
        this.server.getAccount(this.sponsorKeypair().publicKey()),
        deadline,
      );
      const transaction = this.buildTransaction(account, method, args);
      const simulation = await this.simulateTransaction(transaction, account, deadline);
      const auth = await this.signAuth(simulation, authKeypair);
      const currentAccount = await this.withTimeout(
        this.server.getAccount(this.sponsorKeypair().publicKey()),
        deadline,
      );
      const authorized = this.buildTransaction(currentAccount, method, args, auth);
      const assembled = assembleTransaction(authorized, simulation).build();
      assembled.sign(this.sponsorKeypair());
      return this.submitAndConfirm(assembled, deadline);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private async simulate(method: string, args: xdr.ScVal[], deadline: Deadline): Promise<Api.SimulateTransactionResponse> {
    const account = await this.withTimeout(
      this.server.getAccount(this.sponsorKeypair().publicKey()),
      deadline,
    );
    return this.simulateTransaction(this.buildTransaction(account, method, args), account, deadline);
  }

  private async simulateTransaction(transaction: Transaction, account: Account, deadline: Deadline): Promise<Api.SimulateTransactionResponse> {
    let simulation = await this.withTimeout(this.server.simulateTransaction(transaction), deadline);
    if (Api.isSimulationRestore(simulation)) {
      await this.restoreFootprint(account, simulation.restorePreamble, deadline);
      simulation = await this.withTimeout(this.server.simulateTransaction(transaction), deadline);
    }
    if ('error' in simulation) throw this.contractOrNetworkError(simulation.error);
    if (!simulation.result) throw new NetworkUnavailableError();
    return simulation;
  }

  private async restoreFootprint(account: Account, preamble: Api.SimulateTransactionRestoreResponse['restorePreamble'], deadline: Deadline): Promise<void> {
    const transaction = new TransactionBuilder(account, { fee: preamble.minResourceFee })
      .setNetworkPassphrase(this.config.networkPassphrase)
      .setSorobanData(preamble.transactionData.build())
      .setTimeout(30)
      .addOperation(Operation.restoreFootprint())
      .build();
    transaction.sign(this.sponsorKeypair());
    await this.submitAndConfirm(transaction, deadline);
  }

  private async signAuth(simulation: Api.SimulateTransactionResponse, keypair: Keypair): Promise<xdr.SorobanAuthorizationEntry[] | undefined> {
    if (!Api.isSimulationSuccess(simulation) || !simulation.result?.auth.length)
      return undefined;
    const expiration = simulation.latestLedger + 100;
    return Promise.all(simulation.result.auth.map((entry) => authorizeEntry(entry, keypair, expiration, this.config.networkPassphrase)));
  }

  private buildTransaction(account: Account, method: string, args: xdr.ScVal[], auth?: xdr.SorobanAuthorizationEntry[]): Transaction {
    return new TransactionBuilder(account, { fee: '100' })
      .setNetworkPassphrase(this.config.networkPassphrase)
      .setTimeout(30)
      .addOperation(Operation.invokeContractFunction({ contract: this.config.contractId, function: method, args, auth }))
      .build();
  }

  private async submitAndConfirm(transaction: Transaction, deadline: Deadline): Promise<string> {
    const response = await this.withTimeout(this.server.sendTransaction(transaction), deadline);
    if (response.status === 'ERROR') throw this.contractOrNetworkError([response.errorResult, response.diagnosticEvents]);
    if (response.status !== 'PENDING') throw new NetworkUnavailableError();
    return this.waitForConfirmation(response.hash, deadline);
  }

  private async waitForConfirmation(hash: string, deadline: Deadline): Promise<string> {
    while (this.remaining(deadline) > 0) {
      const response = await this.withTimeout(this.server.getTransaction(hash), deadline);
      if (response.status === SUCCESS) return hash;
      if (response.status === FAILED) throw this.contractOrNetworkError([response.resultXdr, response.diagnosticEventsXdr, response.events]);
      await this.withTimeout(new Promise<void>((resolve) => setTimeout(resolve, 250)), deadline);
    }
    throw new NetworkUnavailableError();
  }

  private createDeadline(): Deadline { return { expiresAt: Date.now() + NETWORK_TIMEOUT_MS }; }

  private remaining(deadline: Deadline): number { return Math.max(0, deadline.expiresAt - Date.now()); }

  private withTimeout<T>(promise: Promise<T>, deadline: Deadline): Promise<T> {
    const remaining = this.remaining(deadline);
    if (!remaining) return Promise.reject(new NetworkUnavailableError());
    let timer: ReturnType<typeof setTimeout> | undefined;
    return new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => reject(new NetworkUnavailableError()), remaining);
      promise.then(
        (value) => { if (timer) clearTimeout(timer); resolve(value); },
        (error: unknown) => { if (timer) clearTimeout(timer); reject(error); },
      );
    });
  }

  private contractOrNetworkError(value: unknown): Error {
    const message = this.errorText(value);
    const match = message.match(/(?:error|code|contract)[^0-9]*([0-9]+)/i);
    return match ? new ContractError(Number(match[1])) : new NetworkUnavailableError();
  }

  private errorText(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, (_, nested) => typeof nested === 'bigint' ? nested.toString() : nested);
    } catch { return ''; }
  }

  private mapError(error: unknown): Error {
    if (error instanceof ContractError || error instanceof NetworkUnavailableError) return error;
    return new NetworkUnavailableError();
  }

  private isAccountNotFound(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const response = 'response' in error && error.response && typeof error.response === 'object' ? error.response : undefined;
    const status = response && 'status' in response ? response.status : undefined;
    return status === 404;
  }

  private mapVerdict(value: unknown): RegistryVerdict {
    const normalized = String(value).toLowerCase().replace(/[_-]/g, '');
    if (normalized.includes('issuerrevoked')) return 'issuer-revoked';
    if (normalized.includes('annulled')) return 'annulled';
    if (normalized.includes('expired')) return 'expired';
    if (normalized.includes('valid')) return 'valid';
    return 'not-found';
  }

  private sponsorKeypair(): Keypair { return Keypair.fromSecret(this.config.sponsorSecret); }
  private adminKeypair(): Keypair { return Keypair.fromSecret(this.config.adminSecret); }
  private issuerKeypair(issuerId: string): Keypair { return deriveIssuerKeypair(this.config.masterSecret, issuerId); }
}
