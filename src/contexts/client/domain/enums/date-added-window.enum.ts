export type DateAddedWindow = '7d' | '30d' | '3mo' | '1y' | 'all';

export function dateAddedWindowToDate(
  window: DateAddedWindow,
  now: Date,
): Date | null {
  if (window === 'all') return null;
  const d = new Date(now);
  switch (window) {
    case '7d':
      d.setDate(d.getDate() - 7);
      break;
    case '30d':
      d.setDate(d.getDate() - 30);
      break;
    case '3mo':
      d.setMonth(d.getMonth() - 3);
      break;
    case '1y':
      d.setFullYear(d.getFullYear() - 1);
      break;
  }
  return d;
}
