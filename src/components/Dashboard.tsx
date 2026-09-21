import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { TabId } from '../types';
import { todayStr, monthKey, monthLabel, fmtRupee } from '../lib/format';
import { DonutChart } from './DonutChart';
import { BarChart } from './BarChart';
import { categoryColor } from '../lib/colors';
import { Wallet, TrendingDown, TrendingUp, Upload, ShieldCheck } from 'lucide-react';

export function Dashboard({ onNavigate }: { onNavigate: (t: TabId) => void }) {
  const txns = useLiveQuery(() => db.transactions.orderBy('ts').toArray(), []);

  if (!txns) {
    return <div className="p-8 text-center text-slate-400">Loading…</div>;
  }

  const active = txns.filter((t) => !t.failed);
  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-8 pt-20 pb-40 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <Wallet size={30} />
        </div>
        <h1 className="text-xl font-semibold text-slate-100">Welcome to UPI Ledger</h1>
        <p className="max-w-xs text-sm text-slate-400">
          Import a Google Pay or bank statement to see your balance, spending and trends. Everything stays on this phone.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400/80">
          <ShieldCheck size={14} /> 100% private and offline
        </div>
        <button
          onClick={() => onNavigate('import')}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20"
        >
          <Upload size={18} /> Import statement
        </button>
      </div>
    );
  }

  const thisMon = monthKey(todayStr());
  const prevDate = new Date();
  prevDate.setDate(1);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMon = monthKey(prevDate.toISOString().slice(0, 10));

  let spent = 0;
  let spentPrev = 0;
  let received = 0;
  let receivedPrev = 0;
  const catMap = new Map<string, number>();
  const monthSpend = new Map<string, number>();

  for (const t of active) {
    const mk = monthKey(t.date);
    monthSpend.set(mk, (monthSpend.get(mk) ?? 0) + (t.type === 'debit' ? t.amount : 0));
    if (t.type === 'debit') {
      if (mk === thisMon) spent += t.amount;
      if (mk === prevMon) spentPrev += t.amount;
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
    } else {
      if (mk === thisMon) received += t.amount;
      if (mk === prevMon) receivedPrev += t.amount;
    }
  }

  const lastWithBalance = [...active].reverse().find((t) => t.balance != null);
  const balance = lastWithBalance
    ? lastWithBalance.balance as number
    : active.reduce((s, t) => s + (t.type === 'credit' ? t.amount : -t.amount), 0);

  const segments = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value, color: categoryColor(label) }));

  const last6: Array<{ label: string; value: number }> = [];
  const anchor = new Date();
  anchor.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    last6.push({ label: monthLabel(key), value: monthSpend.get(key) ?? 0 });
  }

  const deltaPct = spentPrev > 0 ? Math.round(((spent - spentPrev) / spentPrev) * 100) : null;
  const totalCatSpend = [...catMap.values()].reduce((a, b) => a + b, 0);

  const delta = deltaPct == null ? null : deltaPct > 0 ? `+${deltaPct}% vs last month` : `${deltaPct}% vs last month`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
        <div className="flex items-center gap-2 text-slate-400">
          <Wallet size={16} className="text-emerald-400" />
          <span className="text-xs font-medium uppercase tracking-wider">Current balance</span>
        </div>
        <div className="mt-2 text-4xl font-bold tracking-tight text-slate-50">{fmtRupee(balance)}</div>
        <div className="mt-1 text-xs text-slate-500">
          {lastWithBalance
            ? `as of ${monthLabel(monthKey(lastWithBalance.date))} statement`
            : 'estimated from your entries'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <TrendingDown size={14} className="text-red-400" />
            <span className="text-xs">Spent this month</span>
          </div>
          <div className="mt-1.5 text-xl font-bold text-red-400">{fmtRupee(spent)}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {delta != null ? (deltaPct === 0 ? 'same as last month' : delta) : 'no data for last month'}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-xs">Received this month</span>
          </div>
          <div className="mt-1.5 text-xl font-bold text-emerald-400">{fmtRupee(received)}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">from refunds, income, transfers</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-200">Spending — last 6 months</div>
        <BarChart data={last6} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-200">This month by category</div>
        {segments.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500">No spending recorded this month yet.</div>
        ) : (
          <div className="flex items-center gap-4">
            <DonutChart segments={segments} />
            <div className="flex-1 space-y-2">
              {segments.slice(0, 4).map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-medium text-slate-100">{fmtRupee(s.value)}</span>
                </div>
              ))}
              {totalCatSpend > segments.slice(0, 4).reduce((a, s) => a + s.value, 0) && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-600" /> Others
                  </span>
                  <span>
                    {fmtRupee(totalCatSpend - segments.slice(0, 4).reduce((a, s) => a + s.value, 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}