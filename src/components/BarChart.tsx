export function BarChart({ data, height = 120 }: { data: Array<{ label: string; value: number }>; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * (height - 22) : 0;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400`}
                style={{ height: Math.max(2, h) }}
              />
            </div>
            <span className="text-[9px] text-slate-500">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}