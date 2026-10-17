import { datesAreOrdered, todayInBogota } from './dates.js';

describe('certificate date helpers', () => {
  it('returns today in Bogota even when UTC is already the next day', () => {
    expect(todayInBogota(new Date('2026-10-18T03:00:00Z'))).toBe('2026-10-17');
  });

  it.each([
    ['equal dates', '2026-10-17'],
    ['an earlier expiration date', '2026-10-16'],
  ])('rejects %s', (_caseName, validUntil) => {
    expect(datesAreOrdered('2026-10-17', validUntil)).toBe(false);
  });
});
