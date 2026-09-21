import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRules } from '../hooks';
import { CATEGORIES } from '../lib/categories';
import { exportCsv, exportBackup, restoreBackup, wipeAll } from '../lib/export';
import { toast } from '../lib/toast';
import { Download, Archive, Trash2, Upload, X, Tag, Smartphone, ShieldCheck, HelpCircle } from 'lucide-react';

export function SettingsView() {
  const { custom, addRule, removeRule } = useRules();
  const counts = useLiveQuery(async () => {
    const [txns, batches] = await Promise.all([
      db.transactions.count(),
      db.importBatches.toArray()
    ]);
    return { txns, batches };
  }, []);

  const [kw, setKw] = useState('');
  const [cat, setCat] = useState<string>(CATEGORIES[0]);
  const [restoreRef, setRestoreRef] = useState<HTMLInputElement | null>(null);

  const inputCls =
    'rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none';

  const add = async () => {
    const ok = await addRule(kw, cat);
    if (ok) {
      setKw('');
      toast('Rule added', 'success');
    } else {
      toast('That keyword already exists', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
          <Tag size={16} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-100">Auto-category rules</h2>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-xs text-slate-500">
            When importing, transactions are categorised by matching keywords in the description. Add your own rules for
            merchants you use often.
          </p>
          <div className="flex gap-2">
            <input
              className={inputCls + ' flex-1'}
              placeholder="e.g. sg digital, dmart"
              value={kw}
              onChange={(e) => setKw(e.target.value)}
            />
            <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={add}
              className="rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950"
            >
              Add
            </button>
          </div>
          {custom.length > 0 ? (
            <ul className="space-y-1.5">
              {custom.map((r) => (
                <li
                  key={r.keyword}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2 text-sm"
                >
                  <span className="text-slate-200">
                    <b>{r.keyword}</b>
                    <span className="mx-1.5 text-slate-500">→</span>
                    <span className="text-emerald-400">{r.category}</span>
                  </span>
                  <button
                    onClick={() => removeRule(r.keyword)}
                    className="rounded-lg p-1 text-slate-500 hover:text-red-400"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-600">No custom rules yet.</p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
          <Archive size={16} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-100">Backup & data</h2>
        </div>
        <div className="space-y-2 p-4">
          <p className="text-xs text-slate-500">
            {counts ? `${counts.txns} transactions across ${counts.batches.length} imports.` : '…'} Back up regularly so
            your data is never lost.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                void exportCsv();
                toast('CSV downloaded', 'success');
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-200"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={() => {
                void exportBackup();
                toast('Backup downloaded', 'success');
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-200"
            >
              <Archive size={15} /> Backup file
            </button>
            <button
              onClick={() => restoreRef?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-200"
            >
              <Upload size={15} /> Restore backup
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete ALL transactions, rules and imports on this phone? This cannot be undone.')) {
                  void wipeAll().then(() => toast('All data erased', 'success'));
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2.5 text-sm font-medium text-red-400"
            >
              <Trash2 size={15} /> Erase everything
            </button>
          </div>
          <input
            ref={setRestoreRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const r = await restoreBackup(f);
                toast(`Restored ${r.transactions} transactions`, 'success');
              } catch (err) {
                console.error(err);
                toast('That is not a valid backup file', 'error');
              }
            }}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
          <Smartphone size={16} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-100">Install & privacy</h2>
        </div>
        <div className="space-y-3 p-4 text-xs leading-relaxed text-slate-400">
          <p className="flex items-start gap-2">
            <Smartphone size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <span>
              On your iPhone: open this app in <b>Safari</b>, tap the <b>Share</b> button, then <b>Add to Home Screen</b>.
              It opens full-screen and works offline.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <span>
              Everything is stored only in Safari on this phone. Nothing is uploaded anywhere. You, and this app, are the
              only ones who ever see your transactions.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <HelpCircle size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <span>
              Need a statement? Google Pay → profile → See transaction history → <b>⋮</b> → Get statement → Share.
            </span>
          </p>
        </div>
      </section>

      <p className="pb-2 text-center text-[10px] text-slate-600">UPI Ledger v1.0 · made for personal use</p>
    </div>
  );
}