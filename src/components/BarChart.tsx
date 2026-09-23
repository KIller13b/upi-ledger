export function BarChart({ data, height = 124 }: { data: Array<{ label: string; value: number }>; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2.5 pt-2" style={{ height }}>
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * (height - 30) : 0;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5 h-full">
            <div className="neu-sunken flex w-full flex-1 items-end justify-center rounded-xl p-1 pb-1">
              <div
                className="w-full max-w-[24px] rounded-lg bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)] transition-all duration-300"
                style={{ height: Math.max(3, h) }}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}