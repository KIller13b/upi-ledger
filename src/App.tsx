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
    <div className="mx-auto flex min-h-full max-w-lg flex-col" style={{ background: '#e6e9ef' }}>
      {/* Header — flat base color, no border, subtle bottom shadow for separation */}
      <header
        className="sticky top-0 z-30 px-6 pb-4 pt-[calc(1.1rem+env(safe-area-inset-top))] backdrop-blur-sm"
        style={{
          background: 'rgba(230,233,239,0.96)',
          boxShadow: '0 4px 12px rgba(163,177,198,0.25)'
        }}
      >
        <h1 style={{ color: '#2f3542' }} className="text-2xl font-extrabold tracking-tight leading-tight">
          {title}
        </h1>
        <p style={{ color: '#8991a0' }} className="mt-0.5 text-xs font-medium">
          {sub}
        </p>
      </header>

      <main className="flex-1 px-5 pb-32 pt-3">
        <div key={tab}>
          {tab === 'dashboard'    && <Dashboard onNavigate={setTab} />}
          {tab === 'transactions' && <TransactionsView />}
          {tab === 'import'       && <ImportView onDone={() => setTab('dashboard')} />}
          {tab === 'settings'     && <SettingsView />}
        </div>
      </main>

      <BottomNav tab={tab} onChange={setTab} />
      <ToastHost />
    </div>
  );
}