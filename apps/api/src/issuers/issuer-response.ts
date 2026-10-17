import type { CertificateTypeValue } from '../certificates/certificate-type.js';
import type { Issuer } from './issuer.entity.js';
import type { IssuerTypeValue } from './issuer-type.js';

// Same fields as the front `Entity` model, so the web client changes little when it swaps the sample data for the API.
export interface IssuerResponse {
  id: string;
  name: string;
  type: IssuerTypeValue;
  city: string;
  registeredAt: string;
  revokedAt: string | null;
  certificateTypes: CertificateTypeValue[];
  nit: string;
  contactName: string;
  email: string;
  phone: string;
  ministryRegistration: string;
  issuedThisMonth: number;
}

export const toIssuerResponse = (issuer: Issuer, issuedThisMonth: number): IssuerResponse => ({
  id: issuer.id,
  name: issuer.name,
  type: issuer.type,
  city: issuer.city,
  registeredAt: issuer.createdAt.toISOString(),
  revokedAt: issuer.revokedAt ? issuer.revokedAt.toISOString() : null,
  certificateTypes: issuer.certificateTypes,
  nit: issuer.nit,
  contactName: issuer.contactName,
  email: issuer.email,
  phone: issuer.phone,
  ministryRegistration: issuer.ministryRegistration,
  issuedThisMonth,
});
