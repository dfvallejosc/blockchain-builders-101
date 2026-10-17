import { IsNull, type Repository } from 'typeorm';
import { Certificate } from './certificate.entity.js';
import { PostgresCertificateRegistry } from './postgres-certificate-registry.js';
import { CertificateAlreadyAnnulledError, type RegistryEntry } from './certificate-registry.js';

const entry: RegistryEntry = {
  certificateId: 'certificate-123',
  issuerId: 'issuer-456',
  fingerprint: 'a'.repeat(64),
  issuedAt: '2026-10-17',
  validUntil: '2027-10-17',
};

const buildRepository = () => ({
  findOne: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
});

describe('PostgresCertificateRegistry', () => {
  it('registers without saving or updating the certificate row', async () => {
    const repository = buildRepository();
    const registry = new PostgresCertificateRegistry(repository as unknown as Repository<Certificate>);

    await registry.register(entry);

    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns null when the certificate is not found', async () => {
    const repository = buildRepository();
    repository.findOne.mockResolvedValue(null);
    const registry = new PostgresCertificateRegistry(repository as unknown as Repository<Certificate>);

    await expect(registry.getStatus(entry.certificateId)).resolves.toBeNull();
  });

  it('returns the five registry fields and whether the certificate was annulled', async () => {
    const repository = buildRepository();
    repository.findOne.mockResolvedValue({
      id: entry.certificateId,
      issuerId: entry.issuerId,
      fingerprint: entry.fingerprint,
      issuedAt: entry.issuedAt,
      validUntil: entry.validUntil,
      annulledAt: new Date('2026-10-18T12:00:00.000Z'),
    });
    const registry = new PostgresCertificateRegistry(repository as unknown as Repository<Certificate>);

    await expect(registry.getStatus(entry.certificateId)).resolves.toEqual({ ...entry, annulled: true });
  });

  it('marks the certificate as annulled only when it has not already been annulled', async () => {
    const repository = buildRepository();
    repository.update.mockResolvedValue({ affected: 1 });
    const registry = new PostgresCertificateRegistry(repository as unknown as Repository<Certificate>);

    await registry.annul(entry.certificateId);

    expect(repository.update).toHaveBeenCalledWith(
      { id: entry.certificateId, annulledAt: IsNull() },
      { annulledAt: expect.any(Date) },
    );
  });

  it('rejects with CertificateAlreadyAnnulledError when no row changed', async () => {
    const repository = buildRepository();
    repository.update.mockResolvedValue({ affected: 0 });
    const registry = new PostgresCertificateRegistry(repository as unknown as Repository<Certificate>);

    await expect(registry.annul(entry.certificateId)).rejects.toBeInstanceOf(CertificateAlreadyAnnulledError);
  });

  it('reports a certificate as not annulled when annulledAt is null', async () => {
    const repository = buildRepository();
    repository.findOne.mockResolvedValue({
      id: entry.certificateId,
      issuerId: entry.issuerId,
      fingerprint: entry.fingerprint,
      issuedAt: entry.issuedAt,
      validUntil: entry.validUntil,
      annulledAt: null,
    });
    const registry = new PostgresCertificateRegistry(repository as unknown as Repository<Certificate>);

    await expect(registry.getStatus(entry.certificateId)).resolves.toEqual({ ...entry, annulled: false });
  });
});
