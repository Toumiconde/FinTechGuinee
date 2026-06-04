export const getCurrentMonthKey = (): string => {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${month}-${now.getFullYear()}`;
};

export const getNextMonthKey = (dateStr?: string): string => {
  if (dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      month += 1;
      if (month > 12) { month = 1; year += 1; }
      const monthStr = month.toString().padStart(2, '0');
      return `${monthStr}-${year}`;
    }
  }
  // Fallback: compute from current date
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const m = (next.getMonth() + 1).toString().padStart(2, '0');
  return `${m}-${next.getFullYear()}`;
};

export const isPastMonth = (monthKey: string): boolean => {
  const [m, y] = monthKey.split('-').map(Number);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  return y < currentYear || (y === currentYear && m < currentMonth);
};

export const calculateMonthlyAverage = (expenses: any[]): number => {
  const monthMap: Record<string, number[]> = {};
  expenses.forEach(exp => {
    const key = getMonthKey(exp.date);
    if (!key) return;
    if (!monthMap[key]) monthMap[key] = [];
    monthMap[key].push(exp.amount);
  });
  const totals = Object.values(monthMap).map(arr => arr.reduce((s, v) => s + v, 0));
  if (totals.length === 0) return 0;
  return Math.round(totals.reduce((s, v) => s + v, 0) / totals.length);
};

export const getMonthKey = (dateStr: string): string => {
  // dateStr format: dd/mm/yyyy or d/m/yyyy
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  return `${month}-${year}`; // e.g., "05-2025"
};

export const formatMonthKey = (monthKey: string, language: string = 'fr'): string => {
  const [month, year] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const locale = language === 'en' ? 'en-US' : 'fr-FR';
  return date.toLocaleString(locale, { month: 'long', year: 'numeric' });
};

// Generate an array of month keys (MM-YYYY) covering past and future months
export const generateMonthRange = (pastMonths: number, futureMonths: number): string[] => {
  const result: string[] = [];
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - pastMonths, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + futureMonths, 1);
  let cursor = new Date(start);
  while (cursor <= end) {
    const month = (cursor.getMonth() + 1).toString().padStart(2, '0');
    const year = cursor.getFullYear();
    result.push(`${month}-${year}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
};

