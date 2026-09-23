import { useState } from 'react';
import { db } from '../db';
import type { Transaction, TxType } from '../types';
import { CATEGORIES } from '../lib/categories';
import { dayStamp, parseDateToken } from '../lib/parseShared';
import { todayStr } from '../lib/format';
import { toast } from '../lib/toast';
import { X, Trash2, Check } from 'lucide-react';

const RAISED    = '7px 7px 16px rgba(163,177,198,0.55), -7px -7px 16px rgba(255,255,255,0.85)';
const RAISED_SM = '5px 5px 12px rgba(163,177,198,0.55), -5px -5px 12px rgba(255,255,255,0.85)';
const INSET     = 'inset 5px 5px 10px rgba(163,177,198,0.55), inset -5px -5px 10px rgba(255,255,255,0.85)';
const INSET_SM  = 'inset 3px 3px 7px rgba(163,177,198,0.55), inset -3px -3px 7px rgba(255,255,255,0.85)';
const BASE = '#e6e9ef';
const H1   = '#2f3542';
const H2   = '#5b6272';
const H3   = '#8991a0';
const ACC  = '#1a9e75';

const inputStyle: React.CSSProperties = {
  background: BASE, boxShadow: INSET, border: 'none', color: H1,
  borderRadius: 16, padding: '10px 16px', fontSize: '0.75rem', fontWeight: 600,
  width: '100%'
};

export function TxModal({ initial, onClose }: { initial?: Transaction; onClose: () => void }) {
  const [date,        setDate]        = useState(initial?.date                  ?? todayStr());
  const [description, setDescription] = useState(initial?.description            ?? '');
  const [type,        setType]        = useState<TxType>(initial?.type           ?? 'debit');
  const [amount,      setAmount]      = useState(initial ? String(initial.amount) : '');
  const [category,    setCategory]    = useState(initial?.category               ?? 'Other');
  const [upiRef,      setUpiRef]      = useState(initial?.upiRef                 ?? '');
  const [balance,     setBalance]     = useState(initial?.balance != null ? String(initial.balance) : '');
  const [failed,      setFailed]      = useState(initial?.failed                 ?? false);
  const [busy,        setBusy]        = useState(false);

  const save = async () => {
    const parsedDate = parseDateToken(date);
    const amt = parseFloat(amount);
    if (!parsedDate) { toast('Enter a valid date (YYYY-MM-DD)', 'error'); return; }
    if (!isFinite(amt) || amt <= 0) { toast('Enter a valid amount', 'error'); return; }
    setBusy(true);
    try {
      const tx: Transaction = {
        ...(initial ? { id: initial.id } : {}),
        date: parsedDate, ts: dayStamp(parsedDate),
        description: description.trim() || 'Unnamed transaction',
        upiRef: upiRef.trim(), type, amount: amt,
        balance: balance.trim() ? parseFloat(balance) : undefined,
        category, failed,
        source: initial?.source ?? 'manual',
        importId: initial?.importId,
        createdAt: initial?.createdAt ?? Date.now()
      };
      await db.transactions.put(tx);
      toast(initial ? 'Transaction updated' : 'Transaction added', 'success');
      onClose();
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!initial?.id) return;
    if (!window.confirm('Delete this transaction?')) return;
    await db.transactions.delete(initial.id);
    toast('Transaction deleted', 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(47,53,66,0.25)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Bottom sheet: raised on #e6e9ef, top corners pillowy 36px */}
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto pb-[calc(1.75rem+env(safe-area-inset-bottom))]"
        style={{
          background: BASE, boxShadow: RAISED,
          borderRadius: '36px 36px 0 0', padding: '1.5rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-extrabold" style={{ color: H1 }}>
            {initial ? 'Edit transaction' : 'New transaction'}
          </h3>
          <button
            onClick={onClose}
            data-sound="pop"
            style={{ width: 36, height: 36, borderRadius: 9999, background: BASE, boxShadow: RAISED_SM, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: H2 }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type segment (inset track, raised thumb) */}
          <div style={{ background: BASE, boxShadow: INSET, borderRadius: 20, padding: 6, display: 'flex' }}>
            {(['debit', 'credit'] as const).map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  data-sound="pop"
                  onClick={() => setType(t)}
                  style={{
                    flex: 1, borderRadius: 14, padding: '10px 0',
                    fontSize: '0.75rem', fontWeight: active ? 700 : 500,
                    background: active ? BASE : 'transparent',
                    boxShadow: active ? RAISED_SM : 'none',
                    border: 'none', transition: 'all 0.15s ease',
                    color: active ? H1 : H3
                  }}
                >
                  {t === 'debit' ? 'Money out' : 'Money in'}
                </button>
              );
            })}
          </div>

          {/* Date / Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: H3 }}>Date</label>
              <input style={inputStyle} className="focus:outline-none placeholder:text-[#8991a0]"
                value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
            <div>
              <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: H3 }}>Amount (₹)</label>
              <input style={inputStyle} className="focus:outline-none placeholder:text-[#8991a0]"
                type="number" inputMode="decimal" min="0.01" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: H3 }}>Description</label>
            <input style={inputStyle} className="focus:outline-none placeholder:text-[#8991a0]"
              value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Merchant or recipient" />
          </div>

          {/* Category / UPI Ref */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: H3 }}>Category</label>
              <select style={inputStyle} className="focus:outline-none"
                value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c} style={{ background: BASE }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: H3 }}>UPI Ref</label>
              <input style={inputStyle} className="focus:outline-none placeholder:text-[#8991a0]"
                value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="Reference" />
            </div>
          </div>

          {/* Balance */}
          <div>
            <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: H3 }}>Balance after (optional)</label>
            <input style={inputStyle} className="focus:outline-none placeholder:text-[#8991a0]"
              type="number" inputMode="decimal" step="0.01"
              value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="Running balance" />
          </div>

          {/* Failed toggle — inset track, accent thumb when on */}
          <div
            onClick={() => setFailed(!failed)}
            style={{
              background: BASE, borderRadius: 20, boxShadow: RAISED_SM,
              padding: '12px 16px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer'
            }}
          >
            <span className="text-xs font-semibold" style={{ color: H1 }}>Failed transaction</span>
            <div style={{
              width: 50, height: 28, borderRadius: 20,
              background: BASE, boxShadow: INSET_SM,
              padding: 3, display: 'flex', alignItems: 'center'
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 9999,
                background: failed ? ACC : BASE,
                boxShadow: failed
                  ? '2px 2px 6px rgba(26,158,117,0.35)'
                  : RAISED_SM,
                transform: failed ? 'translateX(22px)' : 'translateX(0)',
                transition: 'all 0.22s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {failed && <Check size={11} color="#fff" strokeWidth={3} />}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          {initial?.id && (
            <button
              onClick={remove}
              data-sound="delete"
              style={{
                width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                background: BASE, boxShadow: RAISED_SM, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#dc2626'
              }}
            >
              <Trash2 size={18} strokeWidth={2.2} />
            </button>
          )}

          <button
            onClick={save}
            disabled={busy}
            data-sound="success"
            className="neu-btn-accent flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:opacity-50"
            style={{ borderRadius: 9999 }}
          >
            <Check size={18} strokeWidth={2.8} /> Save transaction
          </button>
        </div>
      </div>
    </div>
  );
}