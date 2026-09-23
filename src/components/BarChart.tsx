export function BarChart({
  data,
  height = 130
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const isCurrentMonth = (i: number) => i === data.length - 1;

  return (
    <div className="flex items-end gap-2.5" style={{ height }}>
      {data.map((d, i) => {
        const barH = max > 0 ? (d.value / max) * (height - 34) : 0;
        const current = isCurrentMonth(i);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2 h-full">
            {/* Inset track (the pressed-in groove each bar sits in) */}
            <div
              className="flex w-full max-w-[28px] flex-1 items-end justify-center rounded-full pb-1.5 px-1"
              style={{
                background: '#e6e9ef',
                boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.55), inset -4px -4px 8px rgba(255,255,255,0.85)'
              }}
            >
              <div
                className="w-full rounded-full transition-all duration-300"
                style={{
                  height: Math.max(5, barH),
                  background: current ? '#1a9e75' : '#94a3b8',
                  boxShadow: current
                    ? '0 2px 8px rgba(26,158,117,0.35)'
                    : '0 2px 5px rgba(163,177,198,0.4)'
                }}
              />
            </div>
            <span
              className="text-[10px] font-semibold"
              style={{ color: current ? '#1a9e75' : '#8991a0' }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}