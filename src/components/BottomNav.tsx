import type { TabId } from '../types';
import { LayoutDashboard, ArrowLeftRight, Upload, Settings } from 'lucide-react';

const items: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard',    label: 'Home',    icon: LayoutDashboard },
  { id: 'transactions', label: 'Txns',    icon: ArrowLeftRight  },
  { id: 'import',       label: 'Import',  icon: Upload          },
  { id: 'settings',     label: 'Settings',icon: Settings        }
];

export function BottomNav({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    /* Floating rounded-pill nav, centered, lifted above the safe area */
    <nav className="fixed inset-x-0 bottom-5 z-40 mx-auto max-w-xs px-3 pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div className="neu-float-nav pointer-events-auto flex items-center justify-around px-2 py-2">
        {items.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              data-sound="pop"
              aria-label={label}
              className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-full transition-all duration-200 focus:outline-none"
              style={{ width: 60 }}
            >
              {/* Circular icon container — raised when inactive, inset when active */}
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200"
                style={{
                  background: '#e6e9ef',
                  boxShadow: active
                    ? 'inset 4px 4px 8px rgba(163,177,198,0.55), inset -4px -4px 8px rgba(255,255,255,0.85)'
                    : '5px 5px 12px rgba(163,177,198,0.55), -5px -5px 12px rgba(255,255,255,0.85)'
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 1.9}
                  style={{ color: active ? '#1a9e75' : '#8991a0' }}
                />
              </span>
              <span
                className="text-[10px] font-semibold leading-none"
                style={{ color: active ? '#1a9e75' : '#8991a0' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}