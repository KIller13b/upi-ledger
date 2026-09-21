export type TxType = 'debit' | 'credit';

export interface Transaction {
  id?: number;
  date: string;
  ts: number;
  description: string;
  upiRef: string;
  type: TxType;
  amount: number;
  balance?: number;
  category: string;
  failed: boolean;
  source: 'gpay' | 'csv' | 'manual';
  importId?: number;
  createdAt: number;
}

export interface CategoryRule {
  id?: number;
  keyword: string;
  category: string;
}

export interface ImportBatch {
  id?: number;
  filename: string;
  importedAt: number;
  count: number;
  skipped: number;
}

export type TabId = 'dashboard' | 'transactions' | 'import' | 'settings';