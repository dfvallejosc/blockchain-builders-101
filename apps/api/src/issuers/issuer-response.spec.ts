import { CertificateType } from '../certificates/certificate-type.js';
import { currentMonthRange } from './current-month.js';
import type { Issuer } from './issuer.entity.js';
import { IssuerType } from './issuer-type.js';
import { toIssuerResponse } from './issuer-response.js';

const buildIssuer = (overrides: Partial<Issuer> = {}): Issuer =>
  ({
    id: '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11',
    name: 'Salud Ocupacional del Valle',
    type: IssuerType.Clinic,
    city: 'Medellín',
    nit: '901.482.317-5',
    ministryRegistration: 'REG-2024-118',
    contactName: 'Marcela Ríos',
    email: 'marcela@saludvalle.co',
    phone: '310 555 0142',
    certificateTypes: [CertificateType.OccupationalMedical],
    revokedAt: null,
    createdAt: new Date('2026-10-17T10:00:00.000Z'),
    updatedAt: new Date('2026-10-17T10:01:00.000Z'),
    deletedAt: null,
    ...overrides,
  }) as Issuer;

describe('toIssuerResponse', () => {
  it('answers exactly the front Entity fields', () => {
    expect(toIssuerResponse(buildIssuer(), 4)).toEqual({
      id: '3f0c6a52-6a0a-4c0e-9d7e-2f4d2d3a7b11',
      name: 'Salud Ocupacional del Valle',
      type: 'clinic',
      city: 'Medellín',
      registeredAt: '2026-10-17T10:00:00.000Z',
      revokedAt: null,
      certificateTypes: ['occupational-medical'],
      nit: '901.482.317-5',
      contactName: 'Marcela Ríos',
      email: 'marcela@saludvalle.co',
      phone: '310 555 0142',
      ministryRegistration: 'REG-2024-118',
      issuedThisMonth: 4,
    });
  });

  it('serializes the revocation date', () => {
    const response = toIssuerResponse(buildIssuer({ revokedAt: new Date('2026-10-18T08:30:00.000Z') }), 0);

    expect(response.revokedAt).toBe('2026-10-18T08:30:00.000Z');
  });
});

describe('currentMonthRange', () => {
  it('spans the calendar month in Bogota as a half-open date range', () => {
    expect(currentMonthRange(new Date('2026-10-17T15:00:00.000Z'))).toEqual({ from: '2026-10-01', to: '2026-11-01' });
  });

  it('uses the Bogota date even when UTC is already the next month', () => {
    // 2026-11-01T03:00Z is still October 31st at 22:00 in Bogota (UTC-5).
    expect(currentMonthRange(new Date('2026-11-01T03:00:00.000Z'))).toEqual({ from: '2026-10-01', to: '2026-11-01' });
  });

  it('rolls over the year in December', () => {
    expect(currentMonthRange(new Date('2026-12-20T12:00:00.000Z'))).toEqual({ from: '2026-12-01', to: '2027-01-01' });
  });
});
