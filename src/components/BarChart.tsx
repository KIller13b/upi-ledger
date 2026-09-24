const ACC   = '#1a9e75';
const MUTED = '#94a3b8';

export function BarChart({
  data,
  height = 130,
  highlightLast = false,
  showIncome = false,
}: {
  data: Array<{ label: string; value: number; income?: number; isCurrent?: boolean }>;
  height?: number;
  highlightLast?: boolean;
  showIncome?: boolean;
}) {
  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => showIncome ? [d.value, d.income ?? 0] : [d.value])
  );

  const isCurrent = (d: { isCurrent?: boolean }, i: number) =>
    d.isCurrent !== undefined ? d.isCurrent : (highlightLast && i === data.length - 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const active  = isCurrent(d, i);
        const spendH  = maxVal > 0 ? (d.value / maxVal) * (height - 34) : 0;
        const incomeH = showIncome && d.income && maxVal > 0
          ? (d.income / maxVal) * (height - 34)
          : 0;

        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2 h-full">
            {/* Inset track groove */}
            <div
              className="w-full max-w-[28px] flex-1 flex items-end rounded-full pb-1.5"
              style={{
                background: '#e6e9ef',
                boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.55), inset -4px -4px 8px rgba(255,255,255,0.85)',
                justifyContent: 'center',
                gap: showIncome ? 2 : 0,
                paddingLeft: showIncome ? 2 : 4,
                paddingRight: showIncome ? 2 : 4,
              }}
            >
              {/* Expense bar */}
              <div
                className="rounded-full transition-all duration-300"
                style={{
                  flex: showIncome ? 1 : undefined,
                  width: showIncome ? undefined : '100%',
                  height: Math.max(4, spendH),
                  background: active ? ACC : MUTED,
                  boxShadow: active
                    ? '0 2px 8px rgba(26,158,117,0.35)'
                    : '0 2px 5px rgba(163,177,198,0.4)',
                }}
              />
              {/* Income bar */}
              {showIncome && (
                <div
                  className="rounded-full transition-all duration-300"
                  style={{
                    flex: 1,
                    height: Math.max(4, incomeH),
                    background: 'rgba(26,158,117,0.4)',
                    boxShadow: '0 2px 5px rgba(26,158,117,0.2)',
                  }}
                />
              )}
            </div>

            <span
              className="text-[9px] font-semibold truncate w-full text-center"
              style={{ color: active ? ACC : '#8991a0' }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}