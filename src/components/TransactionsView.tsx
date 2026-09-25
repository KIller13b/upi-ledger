import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Transaction } from '../types';
import { fmtRupee, fmtDate, monthKey, monthLabel } from '../lib/format';
import { Search, Plus, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { TxModal } from './TxModal';

const RAISED    = '7px 7px 16px rgba(163,177,198,0.55), -7px -7px 16px rgba(255,255,255,0.85)';
const RAISED_SM = '5px 5px 12px rgba(163,177,198,0.55), -5px -5px 12px rgba(255,255,255,0.85)';
const INSET     = 'inset 5px 5px 10px rgba(163,177,198,0.55), inset -5px -5px 10px rgba(255,255,255,0.85)';
const INSET_SM  = 'inset 3px 3px 7px rgba(163,177,198,0.55), inset -3px -3px 7px rgba(255,255,255,0.85)';
const BASE = '#e6e9ef';
const H1   = '#2f3542';
const H2   = '#5b6272';
const H3   = '#8991a0';
const ACC  = '#1a9e75';

export function TransactionsView() {
  const [query,    setQuery]    = useState('');
  const [only,     setOnly]     = useState<'all' | 'debit' | 'credit'>('all');
  const [majorMon, setMajorMon] = useState<string>('all');
  const [editing,  setEditing]  = useState<Transaction | null>(null);
  const [adding,   setAdding]   = useState(false);

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
      {/* ── Sticky filter bar ── */}
      <div
        className="sticky top-0 z-10 -mx-5 space-y-3 px-5 pb-3.5 pt-1"
        style={{ background: 'rgba(230,233,239,0.97)', backdropFilter: 'blur(12px)' }}
      >
        {/* Inset search bar */}
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: H3 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, merchants, UPI ref"
            style={{
              background: BASE, boxShadow: INSET, border: 'none', color: H1,
              borderRadius: 9999, paddingLeft: '2.75rem', paddingRight: '1rem',
              paddingTop: '0.7rem', paddingBottom: '0.7rem',
              fontSize: '0.75rem', fontWeight: 600, width: '100%'
            }}
            className="placeholder:font-medium focus:outline-none"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {(['all', 'debit', 'credit'] as const).map((k) => {
            const active = only === k;
            return (
              <button
                key={k}
                onClick={() => setOnly(k)}
                data-sound="pop"
                style={{
                  background: BASE,
                  borderRadius: 9999,
                  boxShadow: active ? INSET_SM : RAISED_SM,
                  color: active ? ACC : H2,
                  fontWeight: active ? 700 : 600,
                  padding: '6px 16px', fontSize: '0.72rem',
                  border: 'none', flexShrink: 0,
                  transition: 'all 0.14s ease'
                }}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            );
          })}

          {/* Inset month select */}
          <select
            value={majorMon}
            onChange={(e) => setMajorMon(e.target.value)}
            data-sound="tap"
            style={{
              background: BASE, boxShadow: INSET_SM, border: 'none', color: H2,
              borderRadius: 9999, padding: '6px 14px', fontSize: '0.72rem',
              fontWeight: 600, marginLeft: 'auto', flexShrink: 0
            }}
            className="focus:outline-none"
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m} style={{ background: BASE }}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Transaction list ── */}
      {filtered.length === 0 ? (
        <div style={{ background: BASE, borderRadius: 30, boxShadow: INSET, padding: '3rem 2rem', textAlign: 'center', marginTop: '1.5rem' }}>
          <span className="text-sm font-medium" style={{ color: H3 }}>No transactions found.</span>
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {grouped.map(([mk, list]) => (
            <div key={mk}>
              <div className="flex items-baseline justify-between px-1 mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: H2 }}>{monthLabel(mk)}</span>
                <span className="text-[11px] font-medium" style={{ color: H3 }}>{list.length} entries</span>
              </div>

              {/* Raised card containing all rows for this month */}
              <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '0.5rem' }}>
                {list.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => setEditing(t)}
                      data-sound="pop"
                      className="neu-row flex w-full items-center gap-3.5 px-4 py-3 text-left"
                      style={{ borderBottom: idx < list.length - 1 ? '1px solid rgba(163,177,198,0.18)' : 'none' }}
                    >
                      {/* Raised rounded-square icon container */}
                      <span style={{
                        width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                        background: BASE, boxShadow: RAISED_SM,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {t.type === 'debit'
                          ? <ArrowUpRight   size={18} strokeWidth={2.3} color={H2} />
                          : <ArrowDownLeft  size={18} strokeWidth={2.3} color={ACC} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold" style={{ color: H1 }}>{t.description}</span>
                          {t.failed && <AlertTriangle size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2" style={{ fontSize: '0.68rem', color: H3, fontWeight: 500 }}>
                          <span>{fmtDate(t.date)}</span>
                          <span>·</span>
                          <span>{t.category}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-extrabold tabular-nums" style={{ color: H1 }}>
                          {t.type === 'debit' ? '−' : '+'}{fmtRupee(t.amount)}
                        </span>
                      </div>
                    </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FAB — raised accent emerald circle ── */}
      <button
        onClick={() => setAdding(true)}
        data-sound="pop"
        className="neu-fab fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center"
        title="Add transaction"
      >
        <Plus size={26} strokeWidth={2.8} />
      </button>

      {(editing || adding) && (
        <TxModal
          initial={editing ?? undefined}
          onClose={() => { setEditing(null); setAdding(false); }}
        />
      )}
    </div>
  );
}