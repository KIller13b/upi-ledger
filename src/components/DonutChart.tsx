export interface Segment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ segments, size = 120, thickness = 14 }: { segments: Segment[]; size?: number; thickness?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative flex items-center justify-center p-1.5 rounded-full neu-sunken">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Recessed track background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#090f1b"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            );
            offset += dash;
            return el;
          })}
      </svg>
    </div>
  );
}