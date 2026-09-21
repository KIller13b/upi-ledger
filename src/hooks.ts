import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { DEFAULT_RULES, type Tx } from './lib/categories';

export function useRules() {
  const custom =
    useLiveQuery(() => db.categoryRules.toArray().then((rows) => rows.map((r) => ({ keyword: r.keyword, category: r.category }))), []) ??
    [];

  const addRule = useCallback(async (keyword: string, category: string) => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return false;
    const exists = await db.categoryRules.where('keyword').equals(kw).count();
    if (exists > 0) return false;
    await db.categoryRules.add({ keyword: kw, category });
    return true;
  }, []);

  const removeRule = useCallback(async (keyword: string) => {
    const rows = await db.categoryRules.where('keyword').equals(keyword).toArray();
    for (const r of rows) await db.categoryRules.delete(r.id as number);
  }, []);

  const effective: Tx[] = [...custom, ...DEFAULT_RULES];
  return { rules: effective, addRule, removeRule, custom };
}