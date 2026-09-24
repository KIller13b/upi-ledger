import { db } from '../db';
import type { Budget } from '../types';

export async function getBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}

export async function getBudget(category: string): Promise<Budget | undefined> {
  return db.budgets.where('category').equals(category).first();
}

export async function setBudget(category: string, amount: number): Promise<void> {
  const existing = await getBudget(category);
  if (existing?.id) {
    await db.budgets.update(existing.id, { amount });
  } else {
    await db.budgets.add({ category, amount, createdAt: Date.now() });
  }
}

export async function deleteBudget(category: string): Promise<void> {
  await db.budgets.where('category').equals(category).delete();
}
