export const CertificateType = {
  HeightWork: 'height-work',
  ConfinedSpaces: 'confined-spaces',
  CraneOperation: 'crane-operation',
  OccupationalMedical: 'occupational-medical',
} as const;

export type CertificateTypeValue = (typeof CertificateType)[keyof typeof CertificateType];
