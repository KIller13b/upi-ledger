import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRules } from '../hooks';
import { CATEGORIES } from '../lib/categories';
import { exportCsv, exportBackup, restoreBackup, wipeAll } from '../lib/export';
import { toast } from '../lib/toast';
import { isSoundEnabled, setSoundEnabled, playSound } from '../lib/sound';
import { Download, Archive, Trash2, Upload, X, Tag, Smartphone, ShieldCheck, HelpCircle, Volume2, VolumeX, Sparkles } from 'lucide-react';

export function SettingsView() {
  const { custom, addRule, removeRule } = useRules();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
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
    'neu-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none';

  const add = async () => {
    const ok = await addRule(kw, cat);
    if (ok) {
      setKw('');
      toast('Rule added', 'success');
    } else {
      toast('That keyword already exists', 'error');
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playSound('success');
      toast('Sound effects enabled', 'success');
    } else {
      toast('Sound effects muted', 'info');
    }
  };

  return (
    <div className="space-y-4">
      {/* Sound & Haptics Section */}
      <section className="neu-card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-3">
          <div className="neu-sunken flex h-7 w-7 items-center justify-center rounded-lg text-emerald-400">
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </div>
          <h2 className="text-sm font-semibold text-slate-100">Sound & Tactile Feedback</h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-200">Button Click Sounds</p>
              <p className="text-[11px] text-slate-400">Tactile acoustic feedback on clicks, taps, and actions</p>
            </div>
            <button
              onClick={toggleSound}
              data-sound="pop"
              className={`neu-pill flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                soundOn ? 'neu-pill-active text-emerald-400' : 'text-slate-400'
              }`}
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{soundOn ? 'Enabled' : 'Muted'}</span>
            </button>
          </div>

          {soundOn && (
            <div className="neu-sunken flex items-center justify-between rounded-xl px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Sparkles size={12} className="text-emerald-400" /> Preview sounds:
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => playSound('tap')}
                  className="neu-btn rounded-lg px-2.5 py-1 text-[10px] font-medium text-slate-300"
                >
                  Tap
                </button>
                <button
                  onClick={() => playSound('pop')}
                  className="neu-btn rounded-lg px-2.5 py-1 text-[10px] font-medium text-slate-300"
                >
                  Pop
                </button>
                <button
                  onClick={() => playSound('success')}
                  className="neu-btn rounded-lg px-2.5 py-1 text-[10px] font-medium text-emerald-400"
                >
                  Chime
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Auto-category rules */}
      <section className="neu-card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-3">
          <div className="neu-sunken flex h-7 w-7 items-center justify-center rounded-lg text-emerald-400">
            <Tag size={16} />
          </div>
          <h2 className="text-sm font-semibold text-slate-100">Auto-category rules</h2>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-xs text-slate-400">
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
                <option key={c} value={c} className="bg-slate-900">
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={add}
              data-sound="pop"
              className="neu-btn-primary rounded-xl px-4 text-xs font-bold text-slate-950"
            >
              Add
            </button>
          </div>
          {custom.length > 0 ? (
            <ul className="space-y-1.5 pt-1">
              {custom.map((r) => (
                <li
                  key={r.keyword}
                  className="neu-sunken flex items-center justify-between rounded-xl px-3 py-2 text-xs"
                >
                  <span className="text-slate-200">
                    <b className="font-semibold text-slate-100">{r.keyword}</b>
                    <span className="mx-2 text-slate-500">→</span>
                    <span className="text-emerald-400 font-medium">{r.category}</span>
                  </span>
                  <button
                    onClick={() => removeRule(r.keyword)}
                    data-sound="delete"
                    className="neu-btn rounded-lg p-1.5 text-slate-400 hover:text-red-400"
                    title="Remove rule"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No custom rules yet.</p>
          )}
        </div>
      </section>

      {/* Backup & Data */}
      <section className="neu-card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-3">
          <div className="neu-sunken flex h-7 w-7 items-center justify-center rounded-lg text-sky-400">
            <Archive size={16} />
          </div>
          <h2 className="text-sm font-semibold text-slate-100">Backup & data</h2>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-xs text-slate-400">
            {counts ? `${counts.txns} transactions across ${counts.batches.length} imports.` : '…'} Back up regularly so
            your data is never lost.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                void exportCsv();
                toast('CSV downloaded', 'success');
              }}
              data-sound="pop"
              className="neu-btn flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={() => {
                void exportBackup();
                toast('Backup downloaded', 'success');
              }}
              data-sound="pop"
              className="neu-btn flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200"
            >
              <Archive size={15} /> Backup file
            </button>
            <button
              onClick={() => restoreRef?.click()}
              data-sound="pop"
              className="neu-btn flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200"
            >
              <Upload size={15} /> Restore backup
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete ALL transactions, rules and imports on this phone? This cannot be undone.')) {
                  void wipeAll().then(() => toast('All data erased', 'success'));
                }
              }}
              data-sound="delete"
              className="neu-btn-danger flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
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

      {/* Install & privacy */}
      <section className="neu-card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-3">
          <div className="neu-sunken flex h-7 w-7 items-center justify-center rounded-lg text-emerald-400">
            <Smartphone size={16} />
          </div>
          <h2 className="text-sm font-semibold text-slate-100">Install & privacy</h2>
        </div>
        <div className="space-y-3 p-4 text-xs leading-relaxed text-slate-400">
          <p className="flex items-start gap-2.5">
            <Smartphone size={15} className="mt-0.5 shrink-0 text-slate-400" />
            <span>
              On your phone: open this app in <b>Safari</b> (or Chrome on Android), tap <b>Share</b>, then <b>Add to Home Screen</b>.
              It opens full-screen and works offline like a native app.
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-400" />
            <span>
              Everything is stored only in IndexedDB on this phone. Nothing is uploaded anywhere. You, and this app, are the
              only ones who ever see your transactions.
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <HelpCircle size={15} className="mt-0.5 shrink-0 text-sky-400" />
            <span>
              Need a statement? Google Pay → profile → See transaction history → <b>⋮</b> → Get statement → Share.
            </span>
          </p>
        </div>
      </section>

      <p className="pb-2 text-center text-[10px] text-slate-500 font-medium">UPI Ledger · Neumorphic Offline Edition</p>
    </div>
  );
}