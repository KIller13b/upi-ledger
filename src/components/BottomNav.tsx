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
    <nav className="neu-nav-bar fixed inset-x-0 bottom-0 z-40 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex max-w-lg px-3">
        {items.map((it) => {
          const active = tab === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              data-sound="pop"
              className="group flex flex-1 flex-col items-center justify-center py-1 text-[11px] transition-all"
            >
              <div
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-all ${
                  active
                    ? 'neu-nav-item-active text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.9}
                  className={`transition-transform duration-150 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'group-hover:scale-105'}`}
                />
                <span className={`text-[10px] font-medium tracking-tight ${active ? 'font-semibold text-emerald-400' : ''}`}>
                  {it.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}