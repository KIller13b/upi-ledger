import { db } from '../db';
import type { Transaction } from '../types';
import type { ParsedRow } from './gpayPdf';
import { categorize, type Tx } from './categories';
import { dayStamp } from './parseShared';

export interface Candidate {
  parsed: ParsedRow;
  tx: Transaction;
  dup: boolean;
  sel: boolean;
  note: string;
}

const existingKeys = async (): Promise<{ refs: Set<string>; sigs: Set<string> }> => {
  const all = await db.transactions.toArray();
  const refs = new Set<string>();
  const sigs = new Set<string>();
  for (const t of all) {
    if (t.upiRef) refs.add(t.upiRef);
    sigs.add(`${t.date}|${t.type}|${Math.round(t.amount * 100)}`);
  }
  return { refs, sigs };
};

export async function buildCandidates(
  parsed: ParsedRow[],
  rules: Tx[],
  source: Transaction['source']
): Promise<Candidate[]> {
  const { refs, sigs } = await existingKeys();
  const localRefs = new Set<string>();
  const localSigs = new Set<string>();
  const out: Candidate[] = [];

  for (const p of parsed) {
    const desc = p.description.replace(/\s+/g, ' ').trim().slice(0, 200);
    const hasAmount = p.amount != null && isFinite(p.amount);
    const hasType = p.type === 'debit' || p.type === 'credit';
    const hasDate = !!p.date;
    const usable = hasAmount && hasType && hasDate;

    let dup = false;
    let dupNote = '';
    if (usable && p.upiRef) {
      if (refs.has(p.upiRef) || localRefs.has(p.upiRef)) {
        dup = true;
        dupNote = 'Duplicate UPI reference already in ledger';
      }
      localRefs.add(p.upiRef);
    }
    if (usable && p.upiRef) {
      const sig = `${p.date}|${p.type}|${Math.round((p.amount as number) * 100)}`;
      if (dup || sigs.has(sig) || localSigs.has(sig)) {
        dup = true;
        dupNote = dupNote || 'Same date / type / amount already in ledger';
      }
      localSigs.add(sig);
    }

    const tx: Transaction = {
      date: p.date,
      ts: dayStamp(p.date || '1970-01-01'),
      description: desc || 'Unnamed transaction',
      upiRef: p.upiRef || '',
      type: (hasType ? p.type : 'debit') as Transaction['type'],
      amount: Math.abs(p.amount ?? 0),
      balance: p.balance != null ? Math.abs(p.balance as number) : undefined,
      category: categorize(p.description || '', hasType ? (p.type as 'debit' | 'credit') : 'debit', rules),
      failed: p.failed,
      source,
      createdAt: Date.now()
    };

    const note = dup
      ? dupNote
      : !usable
        ? p.problems.length
          ? p.problems.join(' ')
          : 'Missing amount, type or date'
        : p.problems.join(' ');

    out.push({ parsed: p, tx, dup, sel: usable && !dup, note });
  }
  return out;
}