import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRules } from '../hooks';
import { CATEGORIES } from '../lib/categories';
import { exportCsv, exportBackup, restoreBackup, wipeAll } from '../lib/export';
import { toast } from '../lib/toast';
import { isSoundEnabled, setSoundEnabled, playSound } from '../lib/sound';
import { Download, Archive, Trash2, Upload, X, Tag, Smartphone, ShieldCheck, HelpCircle, Volume2, VolumeX, Sparkles, Check } from 'lucide-react';

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
    'neu-input rounded-full px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none';

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
    <div className="space-y-5">
      {/* Sound & Haptics Section: Neumorphic iOS toggle switch with vivid accent highlight */}
      <section className="neu-card rounded-[30px] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-700">
            {soundOn ? <Volume2 size={17} strokeWidth={2.2} /> : <VolumeX size={17} strokeWidth={2.2} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Sound & feedback</h3>
            <p className="text-[11px] font-medium text-slate-400">Tactile acoustic feedback on interactions</p>
          </div>
        </div>

        <div className="neu-card-sm rounded-[24px] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800">Button Click Sounds</p>
            <p className="text-[11px] font-medium text-slate-400">Acoustic click on taps and navigations</p>
          </div>

          {/* Inset track switch with vivid accent "ON" state */}
          <button
            type="button"
            onClick={toggleSound}
            data-sound="pop"
            className="neu-inset h-8 w-14 rounded-full p-1 flex items-center transition-all cursor-pointer"
            aria-label="Toggle button sounds"
          >
            <div
              className={`h-6 w-6 rounded-full transition-transform duration-200 flex items-center justify-center ${
                soundOn
                  ? 'translate-x-6 bg-[#ff5238] text-white shadow-sm'
                  : 'translate-x-0 neu-btn text-slate-400'
              }`}
            >
              {soundOn && <Check size={12} strokeWidth={3} />}
            </div>
          </button>
        </div>

        {soundOn && (
          <div className="neu-inset rounded-2xl px-4 py-3 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
              <Sparkles size={13} className="text-[#ff5238]" /> Preview:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => playSound('tap')}
                className="neu-btn rounded-full px-3 py-1 text-[11px] font-bold text-slate-700"
              >
                Tap
              </button>
              <button
                onClick={() => playSound('pop')}
                className="neu-btn rounded-full px-3 py-1 text-[11px] font-bold text-slate-700"
              >
                Pop
              </button>
              <button
                onClick={() => playSound('success')}
                className="neu-btn rounded-full px-3 py-1 text-[11px] font-bold text-[#ff5238]"
              >
                Chime
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Auto-category rules */}
      <section className="neu-card rounded-[30px] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-700">
            <Tag size={17} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Auto-category rules</h3>
            <p className="text-[11px] font-medium text-slate-400">Keyword merchant matchers</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          When importing, transactions are categorised by matching keywords in the description. Add custom rules for frequent merchants.
        </p>

        <div className="flex gap-2">
          <input
            className={inputCls + ' flex-1'}
            placeholder="e.g. Swiggy, DMart"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
          />
          <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#eef1f5]">
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={add}
            data-sound="pop"
            className="neu-accent-btn rounded-full px-5 text-xs font-bold uppercase tracking-wider text-white"
          >
            Add
          </button>
        </div>

        {custom.length > 0 ? (
          <ul className="space-y-2 pt-1">
            {custom.map((r) => (
              <li
                key={r.keyword}
                className="neu-card-sm flex items-center justify-between rounded-2xl px-4 py-3 text-xs"
              >
                <span className="text-slate-800 font-semibold">
                  <span>{r.keyword}</span>
                  <span className="mx-2 text-slate-400 font-normal">→</span>
                  <span className="text-slate-600 font-bold">{r.category}</span>
                </span>
                <button
                  onClick={() => removeRule(r.keyword)}
                  data-sound="delete"
                  className="neu-btn-circle flex h-7 w-7 items-center justify-center text-slate-400 hover:text-[#ff5238]"
                  title="Remove rule"
                >
                  <X size={13} strokeWidth={2.4} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="neu-inset rounded-2xl p-4 text-center text-xs font-medium text-slate-400">
            No custom rules defined yet.
          </div>
        )}
      </section>

      {/* Backup & Data Section */}
      <section className="neu-card rounded-[30px] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-700">
            <Archive size={17} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Backup & data</h3>
            <p className="text-[11px] font-medium text-slate-400">
              {counts ? `${counts.txns} transactions across ${counts.batches.length} imports` : 'Offline storage'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              void exportCsv();
              toast('CSV downloaded', 'success');
            }}
            data-sound="pop"
            className="neu-btn flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-xs font-bold text-slate-700"
          >
            <div className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-600">
              <Download size={16} strokeWidth={2.2} />
            </div>
            Export CSV
          </button>

          <button
            onClick={() => {
              void exportBackup();
              toast('Backup downloaded', 'success');
            }}
            data-sound="pop"
            className="neu-btn flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-xs font-bold text-slate-700"
          >
            <div className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-600">
              <Archive size={16} strokeWidth={2.2} />
            </div>
            Backup JSON
          </button>

          <button
            onClick={() => restoreRef?.click()}
            data-sound="pop"
            className="neu-btn flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-xs font-bold text-slate-700"
          >
            <div className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-600">
              <Upload size={16} strokeWidth={2.2} />
            </div>
            Restore backup
          </button>

          <button
            onClick={() => {
              if (window.confirm('Delete ALL transactions, rules and imports on this phone? This cannot be undone.')) {
                void wipeAll().then(() => toast('All data erased', 'success'));
              }
            }}
            data-sound="delete"
            className="neu-btn flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-xs font-bold text-[#ff5238]"
          >
            <div className="neu-btn-circle flex h-9 w-9 items-center justify-center text-[#ff5238]">
              <Trash2 size={16} strokeWidth={2.2} />
            </div>
            Erase all data
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
      </section>

      {/* Install & privacy */}
      <section className="neu-card rounded-[30px] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-700">
            <Smartphone size={17} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Install & privacy</h3>
            <p className="text-[11px] font-medium text-slate-400">100% on-device private PWA</p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs font-medium text-slate-500 leading-relaxed">
          <p className="flex items-start gap-3">
            <Smartphone size={15} className="mt-0.5 shrink-0 text-slate-400" />
            <span>
              On iOS: open in <b>Safari</b>, tap <b>Share</b>, then <b>Add to Home Screen</b> for standalone offline usage.
            </span>
          </p>
          <p className="flex items-start gap-3">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#ff5238]" />
            <span>
              Transactions reside strictly in client IndexedDB. No accounts, telemetry, or remote servers.
            </span>
          </p>
          <p className="flex items-start gap-3">
            <HelpCircle size={15} className="mt-0.5 shrink-0 text-slate-400" />
            <span>
              Get PDF statement: GPay app → profile → Transaction history → <b>⋮</b> → Get statement.
            </span>
          </p>
        </div>
      </section>

      <p className="pb-4 text-center text-[11px] font-semibold text-slate-400">
        UPI Ledger · iOS Soft Neumorphism Edition
      </p>
    </div>
  );
}