import { todayInBogota } from '../certificates/dates.js';

export interface MonthRange {
  from: string;
  to: string;
}

// Half-open range of the calendar month in Bogota, as YYYY-MM-DD, to compare with date columns.
export const currentMonthRange = (now: Date): MonthRange => {
  const [year, month] = todayInBogota(now).split('-').map(Number) as [number, number];
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const pad = (value: number): string => String(value).padStart(2, '0');

  return { from: `${year}-${pad(month)}-01`, to: `${nextYear}-${pad(nextMonth)}-01` };
};
