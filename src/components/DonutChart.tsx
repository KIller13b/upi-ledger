import { Wallet } from 'lucide-react';
import { ACCENT_COLOR } from '../lib/colors';

export interface Segment {
  label: string;
  value: number;
  color?: string;
}

const MUTED_SEGMENT_GRAYS = ['#94a3b8', '#64748b', '#cbd5e1', '#475569', '#a0aec0'];

export function DonutChart({
  segments,
  size = 140,
  thickness = 15
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
    /* Soft extruded circular disc container with carved chart bed */
    <div className="neu-card-disc relative flex items-center justify-center p-3">
      {/* Sunken track bed */}
      <div className="neu-inset rounded-full p-1.5 flex items-center justify-center relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Recessed base circular track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#dbe3eb"
            strokeWidth={thickness}
          />
          {total > 0 &&
            segments.map((s, i) => {
              const frac = s.value / total;
              const dash = frac * c;
              // Exactly one segment in vivid accent color, remaining in sophisticated muted grays
              const strokeColor = i === 0 ? ACCENT_COLOR : MUTED_SEGMENT_GRAYS[(i - 1) % MUTED_SEGMENT_GRAYS.length];
              const el = (
                <circle
                  key={s.label || i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={strokeColor}
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

        {/* Centered small circular accent button with icon in the middle */}
        <div className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none">
          <div className="neu-accent-circle h-10 w-10 flex items-center justify-center text-white">
            <Wallet size={17} strokeWidth={2.4} />
          </div>
        </div>
      </div>
    </div>
  );
}