import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { findDate } from './parseShared';

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

type PdfjsLoader = () => Promise<typeof import('pdfjs-dist')>;
let pdfjsLoader: PdfjsLoader | null = null;

export function __setPdfjsLoader(fn: PdfjsLoader | null) {
  pdfjsLoader = fn;
}

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (pdfjsLoader ? pdfjsLoader() : import('pdfjs-dist')).then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = mod.GlobalWorkerOptions.workerSrc || workerUrl;
      return mod;
    });
  }
  return pdfjsPromise;
}

export interface ParsedRow {
  date: string;
  description: string;
  upiRef: string;
  type: 'debit' | 'credit' | '';
  amount: number | null;
  balance?: number | null;
  failed: boolean;
  problems: string[];
  raw: string;
}

interface PosItem {
  str: string;
  x: number;
  y: number;
  w: number;
}

export interface PLine {
  y: number;
  items: PosItem[];
  text: string;
}

export async function extractLines(buffer: ArrayBuffer): Promise<PLine[]> {
  const { getDocument } = await getPdfjs();
  const pdf = await getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true
  }).promise;

  const lines: PLine[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: PosItem[] = (content.items as Array<Record<string, unknown>>)
      .filter((it) => typeof it.str === 'string' && it.str.trim().length > 0)
      .map((it) => {
        const tr = (it.transform as number[]) ?? [1, 0, 0, 1, 0, 0];
        return {
          str: (it.str as string).replace(/\s+/g, ' ').trim(),
          x: tr[4] ?? 0,
          y: tr[5] ?? 0,
          w: typeof it.width === 'number' ? it.width : 0
        };
      });

    items.sort((a, b) => b.y - a.y || a.x - b.x);

    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - it.y) < 3) {
        last.items.push(it);
      } else {
        lines.push({ y: it.y, items: [it], text: '' });
      }
    }
  }

  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    l.text = l.items.map((i) => i.str).join(' ');
  }
  return lines;
}

interface AmountToken {
  raw: string;
  value: number;
  idx0: number;
  idx1: number;
}

function parseAmount(raw: string): number | null {
  const t = raw.replace(/[,]/g, '').trim();
  const n = parseFloat(t);
  if (isFinite(n)) return n;
  return null;
}

const AMOUNT_RE = /\u20b9\s*([\d,]+(?:\.\d{1,2})?)|(\b\d{1,3}(?:,\d{3})+\b(?:\.\d{1,2})?|\b\d+\.\d{1,2}\b)/g;

function findAmountsInText(text: string): AmountToken[] {
  const out: AmountToken[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const isRupee = m[1] !== undefined;
    let raw = (isRupee ? m[1] : m[2]) ?? '';
    raw = raw.trim();
    if (!raw) continue;
    if (raw.length > 15) continue;
    const v = parseAmount(raw);
    if (v == null) continue;
    out.push({ raw, value: v, idx0: m.index ?? 0, idx1: (m.index ?? 0) + m[0].length });
  }
  return out;
}

function blankSpan(text: string, idx0: number, idx1: number): string {
  return text.slice(0, idx0) + ' '.repeat(idx1 - idx0) + text.slice(idx1);
}

function cleanText(text: string): string {
  return text
    .replace(/\u20b9|Rs\.?|INR/gi, ' ')
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && t !== '-' && !/^\d{1,2},?\d{3,}$/.test(t))
    .join(' ')
    .trim();
}

function extractUpiRef(text: string): string {
  const u1 = text.match(/(?:UPI[\s:\-\/\u2013\u2014]*)([\w.\/@-]{9,})/i);
  if (u1) {
    const ref = u1[1].replace(/[\s.,]/g, '').replace(/\u2013|\u2014/g, '');
    if (/^[\d\w]+$/.test(ref)) return ref;
  }
  const u2 = text.match(/(^|[\s@])(\d{9,16})(?=$|[\s@.\/])/);
  if (u2) return u2[2];
  return '';
}

interface Header {
  y: number | null;
  hasColumns: boolean;
}

function findHeader(lines: PLine[]): Header {
  const hdr: Header = { y: null, hasColumns: false };
  for (const l of lines) {
    const lower = l.text.toLowerCase();
    const hasDate = /date/.test(lower);
    const hasDebit = /debit|dr\b/.test(lower);
    const hasCredit = /credit|cr\b/.test(lower);
    const hasBalance = /balance/.test(lower);
    if (hasDate && (hasDebit || hasCredit) && hasBalance) {
      hdr.y = l.y;
      hdr.hasColumns = true;
      break;
    }
  }
  return hdr;
}

