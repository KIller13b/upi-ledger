import { useState, useEffect } from 'react';
import type { TabId } from './types';
import { ToastHost } from './components/Toast';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { TransactionsView } from './components/TransactionsView';
import { ImportView } from './components/ImportView';
import { SettingsView } from './components/SettingsView';
import { initSoundListener } from './lib/sound';

const TITLES: Record<TabId, [string, string]> = {
  dashboard: ['UPI Ledger', 'Your money in one place'],
  transactions: ['Transactions', 'Search, filter, manage'],
  import: ['Import statement', 'From Google Pay or your bank'],
  settings: ['Settings', 'Rules, backup & privacy']
};

export default function App() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [title, sub] = TITLES[tab];

  useEffect(() => {
    return initSoundListener();
  }, []);

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <header className="sticky top-0 z-30 bg-[#0c1424]/90 px-4 pb-3.5 pt-[calc(0.85rem+env(safe-area-inset-top))] backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] border-b border-white/[0.04]">
        <h1 className="text-xl font-bold tracking-tight text-slate-50 drop-shadow-sm">{title}</h1>
        <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
      </header>

      <main className="flex-1 px-4 pb-28 pt-3">
        <div key={tab}>
          {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
          {tab === 'transactions' && <TransactionsView />}
          {tab === 'import' && <ImportView onDone={() => setTab('dashboard')} />}
          {tab === 'settings' && <SettingsView />}
        </div>
      </main>

      <BottomNav tab={tab} onChange={setTab} />
      <ToastHost />
    </div>
  );
}