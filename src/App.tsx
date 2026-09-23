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
    <div className="mx-auto flex min-h-full max-w-lg flex-col bg-[#eef1f5]">
      {/* Flat cool light-gray header with generous spacing and bold dark slate heading */}
      <header className="sticky top-0 z-30 bg-[#eef1f5]/90 px-6 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-md">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{title}</h1>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p>
      </header>

      <main className="flex-1 px-5 pb-32 pt-2">
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