export const DocumentType = {
  Cc: 'cc',
  Ce: 'ce',
  Ppt: 'ppt',
  Passport: 'passport',
} as const;

export type DocumentTypeValue = (typeof DocumentType)[keyof typeof DocumentType];
