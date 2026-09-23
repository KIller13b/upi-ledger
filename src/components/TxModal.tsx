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
    'neu-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="neu-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 drop-shadow-sm">
            {initial ? 'Edit transaction' : 'Add transaction'}
          </h2>
          <button
            onClick={onClose}
            data-sound="pop"
            className="neu-btn flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Date</label>
              <input className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} placeholder="2026-09-22" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Amount (₹)</label>
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
            <label className="mb-1 block text-xs font-medium text-slate-400">Description</label>
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Swiggy order" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Type</label>
              <div className="neu-sunken flex rounded-xl p-1">
                <button
                  type="button"
                  data-sound="pop"
                  onClick={() => setType('debit')}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                    type === 'debit'
                      ? 'neu-card text-red-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Money out
                </button>
                <button
                  type="button"
                  data-sound="pop"
                  onClick={() => setType('credit')}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                    type === 'credit'
                      ? 'neu-card text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Money in
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Category</label>
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">UPI reference</label>
              <input className={inputCls} value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="400869145608" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Balance after (optional)</label>
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

          <label className="neu-sunken flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={failed}
              onChange={(e) => setFailed(e.target.checked)}
              className="h-4 w-4 rounded accent-red-500 cursor-pointer"
            />
            <span>Failed transaction (payment did not go through)</span>
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {initial?.id ? (
            <button
              onClick={remove}
              data-sound="delete"
              className="neu-btn-danger flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <Trash2 size={16} /> Delete
            </button>
          ) : null}
          <button
            onClick={save}
            disabled={busy}
            data-sound="success"
            className="neu-btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            <Save size={16} /> Save transaction
          </button>
        </div>
      </div>
    </div>
  );
}