export const IssuerType = {
  Clinic: 'clinic',
  TrainingCenter: 'training-center',
} as const;

export type IssuerTypeValue = (typeof IssuerType)[keyof typeof IssuerType];
