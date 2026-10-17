export const todayInBogota = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(now);

export const datesAreOrdered = (issuedAt: string, validUntil: string): boolean => validUntil > issuedAt;
