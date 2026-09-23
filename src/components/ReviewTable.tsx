import { useState } from 'react';
import type { Candidate } from '../lib/import';
import { CATEGORIES } from '../lib/categories';
import { fmtRupee, fmtDate } from '../lib/format';
import { dayStamp } from '../lib/parseShared';
import { ChevronDown, ChevronUp, Copy, AlertTriangle } from 'lucide-react';

export function ReviewTable({
  cands,
  onPatch,
  expanded,
  onToggleExpand
}: {
  cands: Candidate[];
  onPatch: (i: number, patch: Candidate) => void;
  expanded: Set<number>;
  onToggleExpand: (i: number) => void;
}) {
  const [page, setPage] = useState(0);
  const per = 60;
  const pages = Math.max(1, Math.ceil(cands.length / per));
  const cur = cands.slice(page * per, page * per + per);

  const label = 'block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1';
  const input =
    'neu-input w-full rounded-xl px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none';

  return (
    <div>
      <div className="mb-3 space-y-2">
        {cur.map((c, slot) => {
          const i = page * per + slot;
          const open = expanded.has(i);
          const bad = !!c.note;
          return (
            <div
              key={i}
              className={`neu-card overflow-hidden rounded-2xl transition-all ${
                c.sel ? 'border-emerald-500/30' : 'opacity-60'
              }`}
            >
              <div className="flex items-stretch">
                <button
                  data-sound="pop"
                  className={`flex w-12 items-center justify-center border-r border-white/[0.04] transition-colors ${
                    c.sel ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                  onClick={() => onPatch(i, { ...c, sel: !c.sel })}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg transition-all ${
                      c.sel ? 'neu-btn-primary text-slate-950' : 'neu-sunken border border-slate-700'
                    }`}
                  >
                    {c.sel && (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[3]" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>

                <div
                  className="flex flex-1 flex-col gap-1 px-3.5 py-3 cursor-pointer"
                  onClick={() => onToggleExpand(i)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide ${
                        c.tx.type === 'debit' ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {c.tx.type === 'debit' ? 'Out' : 'In'}
                    </span>
                    <span className="text-sm font-bold text-slate-100">
                      {c.tx.type === 'debit' ? '−' : '+'}
                      {fmtRupee(c.tx.amount)}
                    </span>
                    {bad && <AlertTriangle size={12} className="text-amber-400" />}
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
                      {fmtDate(c.tx.date)}
                      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </div>
                  <div className="truncate text-xs font-medium text-slate-300">{c.tx.description || '\u2014'}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="neu-sunken rounded-md px-1.5 py-0.5 font-medium text-slate-300">
                      {c.tx.category}
                    </span>
                    {c.dup && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-400">
                        <Copy size={9} /> duplicate
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {open && (
                <div className="grid grid-cols-2 gap-2.5 border-t border-white/[0.04] p-3.5 sm:grid-cols-3">
                  <div>
                    <span className={label}>Date (YYYY-MM-DD)</span>
                    <input
                      className={input}
                      value={c.tx.date}
                      onChange={(e) => {
                        const d = e.target.value;
                        onPatch(i, { ...c, tx: { ...c.tx, date: d, ts: dayStamp(d || '1970-01-01') } });
                      }}
                    />
                  </div>
                  <div>
                    <span className={label}>Amount (₹)</span>
                    <input
                      className={input}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={c.tx.amount}
                      onChange={(e) =>
                        onPatch(i, { ...c, tx: { ...c.tx, amount: Math.abs(parseFloat(e.target.value) || 0) } })
                      }
                    />
                  </div>
                  <div>
                    <span className={label}>Balance</span>
                    <input
                      className={input}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={c.tx.balance ?? ''}
                      onChange={(e) =>
                        onPatch(i, {
                          ...c,
                          tx: { ...c.tx, balance: e.target.value.trim() ? parseFloat(e.target.value) : undefined }
                        })
                      }
                    />
                  </div>
                  <div>
                    <span className={label}>Type</span>
                    <select
                      className={input}
                      value={c.tx.type}
                      onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, type: e.target.value as 'debit' | 'credit' } })}
                    >
                      <option value="debit">Money out</option>
                      <option value="credit">Money in</option>
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <span className={label}>Category</span>
                    <select
                      className={input}
                      value={c.tx.category}
                      onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, category: e.target.value } })}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className={label}>Description</span>
                    <input
                      className={input}
                      value={c.tx.description}
                      onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, description: e.target.value } })}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <span className={label}>UPI reference</span>
                    <input
                      className={input}
                      value={c.tx.upiRef}
                      onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, upiRef: e.target.value } })}
                    />
                  </div>
                  {c.tx.balance == null && (
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-red-500 cursor-pointer"
                          checked={c.tx.failed}
                          onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, failed: e.target.checked } })}
                        />
                        Failed
                      </label>
                    </div>
                  )}
                  {c.note && (
                    <div className="col-span-2 flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300 sm:col-span-3">
                      <AlertTriangle size={12} /> {c.note}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2 pb-1 text-xs text-slate-400">
          <button
            disabled={page === 0}
            data-sound="pop"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="neu-btn rounded-xl px-4 py-2 font-medium disabled:opacity-30"
          >
            Prev
          </button>
          <span className="font-medium text-slate-400">
            Page {page + 1} / {pages}
          </span>
          <button
            disabled={page >= pages - 1}
            data-sound="pop"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            className="neu-btn rounded-xl px-4 py-2 font-medium disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}