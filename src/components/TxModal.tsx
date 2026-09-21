import { useState } from 'react';
import { db } from '../db';
import type { Transaction, TxType } from '../types';
import { CATEGORIES } from '../lib/categories';
import { dayStamp, parseDateToken } from '../lib/parseShared';
import { todayStr } from '../lib/format';
import { toast } from '../lib/toast';
import { X, Trash2, Save } from 'lucide-react';

export function TxModal({ initial, onClose }: { initial?: Transaction; onClose: () => void }) {
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<TxType>(initial?.type ?? 'debit');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [category, setCategory] = useState(initial?.category ?? 'Other');
  const [upiRef, setUpiRef] = useState(initial?.upiRef ?? '');
  const [balance, setBalance] = useState(initial?.balance != null ? String(initial.balance) : '');
  const [failed, setFailed] = useState(initial?.failed ?? false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const parsedDate = parseDateToken(date);
    const amt = parseFloat(amount);
    if (!parsedDate) {
      toast('Enter a valid date (YYYY-MM-DD)', 'error');
      return;
    }
    if (!isFinite(amt) || amt <= 0) {
      toast('Enter a valid amount', 'error');
      return;
    }
    setBusy(true);
    try {
      const tx: Transaction = {
        ...(initial ? { id: initial.id } : {}),
        date: parsedDate,
        ts: dayStamp(parsedDate),
        description: description.trim() || 'Unnamed transaction',
        upiRef: upiRef.trim(),
        type,
        amount: amt,
        balance: balance.trim() ? parseFloat(balance) : undefined,
        category,
        failed,
        source: initial?.source ?? 'manual',
        importId: initial?.importId,
        createdAt: initial?.createdAt ?? Date.now()
      };
      await db.transactions.put(tx);
      toast(initial ? 'Transaction updated' : 'Transaction added', 'success');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial?.id) return;
    if (!window.confirm('Delete this transaction?')) return;
    await db.transactions.delete(initial.id);
    toast('Transaction deleted', 'success');
    onClose();
  };

  const inputCls =
    'w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-slate-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">{initial ? 'Edit transaction' : 'Add transaction'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Date</label>
              <input className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} placeholder="2026-09-22" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Amount (₹)</label>
              <input
                className={inputCls}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Description</label>
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Swiggy order" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Type</label>
              <div className="flex overflow-hidden rounded-xl border border-slate-700">
                <button
                  onClick={() => setType('debit')}
                  className={`flex-1 py-2.5 text-sm font-medium ${type === 'debit' ? 'bg-red-500/20 text-red-300' : 'bg-slate-800/60 text-slate-400'}`}
                >
                  Money out
                </button>
                <button
                  onClick={() => setType('credit')}
                  className={`flex-1 py-2.5 text-sm font-medium ${type === 'credit' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800/60 text-slate-400'}`}
                >
                  Money in
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Category</label>
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">UPI reference</label>
              <input className={inputCls} value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="400869145608" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Balance after (optional)</label>
              <input
                className={inputCls}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="10250.50"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={failed} onChange={(e) => setFailed(e.target.checked)} className="h-4 w-4 accent-red-500" />
            Failed transaction (did not go through)
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          {initial?.id ? (
            <button
              onClick={remove}
              className="flex items-center gap-1.5 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-400"
            >
              <Trash2 size={15} /> Delete
            </button>
          ) : (
            <span className="flex-1" />
          )}
          <button
            onClick={save}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            <Save size={15} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}