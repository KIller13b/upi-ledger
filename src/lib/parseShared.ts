const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

export function findDate(raw: string): { date: string; idx0: number; idx1: number } | null {
  const m1 = raw.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?[,\s-]+\s*(\d{2,4})/i);
  if (m1) {
    const day = parseInt(m1[1], 10);
    const mon = MONTHS.indexOf(m1[2].toLowerCase().slice(0, 3)) + 1;
    const year = parseInt(m1[3], 10);
    if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
      const y = year < 100 ? 2000 + year : year;
      const date = `${y}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date, idx0: m1.index ?? 0, idx1: (m1.index ?? 0) + m1[0].length };
    }
  }
  const m2 = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m2) {
    const day = parseInt(m2[1], 10);
    const mon = parseInt(m2[2], 10);
    const year = parseInt(m2[3], 10);
    if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
      const y = year < 100 ? 2000 + year : year;
      const date = `${y}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date, idx0: m2.index ?? 0, idx1: (m2.index ?? 0) + m2[0].length };
    }
  }
  return null;
}

export function parseDateToken(raw: string): string | null {
  const trimmed = raw.trim();

  // 1. ISO date: YYYY-MM-DD  (what <input type="date"> and manual entry produce)
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const year = parseInt(y, 10);
    const mon  = parseInt(m, 10);
    const day  = parseInt(d, 10);
    if (year >= 2000 && mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 2. DD Mon YYYY  or  DD/MM/YYYY  (imported statement formats)
  return findDate(trimmed)?.date ?? null;
}

export function dayStamp(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getTime();
}