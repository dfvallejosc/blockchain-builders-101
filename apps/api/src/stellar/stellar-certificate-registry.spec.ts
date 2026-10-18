import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Certificate } from '../certificates/certificate.entity.js';
import {
  CertificateAlreadyAnnulledError,
  type RegistryEntry,
  type RegistryStatus,
} from '../certificates/certificate-registry.js';
import { ContractError, NetworkUnavailableError } from './contract-errors.js';
import type { StellarClient } from './stellar-client.js';
import { StellarCertificateRegistry } from './stellar-certificate-registry.js';

const entry: RegistryEntry = {
  certificateId: 'certificate-123',
  issuerId: 'issuer-456',
  fingerprint: 'a'.repeat(64),
  issuedAt: '2026-10-17',
  validUntil: '2026-10-19',
};

const status: RegistryStatus = { ...entry, annulled: false };

const buildClient = (): StellarClient => ({
  ensureIssuerAccount: vi.fn(),
  authorizeIssuer: vi.fn(),
  revokeIssuer: vi.fn(),
  registerCertificate: vi.fn(),
  annulCertificate: vi.fn(),
  getVerdict: vi.fn(),
  extendTtl: vi.fn(),
});

const buildPostgres = () => ({
  register: vi.fn(),
  annul: vi.fn(),
  authorizeIssuer: vi.fn(),
  revokeIssuer: vi.fn(),
  getStatus: vi.fn(),
  getVerdict: vi.fn(),
  extendTtl: vi.fn(),
});

const buildRepository = (certificate: Partial<Certificate> | null = entry) => ({
  findOne: vi.fn().mockResolvedValue(certificate),
});

