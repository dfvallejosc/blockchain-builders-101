import { isClerkAPIResponseError } from '@clerk/backend/errors';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, QueryFailedError, type Repository } from 'typeorm';
import { AccountsService } from '../auth/accounts.service.js';
import {
  CERTIFICATE_REGISTRY,
  type CertificateRegistry,
} from '../certificates/certificate-registry.js';
import { currentMonthRange } from './current-month.js';
import type { CreateIssuerDto } from './dto/create-issuer.dto.js';
import { Issuer } from './issuer.entity.js';
import { toIssuerResponse, type IssuerResponse } from './issuer-response.js';

const DUPLICATE_NIT_MESSAGE = 'Ya hay una entidad registrada con ese NIT.';
const DUPLICATE_EMAIL_MESSAGE =
  'Ese correo ya tiene una cuenta o una invitación pendiente.';
const UNAVAILABLE_MESSAGE = 'El servicio no está disponible.';

// Clerk answers with one of these codes when the email already has an account or a pending invitation.
const CLERK_DUPLICATE_CODES = ['form_identifier_exists', 'duplicate_record'];

// What an issuer issued in the month, for billing: by the server creation time (the issue date is typed by the
// issuer and can be backdated), and annulled certificates still count because they were issued.
const ISSUED_COUNT_SQL = `
  SELECT issuer_id AS "issuerId", COUNT(*)::int AS count
  FROM certificate
  WHERE deleted_at IS NULL
    AND (created_at AT TIME ZONE 'America/Bogota')::date >= $1::date
    AND (created_at AT TIME ZONE 'America/Bogota')::date < $2::date
    AND issuer_id = ANY($3::uuid[])
  GROUP BY issuer_id`;

const isNitUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  'code' in error.driverError &&
  error.driverError.code === '23505' &&
  'constraint' in error.driverError &&
  error.driverError.constraint === 'uq_issuer_nit';

const isClerkDuplicate = (error: unknown): boolean =>
  isClerkAPIResponseError(error) &&
  error.errors.some((clerkError) =>
    CLERK_DUPLICATE_CODES.includes(clerkError.code),
  );

// Only the status and the error codes are logged: the Clerk message can carry the contact's email.
const describeClerkFailure = (error: unknown): string =>
  isClerkAPIResponseError(error)
    ? `status ${error.status}, codes ${error.errors.map((clerkError) => clerkError.code).join(', ') || 'none'}`
    : 'unexpected error';

@Injectable()
export class IssuersService {
  private readonly logger = new Logger(IssuersService.name);

  constructor(
    @InjectRepository(Issuer) private readonly issuers: Repository<Issuer>,
    private readonly dataSource: DataSource,
    private readonly accounts: AccountsService,
    @Inject(CERTIFICATE_REGISTRY)
    private readonly registry: CertificateRegistry,
  ) {}

  // Registry authorization and the row succeed together, so a failed authorization rolls the row back.
  // Clerk is outside the transaction, so a commit that fails after Clerk accepted can leave an orphan invitation.
  // Its issuerId matches no row, so the guard answers 403 and it grants nothing.
  async register(input: CreateIssuerDto): Promise<IssuerResponse> {
    const issuer = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Issuer);
      let saved: Issuer;
      try {
        saved = await repository.save(
          repository.create({
            name: input.name,
            type: input.type,
            city: input.city,
            certificateTypes: input.certificateTypes,
            nit: input.nit,
            ministryRegistration: input.ministryRegistration,
            contactName: input.contactName,
            email: input.email,
            phone: input.phone,
            revokedAt: null,
          }),
        );
      } catch (error) {
        if (isNitUniqueViolation(error))
          throw new ConflictException(DUPLICATE_NIT_MESSAGE);
        throw error;
      }

      await this.registry.authorizeIssuer(saved.id);

      try {
        await this.accounts.inviteIssuer(saved.id, saved.email);
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        if (isClerkDuplicate(error))
          throw new ConflictException(DUPLICATE_EMAIL_MESSAGE);
        this.logger.warn(
          `Clerk invitation failed: ${describeClerkFailure(error)}`,
        );
        throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
      }
      return saved;
    });

    return toIssuerResponse(issuer, 0);
  }

  async list(): Promise<IssuerResponse[]> {
    const issuers = await this.issuers.find({
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    const counts = await this.countIssuedThisMonth(
      issuers.map((issuer) => issuer.id),
    );

    return issuers.map((issuer) =>
      toIssuerResponse(issuer, counts.get(issuer.id) ?? 0),
    );
  }

  async get(id: string): Promise<IssuerResponse> {
    const issuer = await this.findOrFail(id);
    const counts = await this.countIssuedThisMonth([issuer.id]);

    return toIssuerResponse(issuer, counts.get(issuer.id) ?? 0);
  }

  // Logical revocation: nothing is deleted. The conditional update keeps the first revocation date under races.
  async revoke(id: string): Promise<IssuerResponse> {
    const issuer = await this.findOrFail(id);
    if (issuer.revokedAt) return this.get(id);

    await this.registry.revokeIssuer(id);
    await this.issuers.update(
      { id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return this.get(id);
  }

  private async findOrFail(id: string): Promise<Issuer> {
    const issuer = await this.issuers.findOneBy({ id });
    if (!issuer) throw new NotFoundException('No encontramos la entidad.');
    return issuer;
  }

  private async countIssuedThisMonth(
    issuerIds: string[],
  ): Promise<Map<string, number>> {
    if (issuerIds.length === 0) return new Map();

    const { from, to } = currentMonthRange(new Date());
    const rows = await this.dataSource.query<
      { issuerId: string; count: number }[]
    >(ISSUED_COUNT_SQL, [from, to, issuerIds]);
    return new Map(rows.map((row) => [row.issuerId, row.count]));
  }
}
