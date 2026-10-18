import { endOfDayInBogotaAsUnix } from './validity.js';

describe('endOfDayInBogotaAsUnix', () => {
  it('converts the boundary date to the end of day in Bogota', () => {
    expect(endOfDayInBogotaAsUnix('2026-10-19')).toBe(
      Date.UTC(2026, 9, 20, 4, 59, 59) / 1000,
    );
  });

  it('handles leap days', () => {
    expect(endOfDayInBogotaAsUnix('2028-02-29')).toBe(
      Date.UTC(2028, 2, 1, 4, 59, 59) / 1000,
    );
  });
});
