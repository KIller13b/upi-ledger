export function fmtRupee(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return '\u20b9' + s;
}

export function fmtSigned(n: number): string {
  return (n < 0 ? '-\u20b9' : '+\u20b9') + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function toDateStr(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function monthLabel(key: string): string {
  const d = new Date(key + '-01T00:00:00');
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function dayStamp(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getTime();
}

export function todayStr(): string {
  return toDateStr(Date.now());
}