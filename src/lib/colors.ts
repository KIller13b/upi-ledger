// Soft monochrome palette with a single vivid accent color (fintech iOS Neumorphism)
export const ACCENT_COLOR = '#ff5238'; // Vivid orange/coral red

// Sophisticated cool blue-gray tones for secondary segments and tags
const MUTED_GRAYS = [
  '#64748b',
  '#94a3b8',
  '#475569',
  '#78889b',
  '#526071',
  '#a0aec0',
  '#718096',
  '#8395a7',
  '#6c7a89',
  '#596275'
];

export function categoryColor(category: string, isAccent = false): string {
  if (isAccent) return ACCENT_COLOR;
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return MUTED_GRAYS[h % MUTED_GRAYS.length];
}

export function blend(c: string, amt: number): string {
  const n = parseInt(c.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (ch: number) => Math.round(ch + (255 - ch) * amt);
  return `#${((mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).padStart(6, '0')}`;
}