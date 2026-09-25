import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { TabId } from '../types';
import { todayStr, monthKey, monthLabel, fmtRupee } from '../lib/format';
import { DonutChart } from './DonutChart';
import { BarChart } from './BarChart';
import { HeatmapChart } from './HeatmapChart';
import { detectRecurring } from '../lib/subscriptions';
import { playSound } from '../lib/sound';
import { Wallet, TrendingDown, TrendingUp, Upload, ShieldCheck, Store, Repeat, PiggyBank, AlertTriangle } from 'lucide-react';
import { ExportSummaryButton } from './ExportSummary';

const RAISED    = '7px 7px 16px rgba(163,177,198,0.55), -7px -7px 16px rgba(255,255,255,0.85)';
const RAISED_SM = '5px 5px 12px rgba(163,177,198,0.55), -5px -5px 12px rgba(255,255,255,0.85)';
const INSET     = 'inset 5px 5px 10px rgba(163,177,198,0.55), inset -5px -5px 10px rgba(255,255,255,0.85)';
const INSET_SM  = 'inset 4px 4px 8px rgba(163,177,198,0.55), inset -4px -4px 8px rgba(255,255,255,0.85)';
const BASE = '#e6e9ef';
const H1   = '#2f3542';
const H2   = '#5b6272';
const H3   = '#8991a0';
const ACC  = '#1a9e75';

function Icon16({ children, size = 40 }: { children: React.ReactNode; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 16,
      background: BASE, boxShadow: RAISED_SM,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      {children}
    </span>
  );
}

/** A card that presses in (inset shadow) when tapped and plays a sound */
function TappableCard({
  children,
  sound = 'tap',
  style,
  className,
}: {
  children: React.ReactNode;
  sound?: 'tap' | 'pop' | 'success' | 'delete' | 'toggle';
  style?: React.CSSProperties;
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);

  const press = () => {
    setPressed(true);
    playSound(sound);
  };
  const release = () => setPressed(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onKeyDown={(e) => e.key === 'Enter' && press()}
      onKeyUp={(e) => e.key === 'Enter' && release()}
      className={className}
      style={{
        background: BASE,
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transition: 'box-shadow 0.12s ease, transform 0.12s ease',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        ...style,
        boxShadow: pressed ? INSET_SM : (style?.boxShadow as string ?? RAISED),
      }}
    >
      {children}
    </div>
  );
}

