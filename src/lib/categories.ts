import type { TxType } from '../types';

export interface Tx {
  keyword: string;
  category: string;
}

export const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Shopping',
  'Bills & Recharges',
  'Entertainment',
  'Health & Medical',
  'Travel',
  'Rent & Housing',
  'Investments',
  'Transfers',
  'Income & Refunds',
  'Other'
] as const;

export const DEFAULT_RULES: Tx[] = [
  { keyword: 'swiggy', category: 'Food & Dining' },
  { keyword: 'zomato', category: 'Food & Dining' },
  { keyword: 'eat', category: 'Food & Dining' },
  { keyword: 'food', category: 'Food & Dining' },
  { keyword: 'pizza', category: 'Food & Dining' },
  { keyword: 'burger', category: 'Food & Dining' },
  { keyword: 'domin', category: 'Food & Dining' },
  { keyword: 'mcdonald', category: 'Food & Dining' },
  { keyword: 'starbucks', category: 'Food & Dining' },
  { keyword: 'cafe', category: 'Food & Dining' },
  { keyword: 'restaurant', category: 'Food & Dining' },
  { keyword: 'biryani', category: 'Food & Dining' },
  { keyword: 'bigbasket', category: 'Groceries' },
  { keyword: 'dmart', category: 'Groceries' },
  { keyword: 'reliance fresh', category: 'Groceries' },
  { keyword: 'zepto', category: 'Groceries' },
  { keyword: 'blinkit', category: 'Groceries' },
  { keyword: 'instamart', category: 'Groceries' },
  { keyword: 'grocer', category: 'Groceries' },
  { keyword: 'uber', category: 'Transport' },
  { keyword: 'ola', category: 'Transport' },
  { keyword: 'rapido', category: 'Transport' },
  { keyword: 'redbus', category: 'Transport' },
  { keyword: 'irctc', category: 'Transport' },
  { keyword: 'railway', category: 'Transport' },
  { keyword: 'metro', category: 'Transport' },
  { keyword: 'petrol', category: 'Transport' },
  { keyword: 'fuel', category: 'Transport' },
  { keyword: 'indian oil', category: 'Transport' },
  { keyword: 'hp petrol', category: 'Transport' },
  { keyword: 'bharat petrol', category: 'Transport' },
  { keyword: 'cab', category: 'Transport' },
  { keyword: 'jio', category: 'Bills & Recharges' },
  { keyword: 'airtel', category: 'Bills & Recharges' },
  { keyword: 'vodafone', category: 'Bills & Recharges' },
  { keyword: 'vi recharge', category: 'Bills & Recharges' },
  { keyword: 'idea', category: 'Bills & Recharges' },
  { keyword: 'recharge', category: 'Bills & Recharges' },
  { keyword: 'electricity', category: 'Bills & Recharges' },
  { keyword: 'bijli', category: 'Bills & Recharges' },
  { keyword: 'dish', category: 'Bills & Recharges' },
  { keyword: 'broadband', category: 'Bills & Recharges' },
  { keyword: 'wifi', category: 'Bills & Recharges' },
  { keyword: 'gas', category: 'Bills & Recharges' },
  { keyword: 'water', category: 'Bills & Recharges' },
  { keyword: 'dth', category: 'Bills & Recharges' },
  { keyword: 'tata play', category: 'Bills & Recharges' },
  { keyword: 'prepaid', category: 'Bills & Recharges' },
  { keyword: 'flipkart', category: 'Shopping' },
  { keyword: 'amazon', category: 'Shopping' },
  { keyword: 'myntra', category: 'Shopping' },
  { keyword: 'meesho', category: 'Shopping' },
  { keyword: 'ajio', category: 'Shopping' },
  { keyword: 'shopping', category: 'Shopping' },
  { keyword: 'clothing', category: 'Shopping' },
  { keyword: 'shoe', category: 'Shopping' },
  { keyword: 'electronics', category: 'Shopping' },
  { keyword: 'mobile store', category: 'Shopping' },
  { keyword: 'netflix', category: 'Entertainment' },
  { keyword: 'spotify', category: 'Entertainment' },
  { keyword: 'prime video', category: 'Entertainment' },
  { keyword: 'hotstar', category: 'Entertainment' },
  { keyword: 'jiosaavn', category: 'Entertainment' },
  { keyword: 'youtube premium', category: 'Entertainment' },
  { keyword: 'bookmyshow', category: 'Entertainment' },
  { keyword: 'steam', category: 'Entertainment' },
  { keyword: 'pubg', category: 'Entertainment' },
  { keyword: 'play store', category: 'Entertainment' },
  { keyword: 'hospital', category: 'Health & Medical' },
  { keyword: 'doctor', category: 'Health & Medical' },
  { keyword: 'clinic', category: 'Health & Medical' },
  { keyword: 'medicine', category: 'Health & Medical' },
  { keyword: 'pharmacy', category: 'Health & Medical' },
  { keyword: 'apollo pharma', category: 'Health & Medical' },
  { keyword: '1mg', category: 'Health & Medical' },
  { keyword: 'netmeds', category: 'Health & Medical' },
  { keyword: 'train', category: 'Travel' },
  { keyword: 'flight', category: 'Travel' },
  { keyword: 'makemytrip', category: 'Travel' },
  { keyword: 'make my trip', category: 'Travel' },
  { keyword: 'goibibo', category: 'Travel' },
  { keyword: 'hotel', category: 'Travel' },
  { keyword: 'oyo', category: 'Travel' },
  { keyword: 'airline', category: 'Travel' },
  { keyword: 'rent', category: 'Rent & Housing' },
  { keyword: 'landlord', category: 'Rent & Housing' },
  { keyword: 'mutual fund', category: 'Investments' },
  { keyword: 'groww', category: 'Investments' },
  { keyword: 'zerodha', category: 'Investments' },
  { keyword: 'upstox', category: 'Investments' },
  { keyword: 'insurance', category: 'Investments' },
  { keyword: 'sip', category: 'Investments' },
  { keyword: 'fd', category: 'Investments' },
  { keyword: 'self transfer', category: 'Transfers' },
  { keyword: 'self', category: 'Transfers' },
  { keyword: 'to self', category: 'Transfers' },
  { keyword: 'transfer', category: 'Transfers' },
  { keyword: 'salary', category: 'Income & Refunds' },
  { keyword: 'refund', category: 'Income & Refunds' },
  { keyword: 'cashback', category: 'Income & Refunds' },
  { keyword: 'received', category: 'Income & Refunds' },
  { keyword: 'receive', category: 'Income & Refunds' },
  { keyword: 'bonus', category: 'Income & Refunds' },
  { keyword: 'freelance', category: 'Income & Refunds' }
];

export const DEFAULT_CATEGORY = 'Other';

export function categorize(desc: string, type: TxType, rules: Tx[]): string {
  const text = desc.toLowerCase();
  if (type === 'credit') {
    for (const r of rules) {
      if (r.category === 'Income & Refunds' && text.includes(r.keyword)) return r.category;
    }
    return 'Income & Refunds';
  }
  for (const r of rules) {
    if (text.includes(r.keyword)) return r.category;
  }
  return DEFAULT_CATEGORY;
}