import { useEffect, useState } from 'react';
import { setToastListener, type ToastKind } from '../lib/toast';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<ToastKind>('info');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    setToastListener((m, k) => {
      setMsg(m);
      setKind(k);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2600);
    });
    return () => {
      clearTimeout(timer);
      setToastListener(null);
    };
  }, []);

  if (!msg) return null;
  const Icon = kind === 'success' ? CheckCircle2 : kind === 'error' ? AlertCircle : Info;
  const color = kind === 'success' ? 'text-emerald-400' : kind === 'error' ? 'text-red-400' : 'text-sky-400';
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 pointer-events-none">
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-2.5 shadow-lg shadow-black/40 backdrop-blur">
        <Icon size={16} className={color} />
        <span className="text-sm text-slate-100">{msg}</span>
      </div>
    </div>
  );
}