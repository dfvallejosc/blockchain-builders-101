import { ContractError } from './contract-errors.js';
import { provisionIssuer } from './provision-issuer.js';
import type { StellarClient } from './stellar-client.js';

const buildClient = (): StellarClient => ({
  ensureIssuerAccount: vi.fn(),
  authorizeIssuer: vi.fn(),
  revokeIssuer: vi.fn(),
  registerCertificate: vi.fn(),
  annulCertificate: vi.fn(),
  getVerdict: vi.fn(),
  extendTtl: vi.fn(),
});

describe('provisionIssuer', () => {
  it('creates the account and authorizes an active issuer, in that order', async () => {
    const client = buildClient();

    await provisionIssuer(client, { id: 'issuer-1', revokedAt: null });

    expect(client.ensureIssuerAccount).toHaveBeenCalledWith('issuer-1');
    expect(client.authorizeIssuer).toHaveBeenCalledWith('issuer-1');
    expect(client.revokeIssuer).not.toHaveBeenCalled();
    expect(vi.mocked(client.ensureIssuerAccount).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(client.authorizeIssuer).mock.invocationCallOrder[0],
    );
  });

  it('never authorizes a revoked issuer', async () => {
    const client = buildClient();

    await provisionIssuer(client, { id: 'issuer-2', revokedAt: new Date() });

    expect(client.revokeIssuer).toHaveBeenCalledWith('issuer-2');
    expect(client.authorizeIssuer).not.toHaveBeenCalled();
    expect(client.ensureIssuerAccount).not.toHaveBeenCalled();
  });

  it('accepts a revoked issuer the contract has never seen', async () => {
    const client = buildClient();
    vi.mocked(client.revokeIssuer).mockRejectedValue(new ContractError(7));

    await expect(provisionIssuer(client, { id: 'issuer-3', revokedAt: new Date() })).resolves.toBeUndefined();
  });

  it('lets any other failure through', async () => {
    const client = buildClient();
    vi.mocked(client.revokeIssuer).mockRejectedValue(new ContractError(1));

    await expect(provisionIssuer(client, { id: 'issuer-4', revokedAt: new Date() })).rejects.toBeInstanceOf(
      ContractError,
    );
  });
});
