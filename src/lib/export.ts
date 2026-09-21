import { db } from '../db';
import type { Transaction, CategoryRule, ImportBatch } from '../types';

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function exportCsv() {
  const txns = await db.transactions.toArray();
  txns.sort((a, b) => a.ts - b.ts);
  const header = ['Date', 'Description', 'Type', 'Amount', 'Balance', 'Category', 'UPI Ref', 'Status', 'Source'];
  const rows = txns.map((t) => [
    t.date,
    csvEscape(t.description),
    t.type,
    t.amount.toFixed(2),
    t.balance != null ? t.balance.toFixed(2) : '',
    t.category,
    csvEscape(t.upiRef),
    t.failed ? 'Failed' : 'Success',
    t.source
  ]);
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  download('upi-ledger-transactions.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8');
}

export async function exportBackup() {
  const [transactions, categoryRules, importBatches] = await Promise.all([
    db.transactions.toArray(),
    db.categoryRules.toArray(),
    db.importBatches.toArray()
  ]);
  const payload = {
    app: 'upi-ledger',
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    categoryRules,
    importBatches
  };
  download('upi-ledger-backup.json', JSON.stringify(payload, null, 2), 'application/json');
}

export async function restoreBackup(file: File): Promise<{ transactions: number; rules: number }> {
  const text = await file.text();
  const data = JSON.parse(text) as {
    transactions?: Transaction[];
    categoryRules?: CategoryRule[];
    importBatches?: ImportBatch[];
  };
  if (!data || !Array.isArray(data.transactions)) {
    throw new Error('Invalid backup file');
  }
  await db.transaction('rw', [db.transactions, db.categoryRules, db.importBatches], async () => {
    await db.transactions.clear();
    await db.importBatches.clear();
    await db.categoryRules.clear();
    await db.transactions.bulkAdd(data.transactions as Transaction[]);
    await db.importBatches.bulkAdd((data.importBatches ?? []) as ImportBatch[]);
    if (data.categoryRules && data.categoryRules.length) {
      await db.categoryRules.bulkAdd(data.categoryRules as CategoryRule[]);
    }
  });
  return { transactions: (data.transactions ?? []).length, rules: (data.categoryRules ?? []).length };
}

export async function wipeAll() {
  await db.transaction('rw', [db.transactions, db.categoryRules, db.importBatches], async () => {
    await db.transactions.clear();
    await db.categoryRules.clear();
    await db.importBatches.clear();
  });
}