export function Dashboard({ onNavigate }: { onNavigate: (t: TabId) => void }) {
  const txns    = useLiveQuery(() => db.transactions.orderBy('ts').toArray(), []);
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];

  /* Dial selection: -1 = nothing highlighted */
  const [dialSel, setDialSel] = useState<number>(-1);
  const lastDialSel = useRef<number>(-1);

  /* Chart view toggle: 'weekly' | 'monthly' */
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');

  const onDialSelect = (idx: number) => {
    // Only play sound when crossing into a new segment (not on release to -1)
    if (idx >= 0 && idx !== lastDialSel.current) playSound('tap');
    lastDialSel.current = idx;
    setDialSel(idx);
  };

  if (!txns) {
    return <div className="p-12 text-center text-sm font-medium" style={{ color: H3 }}>Loading…</div>;
  }

  const active = txns.filter((t) => !t.failed);

  /* ── Empty / welcome state ── */
  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 px-2 pt-8 pb-24 text-center">
        <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '2rem', width: '100%' }}>
          <div className="flex flex-col items-center gap-4">
            <span style={{ width: 72, height: 72, borderRadius: 24, background: BASE, boxShadow: RAISED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={32} color={H2} strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="text-xl font-extrabold" style={{ color: H1 }}>Welcome to UPI Ledger</h2>
              <p className="mt-1.5 text-xs leading-relaxed max-w-xs mx-auto" style={{ color: H2 }}>
                Import a Google Pay or bank statement to visualise your balance, spending, and monthly trends. Everything stays on this device.
              </p>
            </div>
            <div style={{ background: BASE, borderRadius: 9999, boxShadow: INSET, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px' }}>
              <ShieldCheck size={13} color={ACC} strokeWidth={2.2} />
              <span className="text-[11px] font-semibold" style={{ color: H2 }}>100% private and offline</span>
            </div>
            <button
              onClick={() => onNavigate('import')}
              data-sound="pop"
              className="neu-btn-accent mt-2 inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold"
              style={{ borderRadius: 9999 }}
            >
              <Upload size={17} strokeWidth={2.4} /> Import statement
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Data ── */
  const thisMon  = monthKey(todayStr());
  const prevDate = new Date();
  prevDate.setDate(1);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMon = monthKey(prevDate.toISOString().slice(0, 10));

  let spent = 0, spentPrev = 0, received = 0;
  const catMap     = new Map<string, number>();
  const monthSpend = new Map<string, number>();

  for (const t of active) {
    const mk = monthKey(t.date);
    monthSpend.set(mk, (monthSpend.get(mk) ?? 0) + (t.type === 'debit' ? t.amount : 0));
    if (t.type === 'debit') {
      if (mk === thisMon) spent     += t.amount;
      if (mk === prevMon) spentPrev += t.amount;
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
    } else {
      if (mk === thisMon) received += t.amount;
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

  /* ── Weekly: last 8 weeks (Mon→Sun buckets) ── */
  // Find the Monday of the current week
  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay(); // 0=Sun … 6=Sat
  const mondayOffset = (dayOfWeek + 6) % 7; // days since last Monday
  const thisMonday = new Date(todayDate);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(todayDate.getDate() - mondayOffset);

  const weeklyData: Array<{ label: string; value: number; isCurrent: boolean }> = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(thisMonday);
    weekStart.setDate(thisMonday.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const weekEndKey = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    const label = `${weekStart.getDate()} ${weekStart.toLocaleString('en-IN', { month: 'short' })}`;
    const value = active
      .filter((t) => t.type === 'debit' && t.date >= weekKey && t.date <= weekEndKey)
      .reduce((s, t) => s + t.amount, 0);
    weeklyData.push({ label, value, isCurrent: i === 0 });
  }

  /* ── Monthly: last 6 months ── */
  const monthlyData: Array<{ label: string; value: number; isCurrent: boolean }> = [];
  const anchor = new Date(); anchor.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const spend = active
      .filter((t) => t.type === 'debit' && t.date.startsWith(key))
      .reduce((s, t) => s + t.amount, 0);
    monthlyData.push({ label: monthLabel(key), value: spend, isCurrent: i === 0 });
  }

  const deltaPct = spentPrev > 0 ? Math.round(((spent - spentPrev) / spentPrev) * 100) : null;
  const totalCatSpend = [...catMap.values()].reduce((a, b) => a + b, 0);
  const delta = deltaPct == null ? null : deltaPct > 0 ? `+${deltaPct}% vs last month` : `${deltaPct}% vs last month`;

  /* ── Savings rate ── */
  const totalFlow = received + spent;
  const savingsRate = totalFlow > 0 ? Math.round((received / totalFlow) * 100) : null;

  /* ── Top merchants this month ── */
  const merchantMap = new Map<string, number>();
  for (const t of active) {
    if (t.type === 'debit' && monthKey(t.date) === thisMon) {
      const key = t.description.slice(0, 32);
      merchantMap.set(key, (merchantMap.get(key) ?? 0) + t.amount);
    }
  }
  const topMerchants = [...merchantMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  /* ── Daily heatmap (last 35 days) ── */
  const dayMap = new Map<string, number>();
  for (const t of active) {
    if (t.type === 'debit') dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + t.amount);
  }
  const heatmapData: Array<{ date: string; value: number }> = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    heatmapData.push({ date: ds, value: dayMap.get(ds) ?? 0 });
  }

  /* ── Monthly dual bar data (spend + income) ── */
  const monthlyDataFull: Array<{ label: string; value: number; income: number; isCurrent: boolean }> = [];
  const anchor3 = new Date(); anchor3.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anchor3.getFullYear(), anchor3.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const sp = active.filter((t) => t.type === 'debit'   && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0);
    const ic = active.filter((t) => t.type === 'credit'  && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0);
    monthlyDataFull.push({ label: monthLabel(key), value: sp, income: ic, isCurrent: i === 0 });
  }

  /* ── Recurring charges ── */
  const recurring = detectRecurring(active);

  /* ── Budget alerts ── */
  const budgetAlerts = budgets
    .map((b) => {
      const spentInCat = active
        .filter((t) => t.type === 'debit' && !t.failed && monthKey(t.date) === thisMon && t.category === b.category)
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.amount > 0 ? Math.round((spentInCat / b.amount) * 100) : 0;
      return { category: b.category, budget: b.amount, spent: spentInCat, pct };
    })
    .filter((a) => a.pct >= 75)
    .sort((a, b) => b.pct - a.pct);

  /* ── Budget progress bars for dashboard ── */
  const budgetProgress = budgets.map((b) => {
    const spentInCat = active
      .filter((t) => t.type === 'debit' && !t.failed && monthKey(t.date) === thisMon && t.category === b.category)
      .reduce((s, t) => s + t.amount, 0);
    const pct = b.amount > 0 ? Math.min(100, Math.round((spentInCat / b.amount) * 100)) : 0;
    return { category: b.category, budget: b.amount, spent: spentInCat, pct };
  }).sort((a, b) => b.pct - a.pct);

  const MUTED_SEGS = ['#94a3b8', '#64748b', '#b0bec5', '#78909c', '#90a4ae'];


  return (
    <div className="space-y-5">

      {/* ── Balance Card — tappable, plays success chime ── */}
      <TappableCard
        sound="success"
        style={{ borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon16 size={38}>
              <Wallet size={17} color={ACC} strokeWidth={2.2} />
            </Icon16>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: H3 }}>Current balance</span>
          </div>
          <span style={{
            background: BASE, borderRadius: 9999, boxShadow: INSET,
            padding: '4px 12px', fontSize: 10, fontWeight: 700,
            color: H2, letterSpacing: '0.05em', textTransform: 'uppercase'
          }}>Live</span>
        </div>
        <div className="mt-4 text-4xl font-extrabold tracking-tight" style={{ color: H1 }}>
          {fmtRupee(balance)}
        </div>
        <div className="mt-1.5 text-xs font-medium" style={{ color: H3 }}>
          {lastWithBalance
            ? `As of ${monthLabel(monthKey(lastWithBalance.date))} statement`
            : 'Estimated from your entries'}
        </div>
      </TappableCard>

      {/* ── Monthly Metrics — each card plays a different sound ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Spent card — plays pop */}
        <TappableCard
          sound="pop"
          style={{ borderRadius: 26, boxShadow: RAISED_SM, padding: '1.25rem' }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Icon16 size={34}>
              <TrendingDown size={15} color={H2} strokeWidth={2.2} />
            </Icon16>
            <span className="text-xs font-semibold" style={{ color: H2 }}>Spent this month</span>
          </div>
          <div className="text-2xl font-extrabold tracking-tight" style={{ color: H1 }}>
            {fmtRupee(spent)}
          </div>
          <div className="mt-1 text-[11px] font-medium" style={{ color: H3 }}>
            {delta != null ? (deltaPct === 0 ? 'Same as last month' : delta) : 'No prior data'}
          </div>
        </TappableCard>

        {/* Received card — plays tap */}
        <TappableCard
          sound="tap"
          style={{ borderRadius: 26, boxShadow: RAISED_SM, padding: '1.25rem' }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Icon16 size={34}>
              <TrendingUp size={15} color={ACC} strokeWidth={2.2} />
            </Icon16>
            <span className="text-xs font-semibold" style={{ color: H2 }}>Received</span>
          </div>
          <div className="text-2xl font-extrabold tracking-tight" style={{ color: H1 }}>
            {fmtRupee(received)}
          </div>
          <div className="mt-1 text-[11px] font-medium" style={{ color: H3 }}>Transfers &amp; refunds</div>
        </TappableCard>
      </div>

      {/* ── Bar Chart — Weekly / Monthly toggle ── */}
      <TappableCard
        sound="toggle"
        style={{ borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: H1 }}>
            {chartView === 'weekly' ? 'Spending — last 8 weeks' : 'Spending — last 6 months'}
          </h3>

          {/* W / M pill toggle */}
          <div
            className="flex items-center"
            style={{
              background: BASE,
              borderRadius: 9999,
              boxShadow: INSET_SM,
              padding: 3,
              gap: 2
            }}
          >
            {(['weekly', 'monthly'] as const).map((v) => {
              const active = chartView === v;
              return (
                <button
                  key={v}
                  onClick={(e) => { e.stopPropagation(); setChartView(v); playSound('pop'); }}
                  style={{
                    background: BASE,
                    borderRadius: 9999,
                    boxShadow: active ? RAISED_SM : 'none',
                    border: 'none',
                    padding: '4px 12px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: active ? ACC : H3,
                    transition: 'all 0.14s ease',
                    cursor: 'pointer'
                  }}
                >
                  {v === 'weekly' ? 'W' : 'M'}
                </button>
              );
            })}
          </div>
        </div>

        <BarChart
          data={chartView === 'weekly' ? weeklyData : monthlyDataFull}
          highlightLast
          showIncome={chartView === 'monthly'}
        />
      </TappableCard>

      {/* ── Category Breakdown — donut is an interactive dial ── */}
      <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold" style={{ color: H1 }}>Category breakdown</h3>
          <span className="text-[11px] font-semibold" style={{ color: H3 }}>This month</span>
        </div>

        {/* Hint label — shown while no segment active */}
        <p
          className="mb-4 text-[10px] font-semibold transition-opacity duration-200"
          style={{ color: H3, opacity: dialSel >= 0 ? 0 : 1 }}
        >
          ↺ drag the ring to explore
        </p>

        {segments.length === 0 ? (
          <div style={{ background: BASE, borderRadius: 20, boxShadow: INSET, padding: '2rem', textAlign: 'center' }}>
            <span className="text-xs font-medium" style={{ color: H3 }}>No spending recorded this month yet.</span>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            {/* Interactive dial */}
            <DonutChart
              segments={segments}
              selected={dialSel}
              onSelect={onDialSelect}
            />

            {/* Category rows — highlight syncs with the dial */}
            <div className="flex-1 space-y-1.5">
              {segments.slice(0, 4).map((s, idx) => {
                const isTop     = idx === 0;
                const isActive  = dialSel === idx;
                const dotColor  = isTop ? ACC : MUTED_SEGS[idx - 1] ?? '#94a3b8';
                const rowShadow = isActive ? INSET_SM : RAISED_SM;

                return (
                  <div
                    key={s.label}
                    className="flex items-center justify-between text-xs"
                    style={{
                      background: BASE,
                      borderRadius: 14,
                      boxShadow: rowShadow,
                      padding: '8px 10px',
                      transition: 'box-shadow 0.13s ease',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span style={{
                        width: 9, height: 9, borderRadius: 9999,
                        background: dotColor, flexShrink: 0,
                        transform: isActive ? 'scale(1.5)' : 'scale(1)',
                        transition: 'transform 0.13s ease'
                      }} />
                      <span style={{
                        color: isActive ? dotColor : (isTop ? H1 : H2),
                        fontWeight: isActive || isTop ? 700 : 500,
                        transition: 'color 0.13s ease'
                      }}>
                        {s.label}
                      </span>
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        color: isActive ? dotColor : H1,
                        fontWeight: isActive || isTop ? 800 : 600,
                        transition: 'color 0.13s ease'
                      }}
                    >
                      {fmtRupee(s.value)}
                    </span>
                  </div>
                );
              })}

              {totalCatSpend > segments.slice(0, 4).reduce((a, s) => a + s.value, 0) && (
                <div
                  className="flex items-center justify-between text-xs"
                  style={{
                    background: BASE, borderRadius: 14,
                    boxShadow: RAISED_SM, padding: '8px 10px'
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span style={{ width: 9, height: 9, borderRadius: 9999, background: '#cbd5e1', flexShrink: 0 }} />
                    <span style={{ color: H3, fontWeight: 500 }}>Others</span>
                  </span>
                  <span style={{ color: H2, fontWeight: 600 }} className="tabular-nums">
                    {fmtRupee(totalCatSpend - segments.slice(0, 4).reduce((a, s) => a + s.value, 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Spending Alerts ── */}
      {budgetAlerts.length > 0 && (
        <div style={{ background: BASE, borderRadius: 26, boxShadow: RAISED, padding: '1.25rem' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <Icon16 size={34}><AlertTriangle size={15} color="#f59e0b" strokeWidth={2.2} /></Icon16>
            <h3 className="text-sm font-bold" style={{ color: H1 }}>Budget alerts</h3>
          </div>
          <div className="space-y-2">
            {budgetAlerts.map((a) => (
              <div key={a.category} style={{
                background: BASE, borderRadius: 14,
                boxShadow: a.pct >= 100 ? `inset 3px 3px 7px rgba(220,38,38,0.18), inset -3px -3px 7px rgba(255,255,255,0.85)` : RAISED_SM,
                padding: '10px 14px'
              }}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold" style={{ color: a.pct >= 100 ? '#dc2626' : H1 }}>{a.category}</span>
                  <span className="font-extrabold tabular-nums" style={{ color: a.pct >= 100 ? '#dc2626' : '#f59e0b' }}>
                    {a.pct}% used
                  </span>
                </div>
                <div style={{ background: BASE, borderRadius: 9999, boxShadow: INSET_SM, height: 6 }}>
                  <div style={{
                    height: '100%', borderRadius: 9999,
                    width: `${Math.min(100, a.pct)}%`,
                    background: a.pct >= 100 ? '#dc2626' : '#f59e0b',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <p className="text-[10px] mt-1.5 font-medium" style={{ color: H3 }}>
                  {fmtRupee(a.spent)} of {fmtRupee(a.budget)} budget
                  {a.pct >= 100 ? ' — limit exceeded!' : ` — ${fmtRupee(a.budget - a.spent)} remaining`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Budget Progress ── */}
      {budgetProgress.length > 0 && (
        <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: H1 }}>Monthly budgets</h3>
            <span className="text-[11px] font-semibold" style={{ color: H3 }}>This month</span>
          </div>
          <div className="space-y-3.5">
            {budgetProgress.map((b) => (
              <div key={b.category}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold" style={{ color: H1 }}>{b.category}</span>
                  <span className="tabular-nums font-bold" style={{ color: b.pct >= 100 ? '#dc2626' : b.pct >= 75 ? '#f59e0b' : H2 }}>
                    {fmtRupee(b.spent)} / {fmtRupee(b.budget)}
                  </span>
                </div>
                <div style={{ background: BASE, borderRadius: 9999, boxShadow: INSET_SM, height: 8 }}>
                  <div style={{
                    height: '100%', borderRadius: 9999,
                    width: `${b.pct}%`,
                    background: b.pct >= 100 ? '#dc2626' : b.pct >= 75 ? '#f59e0b' : ACC,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Savings Rate ── */}
      {savingsRate !== null && (
        <TappableCard sound="success" style={{ borderRadius: 26, boxShadow: RAISED_SM, padding: '1.25rem' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <Icon16 size={34}><PiggyBank size={15} color={savingsRate > 20 ? ACC : '#dc2626'} strokeWidth={2.2} /></Icon16>
            <span className="text-xs font-semibold" style={{ color: H2 }}>Savings rate this month</span>
          </div>
          <div className="text-3xl font-extrabold tracking-tight" style={{ color: savingsRate > 20 ? ACC : '#dc2626' }}>
            {savingsRate}%
          </div>
          <div className="mt-1 text-[11px] font-medium" style={{ color: H3 }}>
            {savingsRate > 30 ? '🎉 Excellent discipline!' : savingsRate > 10 ? 'Try to save a little more' : 'Expenses are exceeding income'}
          </div>
        </TappableCard>
      )}

      {/* ── Daily Heatmap ── */}
      <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: H1 }}>Daily spending</h3>
          <span className="text-[11px] font-semibold" style={{ color: H3 }}>Last 5 weeks</span>
        </div>
        <HeatmapChart data={heatmapData} />
      </div>

      {/* ── Top Merchants ── */}
      {topMerchants.length > 0 && (
        <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}>
          <div className="flex items-center gap-3 mb-4">
            <Icon16 size={36}><Store size={16} color={H2} strokeWidth={2} /></Icon16>
            <h3 className="text-sm font-bold" style={{ color: H1 }}>Top merchants</h3>
            <span className="ml-auto text-[11px] font-semibold" style={{ color: H3 }}>This month</span>
          </div>
          <div className="space-y-3">
            {topMerchants.map((m, i) => {
              const pct = Math.round((m.value / (topMerchants[0]?.value || 1)) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold truncate max-w-[55%]" style={{ color: H1 }}>{m.label}</span>
                    <span className="font-bold tabular-nums" style={{ color: H2 }}>{fmtRupee(m.value)}</span>
                  </div>
                  <div style={{ background: BASE, borderRadius: 9999, boxShadow: INSET_SM, height: 7 }}>
                    <div style={{
                      height: '100%', borderRadius: 9999,
                      width: `${pct}%`,
                      background: i === 0 ? ACC : '#94a3b8',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recurring Charges ── */}
      {recurring.length > 0 && (
        <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}>
          <div className="flex items-center gap-3 mb-4">
            <Icon16 size={36}><Repeat size={16} color={H2} strokeWidth={2} /></Icon16>
            <h3 className="text-sm font-bold" style={{ color: H1 }}>Recurring charges</h3>
            <span className="ml-auto text-[11px] font-semibold" style={{ color: H3 }}>{recurring.length} detected</span>
          </div>
          <div className="space-y-2">
            {recurring.map((r, i) => (
              <div key={i} style={{ background: BASE, borderRadius: 14, boxShadow: RAISED_SM, padding: '10px 12px' }}
                className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: H1 }}>{r.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: H3 }}>
                    {r.frequency === 'monthly' ? 'Monthly' : 'Irregular'} · {r.count}× · last {r.lastDate}
                  </p>
                </div>
                <span className="text-sm font-extrabold tabular-nums ml-3 shrink-0" style={{ color: H1 }}>
                  {fmtRupee(r.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Export Summary ── */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
        <ExportSummaryButton
          data={{
            spent,
            received,
            savingsRate,
            topCategory: segments[0]?.label ?? null,
            topCategoryAmount: segments[0]?.value ?? 0,
            txnCount: active.length,
          }}
        />
      </div>

    </div>
  );
}