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
  const color = kind === 'success' ? 'text-[#ff5238]' : kind === 'error' ? 'text-[#ff5238]' : 'text-slate-600';

  return (
    <div className="fixed inset-x-0 top-5 z-50 flex justify-center px-4 pointer-events-none">
      {/* Floating pill toast with dual soft shadows */}
      <div className="neu-float-nav flex items-center gap-2.5 rounded-full px-5 py-2.5">
        <div className="neu-btn-circle flex h-6 w-6 items-center justify-center">
          <Icon size={14} className={color} strokeWidth={2.5} />
        </div>
        <span className="text-xs font-bold text-slate-800 tracking-tight">{msg}</span>
      </div>
    </div>
  );
}