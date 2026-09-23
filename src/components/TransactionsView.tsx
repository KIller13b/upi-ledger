import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Transaction } from '../types';
import { fmtRupee, fmtDate, monthKey, monthLabel } from '../lib/format';
import { Search, Plus, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { TxModal } from './TxModal';

export function TransactionsView() {
  const [query, setQuery] = useState('');
  const [only, setOnly] = useState<'all' | 'debit' | 'credit'>('all');
  const [majorMon, setMajorMon] = useState<string>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [adding, setAdding] = useState(false);

  const txns = useLiveQuery(() => db.transactions.orderBy('ts').reverse().toArray(), []);

  const months = useMemo(() => {
    if (!txns) return [];
    const set = new Set<string>();
    for (const t of txns) set.add(monthKey(t.date));
    return [...set].sort().reverse();
  }, [txns]);

  const filtered = useMemo(() => {
    if (!txns) return [];
    const q = query.trim().toLowerCase();
    return txns.filter((t) => {
      if (only !== 'all' && t.type !== only) return false;
      if (majorMon !== 'all' && monthKey(t.date) !== majorMon) return false;
      if (q) {
        const hay = `${t.description} ${t.upiRef} ${t.category} ${t.date}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [txns, query, only, majorMon]);

  const grouped = useMemo(() => {
    const g = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const k = monthKey(t.date);
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(t);
    }
    return [...g.entries()];
  }, [filtered]);

  return (
    <div>
      {/* Sticky top controls on flat base background */}
      <div className="sticky top-0 z-10 -mx-5 space-y-3.5 bg-[#eef1f5]/95 px-5 pb-3.5 pt-1 backdrop-blur-md">
        {/* Inset search input */}
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, merchants, UPI ref"
            className="neu-input w-full rounded-full py-3 pl-11 pr-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* Circular / pill filter controls with inset active states */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
          {(['all', 'debit', 'credit'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setOnly(k)}
              data-sound="pop"
              className={`shrink-0 rounded-full px-4 py-2 text-xs capitalize transition-all ${
                only === k
                  ? 'neu-pill-active font-bold text-[#ff5238]'
                  : 'neu-pill font-medium text-slate-500 hover:text-slate-700'
              }`}
            >
              {k}
            </button>
          ))}
          <select
            value={majorMon}
            onChange={(e) => setMajorMon(e.target.value)}
            data-sound="tap"
            className="neu-inset ml-auto shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m} className="bg-[#eef1f5]">
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="neu-card my-8 rounded-[30px] p-12 text-center text-xs font-medium text-slate-400">
          No transactions found.
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {grouped.map(([mk, list]) => (
            <div key={mk}>
              <div className="mb-2.5 flex items-baseline justify-between px-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {monthLabel(mk)}
                </span>
                <span className="text-[11px] font-medium text-slate-400">{list.length} entries</span>
              </div>

              {/* Large rounded rectangle card (28-32px border-radius) */}
              <div className="neu-card rounded-[30px] p-2 space-y-1">
                {list.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditing(t)}
                    data-sound="pop"
                    className="neu-row flex w-full items-center gap-3.5 rounded-[22px] px-3.5 py-3 text-left transition-all"
                  >
                    {/* Soft circular icon button */}
                    <div
                      className={`neu-btn-circle flex h-11 w-11 shrink-0 items-center justify-center ${
                        t.type === 'debit' ? 'text-slate-700' : 'text-slate-600'
                      }`}
                    >
                      {t.type === 'debit' ? (
                        <ArrowUpRight size={18} strokeWidth={2.4} />
                      ) : (
                        <ArrowDownLeft size={18} strokeWidth={2.4} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-slate-800">{t.description}</span>
                        {t.failed && <AlertTriangle size={12} className="shrink-0 text-[#ff5238]" />}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                        <span>{fmtDate(t.date)}</span>
                        <span>·</span>
                        <span>{t.category}</span>
                      </div>
                    </div>

                    {/* High contrast numeric data */}
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-extrabold text-slate-900 tracking-tight tabular-nums">
                        {t.type === 'debit' ? '−' : '+'}
                        {fmtRupee(t.amount)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button: Vivid accent circular button that pops as primary action */}
      <button
        onClick={() => setAdding(true)}
        data-sound="pop"
        className="neu-fab fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white"
        title="Add transaction"
      >
        <Plus size={26} strokeWidth={2.8} />
      </button>

      {(editing || adding) && (
        <TxModal
          initial={editing ?? undefined}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}