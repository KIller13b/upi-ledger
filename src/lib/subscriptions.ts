import type { Transaction } from '../types';

export interface Recurring {
  label: string;
  amount: number;
  frequency: 'monthly' | 'irregular';
  lastDate: string;
  count: number;
}

/** Strip noise words to extract a merchant root key */
function rootKey(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\b(payment|paid|upi|transfer|from|to|via|ref|for|towards|received|sent)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ');
}

export function detectRecurring(txns: Transaction[]): Recurring[] {
  const debits = txns.filter((t) => !t.failed && t.type === 'debit');

  const groups = new Map<string, Transaction[]>();
  for (const t of debits) {
    const key = rootKey(t.description);
    if (!key || key.length < 3) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const results: Recurring[] = [];

  for (const [, list] of groups) {
    if (list.length < 2) continue;

    const months = new Set(list.map((t) => t.date.slice(0, 7)));
    if (months.size < 2) continue;

    // Check amount consistency (within 20%)
    const amounts = list.map((t) => t.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const allClose = amounts.every((a) => Math.abs(a - avg) / avg <= 0.2);
    if (!allClose) continue;

    // Check if monthly (consecutive months)
    const sortedMonths = [...months].sort();
    const isMonthly = sortedMonths.length >= 2 && sortedMonths.every((mk, i) => {
      if (i === 0) return true;
      const [y1, m1] = sortedMonths[i - 1].split('-').map(Number);
      const [y2, m2] = mk.split('-').map(Number);
      return (y2 - y1) * 12 + (m2 - m1) === 1;
    });

    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    results.push({
      label: sorted[0].description.slice(0, 40),
      amount: Math.round(avg),
      frequency: isMonthly ? 'monthly' : 'irregular',
      lastDate: sorted[0].date,
      count: list.length,
    });
  }

  return results.sort((a, b) => b.count - a.count).slice(0, 6);
}
