import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { TabId } from '../types';
import { todayStr, monthKey, monthLabel, fmtRupee } from '../lib/format';
import { DonutChart } from './DonutChart';
import { BarChart } from './BarChart';
import { playSound } from '../lib/sound';
import { Wallet, TrendingDown, TrendingUp, Upload, ShieldCheck } from 'lucide-react';

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
  const txns = useLiveQuery(() => db.transactions.orderBy('ts').toArray(), []);

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

  const last6: Array<{ label: string; value: number }> = [];
  const anchor = new Date(); anchor.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    last6.push({ label: monthLabel(key), value: monthSpend.get(key) ?? 0 });
  }

  const deltaPct = spentPrev > 0 ? Math.round(((spent - spentPrev) / spentPrev) * 100) : null;
  const totalCatSpend = [...catMap.values()].reduce((a, b) => a + b, 0);
  const delta = deltaPct == null ? null : deltaPct > 0 ? `+${deltaPct}% vs last month` : `${deltaPct}% vs last month`;

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

      {/* ── 6-Month Bar Chart card — tappable, plays toggle ── */}
      <TappableCard
        sound="toggle"
        style={{ borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold" style={{ color: H1 }}>Spending — last 6 months</h3>
          <span className="text-[11px] font-semibold" style={{ color: H3 }}>Monthly</span>
        </div>
        <BarChart data={last6} />
      </TappableCard>

      {/* ── Category Breakdown ── */}
      <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold" style={{ color: H1 }}>Category breakdown</h3>
          <span className="text-[11px] font-semibold" style={{ color: H3 }}>This month</span>
        </div>

        {segments.length === 0 ? (
          <div style={{ background: BASE, borderRadius: 20, boxShadow: INSET, padding: '2rem', textAlign: 'center' }}>
            <span className="text-xs font-medium" style={{ color: H3 }}>No spending recorded this month yet.</span>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <DonutChart segments={segments} />

            {/* Each category row is individually tappable */}
            <div className="flex-1 space-y-2">
              {segments.slice(0, 4).map((s, idx) => {
                const isTop = idx === 0;
                const dotColor = isTop ? ACC : MUTED_SEGS[idx - 1] ?? '#94a3b8';
                return (
                  <TappableCard
                    key={s.label}
                    sound="tap"
                    style={{
                      borderRadius: 14,
                      boxShadow: RAISED_SM,
                      padding: '8px 10px',
                    }}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <span style={{ width: 9, height: 9, borderRadius: 9999, background: dotColor, flexShrink: 0 }} />
                      <span style={{ color: isTop ? H1 : H2, fontWeight: isTop ? 700 : 500 }}>{s.label}</span>
                    </span>
                    <span style={{ color: H1, fontWeight: isTop ? 800 : 600 }} className="tabular-nums">
                      {fmtRupee(s.value)}
                    </span>
                  </TappableCard>
                );
              })}

              {totalCatSpend > segments.slice(0, 4).reduce((a, s) => a + s.value, 0) && (
                <TappableCard
                  sound="tap"
                  style={{ borderRadius: 14, boxShadow: RAISED_SM, padding: '8px 10px' }}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span style={{ width: 9, height: 9, borderRadius: 9999, background: '#cbd5e1', flexShrink: 0 }} />
                    <span style={{ color: H3, fontWeight: 500 }}>Others</span>
                  </span>
                  <span style={{ color: H2, fontWeight: 600 }} className="tabular-nums">
                    {fmtRupee(totalCatSpend - segments.slice(0, 4).reduce((a, s) => a + s.value, 0))}
                  </span>
                </TappableCard>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}