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
      <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-[#0c1424]/95 px-4 pb-3 pt-1 backdrop-blur-md">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, merchants, UPI ref"
            className="neu-input w-full rounded-2xl py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
          {(['all', 'debit', 'credit'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setOnly(k)}
              data-sound="pop"
              className={`shrink-0 rounded-xl px-3.5 py-1.5 font-medium capitalize transition-all ${
                only === k ? 'neu-pill-active font-semibold' : 'neu-pill text-slate-300'
              }`}
            >
              {k}
            </button>
          ))}
          <select
            value={majorMon}
            onChange={(e) => setMajorMon(e.target.value)}
            data-sound="tap"
            className="neu-input ml-auto shrink-0 rounded-xl px-3 py-1.5 font-medium text-slate-300 focus:outline-none text-xs"
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m} className="bg-slate-900">
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="neu-card my-6 rounded-2xl py-16 text-center text-sm text-slate-400">
          No transactions found.
        </div>
      ) : (
        <div className="space-y-5 pt-1">
          {grouped.map(([mk, list]) => (
            <div key={mk}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{monthLabel(mk)}</span>
                <span className="text-[11px] text-slate-500">{list.length} transactions</span>
              </div>
              <div className="neu-card overflow-hidden rounded-2xl">
                {list.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditing(t)}
                    data-sound="pop"
                    className="neu-row flex w-full items-center gap-3.5 border-b border-white/[0.04] px-4 py-3 text-left last:border-0"
                  >
                    <div
                      className={`neu-sunken flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        t.type === 'debit' ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {t.type === 'debit' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-slate-100">{t.description}</span>
                        {t.failed && <AlertTriangle size={12} className="shrink-0 text-amber-400" />}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{fmtDate(t.date)}</span>
                        <span
                          className="neu-sunken rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-200"
                          style={{ color: categoryColor(t.category) }}
                        >
                          {t.category}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-sm font-bold ${
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

      {/* Floating Action Button */}
      <button
        onClick={() => setAdding(true)}
        data-sound="pop"
        className="neu-fab fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-slate-950"
        title="Add transaction"
      >
        <Plus size={26} strokeWidth={2.6} />
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