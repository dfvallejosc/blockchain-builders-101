import type { DocumentTypeValue } from './document-type.js';
import type { Worker } from './worker.entity.js';

export interface WorkerResponse {
  id: string;
  entityId: string;
  fullName: string;
  documentType: DocumentTypeValue;
  documentNumber: string;
  registeredAt: string;
  consentedAt: string;
}

export const toWorkerResponse = (worker: Worker): WorkerResponse => ({
  id: worker.id,
  entityId: worker.issuerId,
  fullName: worker.fullName,
  documentType: worker.documentType,
  documentNumber: worker.documentNumber,
  registeredAt: worker.createdAt.toISOString(),
  consentedAt: worker.consentedAt.toISOString(),
});
