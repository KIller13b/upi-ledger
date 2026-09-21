import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Transaction } from '../types';
import { fmtRupee, fmtDate, monthKey, monthLabel } from '../lib/format';
import { categoryColor } from '../lib/colors';
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
      <div className="sticky top-0 z-10 -mx-4 space-y-2 bg-[#0b1220]/95 px-4 pb-2 pt-1 backdrop-blur">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, merchants, UPI ref"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {(['all', 'debit', 'credit'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setOnly(k)}
              className={`shrink-0 rounded-full px-3 py-1.5 font-medium capitalize ${
                only === k ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {k}
            </button>
          ))}
          <select
            value={majorMon}
            onChange={(e) => setMajorMon(e.target.value)}
            className="ml-auto shrink-0 rounded-full border-0 bg-slate-800 px-3 py-1.5 font-medium text-slate-300 focus:outline-none"
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500">No transactions found.</div>
      ) : (
        <div className="space-y-5 pt-1">
          {grouped.map(([mk, list]) => (
            <div key={mk}>
              <div className="mb-1.5 flex items-baseline justify-between px-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{monthLabel(mk)}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/50">
                {list.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditing(t)}
                    className="flex w-full items-center gap-3 border-b border-slate-800/60 px-3 py-2.5 text-left last:border-0 active:bg-slate-800/40"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        t.type === 'debit' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {t.type === 'debit' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm text-slate-100">{t.description}</span>
                        {t.failed && <AlertTriangle size={12} className="shrink-0 text-amber-400" />}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{fmtDate(t.date)}</span>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-slate-200"
                          style={{ background: categoryColor(t.category) + '22' }}
                        >
                          {t.category}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-sm font-semibold ${
                        t.type === 'debit' ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {t.type === 'debit' ? '−' : '+'}
                      {fmtRupee(t.amount)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setAdding(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 active:scale-95"
      >
        <Plus size={26} />
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