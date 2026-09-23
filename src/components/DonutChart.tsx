import { Wallet } from 'lucide-react';

export interface Segment {
  label: string;
  value: number;
  color?: string;
}

const MUTED = ['#94a3b8', '#64748b', '#b0bec5', '#78909c', '#90a4ae', '#a8b2be'];

export function DonutChart({
  segments,
  size = 148,
  thickness = 17
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    /* Soft extruded circular disc */
    <div className="neu-card-disc relative flex items-center justify-center p-3.5 shrink-0">
      {/* Inset-pressed circular track bed */}
      <div className="relative flex items-center justify-center" style={{
        borderRadius: '9999px',
        padding: '6px',
        boxShadow: 'inset 4px 4px 9px rgba(163,177,198,0.55), inset -4px -4px 9px rgba(255,255,255,0.85)',
        background: '#e6e9ef'
      }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Sunken track ring */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="rgba(163,177,198,0.3)"
            strokeWidth={thickness}
          />
          {total > 0 && segments.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * c;
            const color = i === 0 ? '#1a9e75' : MUTED[(i - 1) % MUTED.length];
            const el = (
              <circle
                key={s.label + i}
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke={color}
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

        {/* Centred accent circle — raised, small */}
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: 40, height: 40,
            background: '#1a9e75',
            boxShadow: '4px 4px 10px rgba(26,158,117,0.3), -3px -3px 8px rgba(255,255,255,0.85)'
          }}
        >
          <Wallet size={16} strokeWidth={2.4} color="#ffffff" />
        </div>
      </div>
    </div>
  );
}