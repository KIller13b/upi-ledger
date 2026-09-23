// Accent is #1a9e75 (softened emerald green)
export const ACCENT_COLOR = '#1a9e75';

// Muted cool grays for chart segments; accent reserved for the top segment only
const MUTED_SEGMENTS = [
  '#94a3b8',
  '#64748b',
  '#b0bec5',
  '#78909c',
  '#90a4ae',
  '#546e7a',
  '#a8b2be',
];

export function categoryColor(category: string, topSlot = false): string {
  if (topSlot) return ACCENT_COLOR;
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return MUTED_SEGMENTS[h % MUTED_SEGMENTS.length];
}

export function blend(c: string, amt: number): string {
  const n = parseInt(c.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >>  8) & 255;
  const b =  n        & 255;
  const mix = (ch: number) => Math.round(ch + (255 - ch) * amt);
  return `#${((mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).padStart(6, '0')}`;
}