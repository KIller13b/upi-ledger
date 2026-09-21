import type { ParsedRow } from './gpayPdf';
import { parseDateToken } from './parseShared';

export function parseCsvText(text: string): ParsedRow[] {
  const lines = splitCsv(text);
  if (lines.length < 2) {
    return [
      {
        date: '',
        description: 'No usable data rows found in file',
        upiRef: '',
        type: '',
        amount: null,
        problems: ['Could not parse this file as CSV'],
        failed: false,
        raw: text.slice(0, 200)
      }
    ];
  }

  const hdrIdx = findHeaderRow(lines);
  if (hdrIdx < 0) {
    return [
      {
        date: '',
        description: 'Could not detect a header row (Date / Description / Debit / Credit / Balance)',
        upiRef: '',
        type: '',
        amount: null,
        problems: ['No header row recognized'],
        failed: false,
        raw: lines[0].join(',')
      }
    ];
  }

  const cols = mapColumns(lines[hdrIdx]);
  const rows: ParsedRow[] = [];
  for (let i = hdrIdx + 1; i < lines.length; i++) {
    const cells = lines[i];
    if (cells.every((c) => !c.trim())) continue;

    const dateRaw = (cells[cols.date] ?? '').trim();
    const date = parseDateToken(dateRaw) ?? '';
    const description = (cells[cols.description] ?? '').trim();
    const debitRaw = parseNum((cells[cols.debit] ?? '').trim());
    const creditRaw = parseNum((cells[cols.credit] ?? '').trim());
    const balanceRaw = parseNum((cells[cols.balance] ?? '').trim());

    if (!date && debitRaw == null && creditRaw == null) continue;

    const amount = debitRaw != null ? debitRaw : creditRaw;
    const type = debitRaw != null ? 'debit' : creditRaw != null ? 'credit' : '';
    const problemCapture = [];
    if (!date) problemCapture.push('No valid date');
    if (amount == null || !type) problemCapture.push('No amount / type');

    rows.push({
      date,
      description: description || dateRaw || '\u2014',
      upiRef: '',
      type,
      amount,
      balance: balanceRaw != null ? balanceRaw : undefined,
      failed: /fail/i.test(description),
      problems: problemCapture,
      raw: cells.join(',')
    });
  }
  return rows;
}

function splitCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').trim();
  const firstLine = clean.split(/\r?\n/)[0] ?? '';
  const delims = [',', ';', '\t', '|'];
  let delim = ',';
  let best = 0;
  for (const d of delims) {
    const count = firstLine.split(d).length;
    if (count > best) {
      best = count;
      delim = d;
    }
  }

  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      cur.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      cur.push(field);
      field = '';
      if (cur.some((c) => c.trim())) rows.push(cur);
      cur = [];
    } else {
      field += ch;
    }
  }
  cur.push(field);
  if (cur.some((c) => c.trim())) rows.push(cur);
  return rows;
}

function findHeaderRow(lines: string[][]): number {
  const wanted = ['date', 'value date', 'txn date', 'transaction date', 'posting date'];
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const joined = lines[i]
      .join(' ')
      .toLowerCase();
    const hasDate = wanted.some((w) => joined.includes(w));
    const hasBal = /balance/.test(joined);
    const hasDrCr = /(debit|withdrawal|dr\b|credit|deposit|cr\b)/.test(joined);
    const hasDesc = /(description|particulars|narr|remarks|details|transaction\s*details)/.test(joined);
    if ((hasDate && hasDrCr) || (hasDate && hasBal) || (hasDrCr && hasDesc)) {
      return i;
    }
  }
  return -1;
}

function mapColumns(header: string[]): Record<'date' | 'description' | 'debit' | 'credit' | 'balance', number> {
  const out = { date: -1, description: -1, debit: -1, credit: -1, balance: -1 };
  header.forEach((raw, idx) => {
    const h = raw.toLowerCase();
    if (out.date < 0 && /(date|tran\s*on)/.test(h)) out.date = idx;
    if (out.description < 0 && /(particulars|description|narr|remarks|details|transaction\s*details|info)/.test(h)) out.description = idx;
    if (out.debit < 0 && /(^debit$|debit\s*amt|withdrawal|dr\b)/.test(h) && !/credit/.test(h)) out.debit = idx;
    if (out.credit < 0 && /(^credit$|credit\s*amt|deposit)/.test(h)) out.credit = idx;
    if (out.balance < 0 && /balance/.test(h)) out.balance = idx;
  });
  return out;
}

function parseNum(raw: string): number | null {
  if (!raw || raw === '-' || raw === '--' || raw === '') return null;
  let t = raw.replace(/[\u20b9Rs\s,]+/g, '').trim();
  const neg = /^\(.*\)$/.test(t) || /^\-/.test(t);
  t = t.replace(/[()]/g, '').replace(/^Dr\.?$/i, '').replace(/^Cr\.?$/i, '');
  const m = t.match(/^-?[\d.]+/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  if (!isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}