describe('StellarCertificateRegistry', () => {
  it('registers on Stellar before delegating to PostgreSQL with Bogotá end of day', async () => {
    const client = buildClient();
    const postgres = buildPostgres();
    const registry = new StellarCertificateRegistry(
      postgres,
      client,
      buildRepository() as unknown as Repository<Certificate>,
    );

    await registry.register(entry);

    expect(client.registerCertificate).toHaveBeenCalledWith({
      issuerId: entry.issuerId,
      fingerprint: entry.fingerprint,
      validUntil: Date.UTC(2026, 9, 20, 4, 59, 59) / 1000,
    });
    expect(postgres.register).toHaveBeenCalledWith(entry);
    expect(vi.mocked(client.registerCertificate).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(postgres.register).mock.invocationCallOrder[0],
    );
  });

  it('does not write locally when Stellar registration is unavailable', async () => {
    const client = buildClient();
    const postgres = buildPostgres();
    vi.mocked(client.registerCertificate).mockRejectedValue(
      new NetworkUnavailableError(),
    );
    const registry = new StellarCertificateRegistry(
      postgres,
      client,
      buildRepository() as unknown as Repository<Certificate>,
    );

    await expect(registry.register(entry)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(postgres.register).not.toHaveBeenCalled();
  });

  it('annuls on Stellar before PostgreSQL', async () => {
    const client = buildClient();
    const postgres = buildPostgres();
    const registry = new StellarCertificateRegistry(
      postgres,
      client,
      buildRepository({
        id: entry.certificateId,
        issuerId: entry.issuerId,
        fingerprint: entry.fingerprint,
        annulledAt: null,
      }) as unknown as Repository<Certificate>,
    );

    await registry.annul(entry.certificateId);

    expect(client.annulCertificate).toHaveBeenCalledWith({
      issuerId: entry.issuerId,
      fingerprint: entry.fingerprint,
    });
    expect(postgres.annul).toHaveBeenCalledWith(entry.certificateId);
  });

  it('repairs an active local row when Stellar reports AlreadyAnnulled', async () => {
    const client = buildClient();
    const postgres = buildPostgres();
    vi.mocked(client.annulCertificate).mockRejectedValue(new ContractError(4));
    const registry = new StellarCertificateRegistry(
      postgres,
      client,
      buildRepository({
        id: entry.certificateId,
        issuerId: entry.issuerId,
        fingerprint: entry.fingerprint,
        annulledAt: null,
      }) as unknown as Repository<Certificate>,
    );

    await expect(registry.annul(entry.certificateId)).resolves.toBeUndefined();
    expect(postgres.annul).toHaveBeenCalledWith(entry.certificateId);
  });

  it('preserves the local already-annulled conflict during repair', async () => {
    const client = buildClient();
    const postgres = buildPostgres();
    vi.mocked(client.annulCertificate).mockRejectedValue(new ContractError(4));
    vi.mocked(postgres.annul).mockRejectedValue(
      new CertificateAlreadyAnnulledError(),
    );
    const registry = new StellarCertificateRegistry(
      postgres,
      client,
      buildRepository({
        id: entry.certificateId,
        issuerId: entry.issuerId,
        fingerprint: entry.fingerprint,
        annulledAt: null,
      }) as unknown as Repository<Certificate>,
    );

    await expect(registry.annul(entry.certificateId)).rejects.toBeInstanceOf(
      CertificateAlreadyAnnulledError,
    );
  });

  it('authorizes after ensuring the issuer account exists', async () => {
    const client = buildClient();
    const registry = new StellarCertificateRegistry(
      buildPostgres(),
      client,
      buildRepository() as unknown as Repository<Certificate>,
    );

    await registry.authorizeIssuer(entry.issuerId);

    expect(client.ensureIssuerAccount).toHaveBeenCalledWith(entry.issuerId);
    expect(client.authorizeIssuer).toHaveBeenCalledWith(entry.issuerId);
    expect(vi.mocked(client.ensureIssuerAccount).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(client.authorizeIssuer).mock.invocationCallOrder[0],
    );
  });

  it('maps an unknown issuer revocation error instead of treating it as success', async () => {
    const client = buildClient();
    vi.mocked(client.revokeIssuer).mockResolvedValue('hash-1');
    const registry = new StellarCertificateRegistry(
      buildPostgres(),
      client,
      buildRepository() as unknown as Repository<Certificate>,
    );

    await expect(registry.revokeIssuer(entry.issuerId)).resolves.toBeUndefined();

    vi.mocked(client.revokeIssuer).mockRejectedValue(new ContractError(7));
    await expect(registry.revokeIssuer(entry.issuerId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('gets the verdict from Stellar and status from PostgreSQL', async () => {
    const client = buildClient();
    const postgres = buildPostgres();
    vi.mocked(client.getVerdict).mockResolvedValue('valid');
    vi.mocked(postgres.getStatus).mockResolvedValue(status);
    const registry = new StellarCertificateRegistry(
      postgres,
      client,
      buildRepository() as unknown as Repository<Certificate>,
    );

    await expect(registry.getVerdict(entry.fingerprint)).resolves.toBe('valid');
    await expect(registry.getStatus(entry.certificateId)).resolves.toEqual(
      status,
    );
    expect(postgres.getVerdict).not.toHaveBeenCalled();
  });

  it('looks up the fingerprint before extending its network TTL', async () => {
    const client = buildClient();
    const repository = buildRepository({
      id: entry.certificateId,
      issuerId: entry.issuerId,
      fingerprint: entry.fingerprint,
    });
    const registry = new StellarCertificateRegistry(
      buildPostgres(),
      client,
      repository as unknown as Repository<Certificate>,
    );

    await registry.extendTtl(entry.certificateId);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: entry.certificateId },
    });
    expect(client.extendTtl).toHaveBeenCalledWith(entry.fingerprint);
  });

  it('maps network failures from certificate lookup and authorization', async () => {
    const client = buildClient();
    vi.mocked(client.getVerdict).mockRejectedValue(
      new NetworkUnavailableError(),
    );
    vi.mocked(client.ensureIssuerAccount).mockRejectedValue(
      new NetworkUnavailableError(),
    );
    const registry = new StellarCertificateRegistry(
      buildPostgres(),
      client,
      buildRepository() as unknown as Repository<Certificate>,
    );

    await expect(registry.getVerdict(entry.fingerprint)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(
      registry.authorizeIssuer(entry.issuerId),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