const DR_WORDS = [
  'paid to', 'paid via', 'paid for', 'sent to', 'sent via',
  'debit', 'purchased', 'spent', 'upi shopping', 'upi app'
];
const CR_WORDS = [
  'received', 'refund', 'cashback', 'credit', 'credited',
  'money received', 'wallet credit', 'income'
];

function guessType(desc: string): 'debit' | 'credit' | '' {
  const d = desc.toLowerCase();
  if (d.includes(' received') || d.startsWith('received')) return 'credit';
  for (const w of DR_WORDS) if (d.includes(w)) return 'debit';
  for (const w of CR_WORDS) if (d.includes(w)) return 'credit';
  return '';
}

const BOILERPLATE_RE =
  /statement|generated|period|page|summary|opening balance|closing balance|grand total|total records?\b|from\s*:|to\s*:|account\s*:|account type|bank name|\btotals\b|debit\s*\(avail|transaction as per|^\s*-+\s*$/i;

function pushOrMerge(lines: PLine[], hdr: Header, rows: ParsedRow[]) {
  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;

    if (hdr.hasColumns && hdr.y != null && line.y >= hdr.y && BOILERPLATE_RE.test(text)) continue;

    const dateInfo = findDate(text);
    const dateStr = dateInfo ? dateInfo.date : null;
    const amountTokens = findAmountsInText(text);

    if (dateStr && amountTokens.length === 0 && BOILERPLATE_RE.test(text)) {
      continue;
    }

    if (!dateStr && /(grand total|total records?\b|\brecord count|\bclosing balance\b)/i.test(text)) {
      continue;
    }

    let t = text;
    if (dateInfo) t = blankSpan(t, dateInfo.idx0, dateInfo.idx1);
    for (const a of amountTokens) t = blankSpan(t, a.idx0, a.idx1);
    const upiRef = extractUpiRef(t);
    if (upiRef) t = t.replace(upiRef, ' ');
    const description = cleanText(t);

    const amount = amountTokens.length ? amountTokens[0].value : null;
    const balance = amountTokens.length > 1 ? amountTokens[amountTokens.length - 1].value : undefined;

    if (dateStr) {
      rows.push({
        date: dateStr,
        description: description || text,
        upiRef,
        type: '',
        amount: null,
        balance: undefined,
        failed: /fail/i.test(text),
        problems: [],
        raw: text
      });
    } else {
      const last = rows[rows.length - 1];
      if (last && !last.amount) {
        if (description && !last.description.includes(description)) {
          last.description = last.description.length ? last.description + ' ' + description : description;
        }
        if (!last.upiRef && upiRef) last.upiRef = upiRef;
      }
    }

    const cur = rows[rows.length - 1];
    if (cur) {
      if (amount != null && cur.amount == null) {
        cur.amount = amount;
        if (balance != null) cur.balance = balance;
        const guessed = guessType(cur.description);
        if (guessed) cur.type = guessed;
      }
    }
  }
}

function classifyByBalances(rows: ParsedRow[]) {
  let prev: number | null = null;
  for (const r of rows) {
    if (!r.type && r.amount != null && typeof r.balance === 'number') {
      if (prev != null) {
        const delta = r.balance - prev;
        if (Math.abs(Math.abs(delta) - r.amount) < 0.01) {
          r.type = delta > 0 ? 'credit' : 'debit';
        }
      }
    }
    if (typeof r.balance === 'number') prev = r.balance;
  }
}

function finalizeRows(rows: ParsedRow[]): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const r of rows) {
    if (!r.date) r.problems.push('No valid date');
    if (r.amount == null) r.problems.push('Could not determine amount / type');
    out.push(r);
  }
  return out;
}

export function parseGpayLines(lines: PLine[]): ParsedRow[] {
  const hdr = findHeader(lines);
  const rows: ParsedRow[] = [];
  pushOrMerge(lines, hdr, rows);
  classifyByBalances(rows);
  return finalizeRows(rows);
}

export async function parsePdfFile(file: ArrayBuffer): Promise<ParsedRow[]> {
  const lines = await extractLines(file);
  return parseGpayLines(lines);
}