import { useRef } from 'react';
import { Wallet } from 'lucide-react';

export interface Segment {
  label: string;
  value: number;
}

const MUTED = ['#94a3b8', '#64748b', '#b0bec5', '#78909c', '#90a4ae', '#a8b2be'];
const ACC = '#1a9e75';

export function DonutChart({
  segments,
  selected = -1,
  onSelect,
  size = 148,
  thickness = 17
}: {
  segments: Segment[];
  selected?: number;
  onSelect?: (idx: number) => void;
  size?: number;
  thickness?: number;
}) {
  const svgRef     = useRef<SVGSVGElement>(null);
  const lastIdx    = useRef<number>(-1);
  const isDragging = useRef(false);

  const total = segments.reduce((a, s) => a + s.value, 0);
  const r  = (size - thickness) / 2;
  const c  = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  /* Build cumulative angular ranges (0..1) per segment */
  const ranges: { start: number; end: number }[] = [];
  let cum = 0;
  for (const s of segments) {
    const frac = total > 0 ? s.value / total : 0;
    ranges.push({ start: cum, end: cum + frac });
    cum += frac;
  }

  /* Map a pointer client position → segment index (or -1 if outside ring) */
  const hitTest = (clientX: number, clientY: number): number => {
    if (!svgRef.current || total === 0 || segments.length === 0) return -1;
    const rect   = svgRef.current.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    const px = (clientX - rect.left) * scaleX;
    const py = (clientY - rect.top)  * scaleY;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    /* Accept touches in a wide band around the ring */
    if (dist < r * 0.38) return -1; // inside the center hole → ignore

    /* Angle from the top (12-o'clock), going clockwise, mapped 0..1 */
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    const frac = angle / (2 * Math.PI);

    for (let i = 0; i < ranges.length; i++) {
      if (frac >= ranges[i].start && frac < ranges[i].end) return i;
    }
    return ranges.length - 1; // edge wrap at exactly 360°
  };

  /* Notify parent only when segment actually changes */
  const notify = (idx: number) => {
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      onSelect?.(idx);
    }
  };

  /* Colors & labels for the selected state */
  const selColor = selected >= 0
    ? (selected === 0 ? ACC : MUTED[(selected - 1) % MUTED.length])
    : ACC;

  const selPct = selected >= 0 && total > 0
    ? Math.round((segments[selected].value / total) * 100)
    : null;

  /* Render SVG segments */
  let dashOffset = 0;

  return (
    <div
      className="neu-card-disc relative flex items-center justify-center p-3.5 shrink-0"
      style={{ touchAction: 'none' }}
    >
      {/* Inset ring bed */}
      <div
        className="relative flex items-center justify-center"
        style={{
          borderRadius: '9999px',
          padding: '6px',
          background: '#e6e9ef',
          boxShadow: 'inset 4px 4px 9px rgba(163,177,198,0.55), inset -4px -4px 9px rgba(255,255,255,0.85)'
        }}
      >
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          style={{ touchAction: 'none', cursor: 'pointer', display: 'block', userSelect: 'none' }}
          onPointerDown={(e) => {
            isDragging.current = true;
            (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
            notify(hitTest(e.clientX, e.clientY));
          }}
          onPointerMove={(e) => {
            if (!isDragging.current) return;
            notify(hitTest(e.clientX, e.clientY));
          }}
          onPointerUp={() => {
            isDragging.current = false;
            notify(-1);
          }}
          onPointerCancel={() => {
            isDragging.current = false;
            notify(-1);
          }}
        >
          {/* Track groove */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(163,177,198,0.28)"
            strokeWidth={thickness}
          />

          {total > 0 && segments.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * c;
            const color     = i === 0 ? ACC : MUTED[(i - 1) % MUTED.length];
            const isSelected  = selected === i;
            const isAnySelected = selected >= 0;

            const el = (
              <circle
                key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? thickness + 5 : thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-dashOffset}
                strokeLinecap="round"
                opacity={isAnySelected && !isSelected ? 0.28 : 1}
                style={{
                  transition: 'stroke-width 0.13s ease, opacity 0.13s ease',
                  filter: isSelected ? 'drop-shadow(0 0 4px rgba(0,0,0,0.18))' : 'none'
                }}
              />
            );
            dashOffset += dash;
            return el;
          })}
        </svg>

        {/* Centre disc — changes color + shows % when a segment is active */}
        <div
          className="absolute flex flex-col items-center justify-center rounded-full"
          style={{
            width: 46, height: 46,
            background: selColor,
            boxShadow: '4px 4px 12px rgba(0,0,0,0.12), -3px -3px 8px rgba(255,255,255,0.85)',
            transition: 'background 0.16s ease'
          }}
        >
          {selPct !== null ? (
            <span style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.5px',
              pointerEvents: 'none'
            }}>
              {selPct}%
            </span>
          ) : (
            <Wallet size={17} strokeWidth={2.4} color="#ffffff" />
          )}
        </div>
      </div>
    </div>
  );
}