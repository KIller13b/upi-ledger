import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { TabId } from '../types';
import { todayStr, monthKey, monthLabel, fmtRupee } from '../lib/format';
import { DonutChart } from './DonutChart';
import { BarChart } from './BarChart';
import { Wallet, TrendingDown, TrendingUp, Upload, ShieldCheck } from 'lucide-react';

export function Dashboard({ onNavigate }: { onNavigate: (t: TabId) => void }) {
  const txns = useLiveQuery(() => db.transactions.orderBy('ts').toArray(), []);

  if (!txns) {
    return <div className="p-12 text-center text-slate-400 font-medium">Loading…</div>;
  }

  const active = txns.filter((t) => !t.failed);
  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 px-4 pt-12 pb-24 text-center">
        <div className="neu-card rounded-[32px] p-8 flex flex-col items-center gap-4 w-full">
          <div className="neu-card-disc flex h-20 w-20 items-center justify-center text-slate-600">
            <Wallet size={34} strokeWidth={2} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Welcome to UPI Ledger</h2>
          <p className="max-w-xs text-xs text-slate-500 leading-relaxed">
            Import a Google Pay or bank statement to visualize your balance, spending patterns and monthly trends.
          </p>
          <div className="neu-inset flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-medium text-slate-600">
            <ShieldCheck size={14} className="text-[#ff5238]" /> 100% private and offline
          </div>
          <button
            onClick={() => onNavigate('import')}
            data-sound="pop"
            className="neu-accent-btn mt-3 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs font-bold uppercase tracking-wider"
          >
            <Upload size={17} /> Import statement
          </button>
        </div>
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
    ? (lastWithBalance.balance as number)
    : active.reduce((s, t) => s + (t.type === 'credit' ? t.amount : -t.amount), 0);

  const segments = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

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
    <div className="space-y-5">
      {/* Current Balance Neumorphic Card (28-32px radius, base color, high-contrast numeric data) */}
      <div className="neu-card rounded-[30px] p-6 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-600">
              <Wallet size={17} strokeWidth={2.2} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current balance
            </span>
          </div>
          <span className="neu-inset rounded-full px-3 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Verified
          </span>
        </div>

        <div className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
          {fmtRupee(balance)}
        </div>

        <div className="mt-1.5 text-xs font-medium text-slate-400">
          {lastWithBalance
            ? `As of ${monthLabel(monthKey(lastWithBalance.date))} statement`
            : 'Estimated from your entries'}
        </div>
      </div>

      {/* Monthly Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Spent Card */}
        <div className="neu-card-sm rounded-[26px] p-5">
          <div className="flex items-center gap-2">
            <div className="neu-btn-circle flex h-7 w-7 items-center justify-center text-[#ff5238]">
              <TrendingDown size={14} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold text-slate-500">Spent this month</span>
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-900">
            {fmtRupee(spent)}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            {delta != null ? (deltaPct === 0 ? 'Same as last month' : delta) : 'No prior month data'}
          </div>
        </div>

        {/* Received Card */}
        <div className="neu-card-sm rounded-[26px] p-5">
          <div className="flex items-center gap-2">
            <div className="neu-btn-circle flex h-7 w-7 items-center justify-center text-slate-600">
              <TrendingUp size={14} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold text-slate-500">Received this month</span>
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-900">
            {fmtRupee(received)}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-400">Transfers & refunds</div>
        </div>
      </div>

      {/* 6 Months Spending Bar Chart Card */}
      <div className="neu-card rounded-[30px] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Spending — last 6 months</h3>
          <span className="text-[11px] font-semibold text-slate-400">Monthly breakdown</span>
        </div>
        <BarChart data={last6} />
      </div>

      {/* Category Breakdown Card with carved Donut Chart */}
      <div className="neu-card rounded-[30px] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Category breakdown</h3>
          <span className="text-[11px] font-semibold text-slate-400">Top merchants</span>
        </div>

        {segments.length === 0 ? (
          <div className="neu-inset rounded-[22px] py-8 text-center text-xs font-medium text-slate-400">
            No spending recorded this month yet.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Donut Chart carved in a soft extruded disc with centered small circular accent button */}
            <div className="shrink-0">
              <DonutChart segments={segments} />
            </div>

            {/* Monochrome category legend with one accent item */}
            <div className="w-full flex-1 space-y-2.5">
              {segments.slice(0, 4).map((s, idx) => {
                const isTop = idx === 0;
                return (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isTop ? 'bg-[#ff5238] shadow-[0_0_6px_rgba(255,82,56,0.4)]' : 'bg-slate-400'
                        }`}
                      />
                      <span className={`font-medium ${isTop ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                        {s.label}
                      </span>
                    </span>
                    <span className={`tabular-nums ${isTop ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {fmtRupee(s.value)}
                    </span>
                  </div>
                );
              })}

              {totalCatSpend > segments.slice(0, 4).reduce((a, s) => a + s.value, 0) && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="font-medium">Others</span>
                  </span>
                  <span className="font-semibold text-slate-600 tabular-nums">
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