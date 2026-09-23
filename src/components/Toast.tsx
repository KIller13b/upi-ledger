import { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

type ToastT = { id: number; msg: string; kind: 'success' | 'error' | 'info' };

let _push: ((msg: string, kind: ToastT['kind']) => void) | null = null;

export function toast(msg: string, kind: ToastT['kind'] = 'info') {
  _push?.(msg, kind);
}

const ICONS = {
  success: <CheckCircle2  size={16} strokeWidth={2.4} style={{ color: '#1a9e75' }} />,
  error:   <AlertTriangle size={16} strokeWidth={2.4} style={{ color: '#dc2626' }} />,
  info:    <Info          size={16} strokeWidth={2.4} style={{ color: '#5b6272' }} />
} as const;

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastT[]>([]);

  useEffect(() => {
    let id = 0;
    _push = (msg, kind) => {
      const t: ToastT = { id: ++id, msg, kind };
      setToasts((p) => [...p.slice(-3), t]);
      setTimeout(() => setToasts((p) => p.filter((x) => x.id !== t.id)), 3000);
    };
    return () => { _push = null; };
  }, []);

  return (
    <div className="fixed inset-x-0 top-5 z-50 flex flex-col items-center gap-2 px-5 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-5 py-3.5 pointer-events-auto"
          style={{
            background: 'rgba(230,233,239,0.97)',
            backdropFilter: 'blur(20px)',
            borderRadius: 9999,
            boxShadow: '7px 7px 18px rgba(163,177,198,0.55), -7px -7px 18px rgba(255,255,255,0.85)',
            border: 'none',
            maxWidth: '90vw'
          }}
        >
          {ICONS[t.kind]}
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2f3542' }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}