import { useEffect, useState } from 'react';
import { setToastListener, type ToastKind } from '../lib/toast';
import { playSound } from '../lib/sound';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<ToastKind>('info');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    setToastListener((m, k) => {
      setMsg(m);
      setKind(k);
      if (k === 'success') {
        playSound('success');
      } else if (k === 'error') {
        playSound('delete');
      } else {
        playSound('pop');
      }
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
      <div className="neu-card flex items-center gap-2.5 rounded-2xl px-4 py-2.5 shadow-2xl border border-white/[0.08] backdrop-blur-md">
        <div className="neu-sunken flex h-6 w-6 items-center justify-center rounded-lg">
          <Icon size={15} className={color} />
        </div>
        <span className="text-xs font-semibold text-slate-100">{msg}</span>
      </div>
    </div>
  );
}