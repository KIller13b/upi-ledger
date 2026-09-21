const PALETTE = [
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#2dd4bf',
  '#fb923c',
  '#a3e635',
  '#38bdf8',
  '#e879f9',
  '#f97316',
  '#94a3b8'
];

export function categoryColor(category: string): string {
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function blend(c: string, amt: number): string {
  const n = parseInt(c.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (ch: number) => Math.round(ch + (255 - ch) * amt);
  return `#${((mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).padStart(6, '0')}`;
}