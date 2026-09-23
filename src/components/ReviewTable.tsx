import { useState } from 'react';
import type { Candidate } from '../lib/import';
import { CATEGORIES } from '../lib/categories';
import { fmtRupee, fmtDate } from '../lib/format';
import { dayStamp } from '../lib/parseShared';
import { ChevronDown, ChevronUp, Copy, AlertTriangle, Check } from 'lucide-react';

const RAISED_SM = '5px 5px 12px rgba(163,177,198,0.55), -5px -5px 12px rgba(255,255,255,0.85)';
// (INSET not used — rows use INSET_SM instead)
const INSET_SM  = 'inset 3px 3px 7px rgba(163,177,198,0.55), inset -3px -3px 7px rgba(255,255,255,0.85)';
const BASE = '#e6e9ef';
const H1   = '#2f3542';
const H2   = '#5b6272';
const H3   = '#8991a0';
const ACC  = '#1a9e75';

const inputSt: React.CSSProperties = {
  background: BASE, boxShadow: INSET_SM, border: 'none', color: H1,
  borderRadius: 12, padding: '8px 12px', fontSize: '0.7rem', fontWeight: 600, width: '100%'
};

export function ReviewTable({ cands, onPatch, expanded, onToggleExpand }:
  { cands: Candidate[]; onPatch: (i: number, c: Candidate) => void; expanded: Set<number>; onToggleExpand: (i: number) => void }) {
  const [page, setPage] = useState(0);
  const per   = 60;
  const pages = Math.max(1, Math.ceil(cands.length / per));
  const cur   = cands.slice(page * per, page * per + per);

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {cur.map((c, slot) => {
          const i    = page * per + slot;
          const open = expanded.has(i);
          return (
            <div
              key={i}
              style={{
                background: BASE, borderRadius: 22,
                boxShadow: RAISED_SM,
                opacity: c.sel ? 1 : 0.55,
                transition: 'opacity 0.15s ease'
              }}
            >
              <div className="flex items-center gap-3 p-3.5">
                {/* Circular checkbox: raised → pressed accent when checked */}
                <button
                  type="button"
                  data-sound="pop"
                  onClick={() => onPatch(i, { ...c, sel: !c.sel })}
                  style={{
                    width: 32, height: 32, borderRadius: 9999, flexShrink: 0, border: 'none',
                    background: c.sel ? ACC : BASE,
                    boxShadow: c.sel
                      ? '3px 3px 8px rgba(26,158,117,0.3), -2px -2px 6px rgba(255,255,255,0.85)'
                      : INSET_SM,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {c.sel && <Check size={14} color="#fff" strokeWidth={3} />}
                </button>

                {/* Row summary — tap to expand */}
                <div className="flex flex-1 flex-col gap-0.5 cursor-pointer min-w-0" onClick={() => onToggleExpand(i)}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: H3 }}>
                      {c.tx.type === 'debit' ? 'Out' : 'In'}
                    </span>
                    <span className="text-sm font-extrabold tracking-tight" style={{ color: H1 }}>
                      {c.tx.type === 'debit' ? '−' : '+'}{fmtRupee(c.tx.amount)}
                    </span>
                    {!!c.note && <AlertTriangle size={11} style={{ color: '#f59e0b' }} />}
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-medium" style={{ color: H3 }}>
                      {fmtDate(c.tx.date)}
                      {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                  </div>
                  <div className="truncate text-xs font-semibold" style={{ color: H2 }}>{c.tx.description || '—'}</div>
                  <div className="flex items-center gap-2" style={{ fontSize: '0.67rem', color: H3, fontWeight: 500 }}>
                    <span>{c.tx.category}</span>
                    {c.dup && (
                      <span className="inline-flex items-center gap-1 font-bold" style={{ color: '#f59e0b' }}>
                        <Copy size={9} /> duplicate
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded edit fields */}
              {open && (
                <div
                  className="grid grid-cols-2 gap-2.5 p-3.5 pt-2 sm:grid-cols-3"
                  style={{ borderTop: '1px solid rgba(163,177,198,0.2)' }}
                >
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: H3 }}>Date</span>
                    <input style={inputSt} className="focus:outline-none" type="date" value={c.tx.date}
                      onChange={(e) => { const d = e.target.value; onPatch(i, { ...c, tx: { ...c.tx, date: d, ts: dayStamp(d || '1970-01-01') } }); }} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: H3 }}>Amount (₹)</span>
                    <input style={inputSt} className="focus:outline-none" type="number" inputMode="decimal" min="0" step="0.01"
                      value={c.tx.amount} onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, amount: Math.abs(parseFloat(e.target.value) || 0) } })} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: H3 }}>Balance</span>
                    <input style={inputSt} className="focus:outline-none" type="number" inputMode="decimal" step="0.01"
                      value={c.tx.balance ?? ''}
                      onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, balance: e.target.value.trim() ? parseFloat(e.target.value) : undefined } })} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: H3 }}>Type</span>
                    <select style={inputSt} className="focus:outline-none" value={c.tx.type}
                      onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, type: e.target.value as 'debit' | 'credit' } })}>
                      <option value="debit">Money out</option>
                      <option value="credit">Money in</option>
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: H3 }}>Category</span>
                    <select style={inputSt} className="focus:outline-none" value={c.tx.category}
                      onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, category: e.target.value } })}>
                      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: H3 }}>Description</span>
                    <input style={inputSt} className="focus:outline-none" value={c.tx.description}
                      onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, description: e.target.value } })} />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: H3 }}>UPI reference</span>
                    <input style={inputSt} className="focus:outline-none" value={c.tx.upiRef}
                      onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, upiRef: e.target.value } })} />
                  </div>
                  {c.tx.balance == null && (
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.7rem', fontWeight: 600, color: H2 }}>
                        <input type="checkbox" className="h-4 w-4 rounded" style={{ accentColor: ACC }}
                          checked={c.tx.failed} onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, failed: e.target.checked } })} />
                        Failed
                      </label>
                    </div>
                  )}
                  {c.note && (
                    <div className="col-span-2 flex items-center gap-1.5 rounded-xl px-3 py-1.5 sm:col-span-3"
                      style={{ background: 'rgba(245,158,11,0.08)', fontSize: '0.68rem', fontWeight: 600, color: '#b45309' }}>
                      <AlertTriangle size={11} /> {c.note}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2">
          <button disabled={page === 0} data-sound="pop"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{ background: BASE, borderRadius: 9999, boxShadow: RAISED_SM, border: 'none', padding: '8px 20px', fontSize: '0.72rem', fontWeight: 700, color: H2, opacity: page === 0 ? 0.38 : 1 }}>
            Prev
          </button>
          <span className="text-xs font-semibold" style={{ color: H3 }}>Page {page + 1} / {pages}</span>
          <button disabled={page >= pages - 1} data-sound="pop"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            style={{ background: BASE, borderRadius: 9999, boxShadow: RAISED_SM, border: 'none', padding: '8px 20px', fontSize: '0.72rem', fontWeight: 700, color: H2, opacity: page >= pages - 1 ? 0.38 : 1 }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}