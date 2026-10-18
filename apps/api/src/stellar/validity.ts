export const endOfDayInBogotaAsUnix = (date: string): number => {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day + 1, 4, 59, 59) / 1000;
};
