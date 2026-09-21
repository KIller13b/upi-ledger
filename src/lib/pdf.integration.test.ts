import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { parsePdfFile, __setPdfjsLoader } from './gpayPdf';

const require = createRequire(import.meta.url);

beforeAll(async () => {
  const pdfModule = require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
  const workerModule = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  __setPdfjsLoader(async () => {
    const mod = await import(pdfModule);
    mod.GlobalWorkerOptions.workerSrc = workerModule;
    return mod as unknown as typeof import('pdfjs-dist');
  });
});

function makePdf(rows: Array<Array<{ text: string; x: number; y: number }>>): ArrayBuffer {
  const lines: string[] = [];
  for (const row of rows) {
    for (const cell of row) {
      lines.push(`1 0 0 1 ${cell.x} ${cell.y} Tm (${cell.text}) Tj`);
    }
  }
  const content = lines.join('\n');
  const stream = 'BT\n/F1 10 Tf\n' + content + '\nET';

  const catalog = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const pages = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const page =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
  const contentObj =
    '4 0 obj\n<< /Length ' + Buffer.byteLength(stream, 'latin1') + ' >>\nstream\n' + stream + '\nendstream\nendobj\n';
  const font = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const parts = ['%PDF-1.4\n', catalog, pages, page, contentObj, font, 'trailer\n<< /Root 1 0 R /Size 6 >>\n'];
  const offsets: number[] = [];
  let pos = Buffer.byteLength(parts[0], 'latin1');
  for (let i = 1; i < parts.length; i++) {
    if (i % 2 === 1) offsets.push(pos);
    pos += Buffer.byteLength(parts[i], 'latin1');
  }
  const xrefEntries = ['xref\n0 6\n0000000000 65535 f \n'];
  for (const o of offsets) {
    xrefEntries.push(String(o).padStart(10, '0') + ' 00000 n \n');
  }
  parts.push(xrefEntries.join('') + 'startxref\n' + pos + '\n%%EOF\n');
  return new TextEncoder().encode(parts.join('')).buffer as ArrayBuffer;
}

describe('parsePdfFile (integration)', () => {
  it('extracts and parses a statement PDF end to end', async () => {
    const hdr = [
      { text: 'Date', x: 54, y: 740 },
      { text: 'Particulars', x: 150, y: 740 },
      { text: 'UPI Reference Number', x: 250, y: 740 },
      { text: 'Debit', x: 330, y: 740 },
      { text: 'Credit', x: 400, y: 740 },
      { text: 'Balance', x: 470, y: 740 }
    ];
    const r1 = [
      { text: '12 Mar 2024', x: 54, y: 715 },
      { text: 'PAID TO', x: 150, y: 715 },
      { text: 'SWIGGY', x: 200, y: 715 },
      { text: '400869145608', x: 260, y: 715 },
      { text: '250.00', x: 330, y: 715 },
      { text: '-', x: 400, y: 715 },
      { text: '10123.45', x: 470, y: 715 }
    ];
    const r2 = [
      { text: '14 Mar 2024', x: 54, y: 692 },
      { text: 'REFUND FROM', x: 150, y: 692 },
      { text: 'FLIPKART', x: 220, y: 692 },
      { text: '400869777111', x: 260, y: 692 },
      { text: '-', x: 330, y: 692 },
      { text: '499.00', x: 400, y: 692 },
      { text: '10622.45', x: 470, y: 692 }
    ];
    const r3 = [
      { text: '15 Mar 2024', x: 54, y: 669 },
      { text: 'TRANSFER', x: 150, y: 669 },
      { text: 'GPAY', x: 220, y: 669 },
      { text: '400869999333', x: 260, y: 669 },
      { text: '200.00', x: 330, y: 669 },
      { text: '-', x: 400, y: 669 },
      { text: '10422.45', x: 470, y: 669 }
    ];
    const foot = [
      { text: 'Total record count', x: 150, y: 640 },
      { text: '3', x: 340, y: 640 }
    ];

    const buf = makePdf([hdr, r1, r2, r3, foot]);
    const rows = await parsePdfFile(buf);

    expect(rows.length).toBe(3);
    expect(rows[0]).toMatchObject({ date: '2024-03-12', type: 'debit', amount: 250, balance: 10123.45, upiRef: '400869145608' });
    expect(rows[0].description.toLowerCase()).toContain('swiggy');
    expect(rows[1]).toMatchObject({ date: '2024-03-14', type: 'credit', amount: 499, balance: 10622.45, upiRef: '400869777111' });
    expect(rows[2]).toMatchObject({ date: '2024-03-15', type: 'debit', amount: 200, balance: 10422.45, upiRef: '400869999333' });
  });
});