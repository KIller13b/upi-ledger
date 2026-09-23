import { useState } from 'react';
import { db } from '../db';
import type { Transaction, TxType } from '../types';
import { CATEGORIES } from '../lib/categories';
import { dayStamp, parseDateToken } from '../lib/parseShared';
import { todayStr } from '../lib/format';
import { toast } from '../lib/toast';
import { X, Trash2, Check } from 'lucide-react';

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
    'neu-input w-full rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 backdrop-blur-sm" onClick={onClose}>
      {/* Neumorphic bottom sheet with 32px top radius and base color */}
      <div
        className="neu-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[36px] p-6 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
            {initial ? 'Edit transaction' : 'New transaction'}
          </h3>
          <button
            onClick={onClose}
            data-sound="pop"
            className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-500 hover:text-slate-700"
          >
            <X size={17} strokeWidth={2.4} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Segmented type toggle (Money out / Money in) in inset track */}
          <div className="neu-inset flex rounded-full p-1.5">
            <button
              type="button"
              data-sound="pop"
              onClick={() => setType('debit')}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all ${
                type === 'debit'
                  ? 'neu-btn text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Money out
            </button>
            <button
              type="button"
              data-sound="pop"
              onClick={() => setType('credit')}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all ${
                type === 'credit'
                  ? 'neu-btn text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Money in
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Date</label>
              <input className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Amount (₹)</label>
              <input
                className={inputCls}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Description</label>
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Merchant or recipient" />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Category</label>
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#eef1f5]">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">UPI Ref</label>
              <input className={inputCls} value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="Reference number" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Balance after (optional)</label>
            <input
              className={inputCls}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="Running balance"
            />
          </div>

          {/* Neumorphic toggle switch for failed transaction */}
          <div
            onClick={() => setFailed(!failed)}
            className="neu-card-sm flex items-center justify-between rounded-2xl p-3.5 cursor-pointer"
          >
            <span className="text-xs font-semibold text-slate-700">Failed transaction</span>
            <div className={`neu-inset h-7 w-12 rounded-full p-0.5 flex items-center transition-colors ${failed ? 'bg-[#ff5238]/20' : ''}`}>
              <div
                className={`h-6 w-6 rounded-full transition-transform duration-200 flex items-center justify-center ${
                  failed
                    ? 'translate-x-5 bg-[#ff5238] text-white shadow-sm'
                    : 'translate-x-0 neu-btn text-slate-400'
                }`}
              >
                {failed && <Check size={12} strokeWidth={3} />}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center gap-3">
          {initial?.id ? (
            <button
              onClick={remove}
              data-sound="delete"
              className="neu-btn-circle flex h-12 w-12 shrink-0 items-center justify-center text-[#ff5238]"
              title="Delete transaction"
            >
              <Trash2 size={18} strokeWidth={2.2} />
            </button>
          ) : null}

          {/* Vivid accent button reserved for primary save action */}
          <button
            onClick={save}
            disabled={busy}
            data-sound="success"
            className="neu-accent-btn flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 px-6 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          >
            <Check size={18} strokeWidth={2.8} /> Save transaction
          </button>
        </div>
      </div>
    </div>
  );
}