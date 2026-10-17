import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, QueryFailedError, type Repository } from 'typeorm';
import type { Issuer } from '../issuers/issuer.entity.js';
import type { CreateWorkerDto } from './dto/create-worker.dto.js';
import type { ListWorkersQueryDto } from './dto/list-workers-query.dto.js';
import { Worker } from './worker.entity.js';
import { toWorkerResponse, type WorkerResponse } from './worker-response.js';

const DUPLICATE_WORKER_MESSAGE = 'Ya registraste a un trabajador con ese tipo y número de documento.';

export const escapeLikePrefix = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

const isWorkerUniqueViolation = (error: unknown): error is QueryFailedError & {
  driverError: Error & { code: string; constraint: string };
} =>
  error instanceof QueryFailedError &&
  'code' in error.driverError &&
  error.driverError.code === '23505' &&
  'constraint' in error.driverError &&
  error.driverError.constraint === 'uq_worker_issuer_document';

@Injectable()
export class WorkersService {
  constructor(@InjectRepository(Worker) private readonly workers: Repository<Worker>) {}

  async register(issuer: Issuer, input: CreateWorkerDto): Promise<WorkerResponse> {
    const worker = this.workers.create({
      issuerId: issuer.id,
      fullName: input.fullName,
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      consentedAt: new Date(),
    });

    try {
      return toWorkerResponse(await this.workers.save(worker));
    } catch (error) {
      if (isWorkerUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_WORKER_MESSAGE);
      }
      throw error;
    }
  }

  async list(issuer: Issuer, query: ListWorkersQueryDto): Promise<WorkerResponse[]> {
    const where = query.documentNumber
      ? {
          issuerId: issuer.id,
          documentNumber: Like(`${escapeLikePrefix(query.documentNumber)}%`),
        }
      : { issuerId: issuer.id };
    const workers = await this.workers.find({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return workers.map(toWorkerResponse);
  }
}
