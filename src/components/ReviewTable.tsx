import { useState } from 'react';
import type { Candidate } from '../lib/import';
import { CATEGORIES } from '../lib/categories';
import { fmtRupee, fmtDate } from '../lib/format';
import { dayStamp } from '../lib/parseShared';
import { ChevronDown, ChevronUp, Copy, AlertTriangle, Check } from 'lucide-react';

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

  const label = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1';
  const input =
    'neu-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none';

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {cur.map((c, slot) => {
          const i = page * per + slot;
          const open = expanded.has(i);
          const bad = !!c.note;
          return (
            <div
              key={i}
              className={`neu-card-sm rounded-[24px] p-3 transition-all ${
                c.sel ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Circular soft checkbox control */}
                <button
                  type="button"
                  data-sound="pop"
                  onClick={() => onPatch(i, { ...c, sel: !c.sel })}
                  className="shrink-0 p-1"
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                      c.sel ? 'neu-accent-circle text-white' : 'neu-inset text-transparent'
                    }`}
                  >
                    {c.sel && <Check size={14} strokeWidth={3} />}
                  </div>
                </button>

                <div
                  className="flex flex-1 flex-col gap-0.5 cursor-pointer min-w-0"
                  onClick={() => onToggleExpand(i)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                      {c.tx.type === 'debit' ? 'Out' : 'In'}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {c.tx.type === 'debit' ? '−' : '+'}
                      {fmtRupee(c.tx.amount)}
                    </span>
                    {bad && <AlertTriangle size={12} className="text-[#ff5238]" />}
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      {fmtDate(c.tx.date)}
                      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </div>
                  <div className="truncate text-xs font-semibold text-slate-700">{c.tx.description || '\u2014'}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                    <span>{c.tx.category}</span>
                    {c.dup && (
                      <span className="inline-flex items-center gap-1 text-[#ff5238] font-bold">
                        <Copy size={9} /> duplicate
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {open && (
                <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-slate-300/40 sm:grid-cols-3">
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
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-[#ff5238]"
                          checked={c.tx.failed}
                          onChange={(e) => onPatch(i, { ...c, tx: { ...c.tx, failed: e.target.checked } })}
                        />
                        Failed
                      </label>
                    </div>
                  )}
                  {c.note && (
                    <div className="col-span-2 flex items-center gap-1.5 rounded-xl bg-orange-100/70 px-3 py-1.5 text-[11px] font-semibold text-[#ff5238] sm:col-span-3">
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
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500 font-medium">
          <button
            disabled={page === 0}
            data-sound="pop"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="neu-btn rounded-full px-5 py-2 font-bold disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {page + 1} / {pages}
          </span>
          <button
            disabled={page >= pages - 1}
            data-sound="pop"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            className="neu-btn rounded-full px-5 py-2 font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}