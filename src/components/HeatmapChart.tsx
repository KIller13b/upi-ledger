import { fmtRupee } from '../lib/format';

const ACC  = '#1a9e75';
const H3   = '#8991a0';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function HeatmapChart({ data }: { data: Array<{ date: string; value: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Monday

  // Start 4 full weeks + current partial week back from today
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - dayOfWeek - 28); // go back to monday 4 weeks ago
  gridStart.setHours(0, 0, 0, 0);

  const dataMap = new Map(data.map((d) => [d.date, d.value]));

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Build 35 cells
  const cells: Array<{ dateStr: string; value: number; isToday: boolean; isFuture: boolean }> = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const dateStr = toDateStr(d);
    const isToday  = toDateStr(today) === dateStr;
    const isFuture = d > today;
    cells.push({ dateStr, value: dataMap.get(dateStr) ?? 0, isToday, isFuture });
  }

  const getColor = (value: number, isFuture: boolean): string => {
    if (isFuture) return 'transparent';
    if (value === 0) return 'rgba(163,177,198,0.18)';
    const intensity = Math.min(1, value / (max * 0.75));
    // Interpolate: light green → deep green
    const r = Math.round(209 - (209 - 26)  * intensity);
    const g = Math.round(250 - (250 - 158) * intensity);
    const b = Math.round(229 - (229 - 117) * intensity);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div>
      {/* Day-of-week labels */}
      <div className="grid mb-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {DAY_LABELS.map((l, i) => (
          <span key={i} className="text-center text-[9px] font-bold" style={{ color: H3 }}>{l}</span>
        ))}
      </div>

      {/* 5-week grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            title={cell.isFuture ? '' : `${cell.dateStr}: ${fmtRupee(cell.value)}`}
            style={{
              aspectRatio: '1',
              borderRadius: 5,
              background: getColor(cell.value, cell.isFuture),
              boxShadow: !cell.isFuture && cell.value > 0
                ? 'inset 1px 1px 3px rgba(163,177,198,0.35), inset -1px -1px 3px rgba(255,255,255,0.6)'
                : !cell.isFuture
                ? 'inset 1px 1px 2px rgba(163,177,198,0.25), inset -1px -1px 2px rgba(255,255,255,0.5)'
                : 'none',
              outline: cell.isToday ? `2px solid ${ACC}` : 'none',
              outlineOffset: 1,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[9px] font-semibold" style={{ color: H3 }}>Less</span>
        {[0.1, 0.35, 0.65, 1.0].map((f) => (
          <div key={f} style={{
            width: 10, height: 10, borderRadius: 3,
            background: getColor(max * f, false)
          }} />
        ))}
        <span className="text-[9px] font-semibold" style={{ color: H3 }}>More</span>
      </div>
    </div>
  );
}
