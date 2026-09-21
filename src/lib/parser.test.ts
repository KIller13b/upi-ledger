import { describe, it, expect } from 'vitest';
import { parseGpayLines, type PLine } from './gpayPdf';
import { parseCsvText } from './csv';

function item(str: string, x: number, w: number) {
  return { str, x, y: 600, w };
}

function stmtLine(text: string): PLine {
  return { y: 600, text, items: [] };
}

const HEADER: PLine = {
  y: 700,
  text: 'Date Particulars UPI Reference Number Debit Credit Balance',
  items: [
    { str: 'Date', x: 10, y: 700, w: 30 },
    { str: 'Particulars', x: 60, y: 700, w: 60 },
    { str: 'UPI Reference Number', x: 140, y: 700, w: 90 },
    { str: 'Debit', x: 330, y: 700, w: 30 },
    { str: 'Credit', x: 390, y: 700, w: 30 },
    { str: 'Balance', x: 450, y: 700, w: 40 }
  ]
};

function makeLine(items: Array<{ str: string; x: number; w: number }>): PLine {
  const text = items.map((i) => i.str).join(' ');
  return { y: 600, text, items: items.map((i) => ({ ...i, y: 600 })) };
}

describe('parseGpayLines', () => {
  it('parses a debit row using column positions', () => {
    const lines = [
      stmtLine('Statement Period : 01 Mar 2024 to 31 Mar 2024'),
      stmtLine('Account : HDFC Bank'),
      HEADER,
      makeLine([
        item('12 Mar 2024', 5, 70),
        item('400869145608', 145, 80),
        item('PAID TO', 60, 45),
        item('SWIGGY RESTAURANTS', 110, 90),
        item('\u20b9250.00', 325, 50),
        item('-', 390, 12),
        item('\u20b910,123.45', 445, 60)
      ]),
      stmtLine('Total: \u20b9250.00 Grand Total Done')
    ];

    const rows = parseGpayLines(lines);
    expect(rows.length).toBe(1);
    const r = rows[0];
    expect(r.date).toBe('2024-03-12');
    expect(r.type).toBe('debit');
    expect(r.amount).toBe(250);
    expect(r.balance).toBe(10123.45);
    expect(r.upiRef).toBe('400869145608');
    expect(r.description.toLowerCase()).toContain('swiggy');
  });

  it('parses a credit row and skips the totals line', () => {
    const lines = [
      HEADER,
      makeLine([
        item('14 Mar 2024', 5, 70),
        item('400869777111', 145, 80),
        item('REFUND', 60, 40),
        item('FROM FLIPKART', 105, 80),
        item('-', 330, 12),
        item('\u20b9499.00', 390, 50),
        item('\u20b910,622.45', 445, 60)
      ]),
      stmtLine('Total record count: 1')
    ];
    const rows = parseGpayLines(lines);
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe('credit');
    expect(rows[0].amount).toBe(499);
    expect(rows[0].balance).toBe(10622.45);
  });

  it('flags failed transactions', () => {
    const lines = [
      HEADER,
      makeLine([
        item('15 Mar 2024', 5, 70),
        item('400869111222', 145, 80),
        item('PAYMENT TO XYZ FAILED', 60, 110),
        item('\u20b91,000.00', 325, 55),
        item('-', 390, 12),
        item('\u20b910,622.45', 445, 60)
      ])
    ];
    const rows = parseGpayLines(lines);
    expect(rows[0].failed).toBe(true);
  });

  it('guesses debit/credit from keywords when no column header', () => {
    const lines = [
      makeLine([
        item('12 Mar 2024', 5, 70),
        item('PAID TO CHAI SHOP', 60, 90),
        item('\u20b920.00', 300, 50),
        item('\u20b95,000.00', 380, 60)
      ]),
      makeLine([
        item('13 Mar 2024', 5, 70),
        item('RECEIVED FROM RENT', 60, 90),
        item('\u20b915,000.00', 300, 60),
        item('\u20b920,000.00', 380, 60)
      ])
    ];
    const rows = parseGpayLines(lines);
    expect(rows[0].type).toBe('debit');
    expect(rows[0].amount).toBe(20);
    expect(rows[1].type).toBe('credit');
    expect(rows[1].amount).toBe(15000);
    expect(rows[1].balance).toBe(20000);
  });
});

describe('parseCsvText', () => {
  it('maps a bank statement CSV', () => {
    const csv = `Txn Date,Narration,Ref No,Withdrawal Amt,Deposit Amt,Balance
12/03/2024,SWIGGY ZOMATO EXP,UPI 400869145608,250.00,,10123.45
14/03/2024,REFUND FROM FLIPKART,UPI 400869777111,,499.00,10622.45`;
    const rows = parseCsvText(csv);
    expect(rows.length).toBe(2);
    expect(rows[0].type).toBe('debit');
    expect(rows[0].amount).toBe(250);
    expect(rows[1].type).toBe('credit');
    expect(rows[1].amount).toBe(499);
  });

  it('skips junk rows', () => {
    const csv = `date,description,debit,credit,balance
01/01/2024,something,100,,
02/01/2024,refund,,50,`;
    const rows = parseCsvText(csv);
    expect(rows.length).toBe(2);
  });
});