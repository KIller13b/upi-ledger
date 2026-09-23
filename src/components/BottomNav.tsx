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
    <nav className="fixed inset-x-0 bottom-5 z-40 mx-auto max-w-xs px-2 pointer-events-none pb-[env(safe-area-inset-bottom)]">
      {/* Floating rounded pill nav bar */}
      <div className="neu-float-nav pointer-events-auto flex items-center justify-around py-2 px-2.5">
        {items.map((it) => {
          const active = tab === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              data-sound="pop"
              aria-label={it.label}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                active
                  ? 'neu-btn-circle text-[#ff5238]'
                  : 'text-slate-400 hover:text-slate-600 active:scale-95'
              }`}
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.4 : 1.9}
                className="transition-transform duration-150"
              />
              {active && (
                <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#ff5238]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}