
export function BarChart({
  data,
  height = 135
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-3 pt-2" style={{ height }}>
      {data.map((d, i) => {
        const isCurrentMonth = i === data.length - 1;
        const h = max > 0 ? (d.value / max) * (height - 36) : 0;

        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2 h-full">
            {/* Inset sunken vertical track */}
            <div className="neu-inset flex w-full max-w-[32px] flex-1 items-end justify-center rounded-full p-1 pb-1">
              <div
                className={`w-full rounded-full transition-all duration-300 ${
                  isCurrentMonth ? 'bg-[#ff5238] shadow-[0_2px_8px_rgba(255,82,56,0.35)]' : 'bg-[#94a3b8]'
                }`}
                style={{ height: Math.max(6, h) }}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight ${
                isCurrentMonth ? 'font-bold text-[#ff5238]' : 'font-medium text-slate-500'
              }`}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}