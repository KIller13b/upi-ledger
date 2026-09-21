import type { TabId } from '../types';
import { LayoutDashboard, ArrowLeftRight, Upload, Settings } from 'lucide-react';

const items: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export function BottomNav({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg">
        {items.map((it) => {
          const active = tab === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                active ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="font-medium">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}