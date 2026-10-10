export const formatCertificateId = (number: number, issuedAt: string): string =>
  `HAB-${issuedAt.slice(0, 4)}-${String(number).padStart(6, '0')}`
