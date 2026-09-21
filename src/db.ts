import Dexie, { type Table } from 'dexie';
import type { Transaction, CategoryRule, ImportBatch } from './types';

export class UpiDb extends Dexie {
  transactions!: Table<Transaction, number>;
  categoryRules!: Table<CategoryRule, number>;
  importBatches!: Table<ImportBatch, number>;

  constructor() {
    super('upi-ledger');
    this.version(1).stores({
      transactions: '++id, date, ts, type, category, upiRef, importId',
      categoryRules: '++id, keyword',
      importBatches: '++id, importedAt'
    });
  }
}

export const db = new UpiDb();