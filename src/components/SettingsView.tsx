import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRules } from '../hooks';
import { CATEGORIES } from '../lib/categories';
import { exportCsv, exportBackup, restoreBackup, wipeAll } from '../lib/export';
import { toast } from '../lib/toast';
import { setBudget, deleteBudget } from '../lib/budgets';
import { isSoundEnabled, setSoundEnabled, isHapticsEnabled, setHapticsEnabled, playSound } from '../lib/sound';
import { fmtRupee } from '../lib/format';
import { Download, Archive, Trash2, Upload, X, Tag, Smartphone, ShieldCheck, HelpCircle, Volume2, VolumeX, Sparkles, Check, Vibrate, Target, PlusCircle } from 'lucide-react';

const RAISED    = '7px 7px 16px rgba(163,177,198,0.55), -7px -7px 16px rgba(255,255,255,0.85)';
const RAISED_SM = '5px 5px 12px rgba(163,177,198,0.55), -5px -5px 12px rgba(255,255,255,0.85)';
const INSET     = 'inset 5px 5px 10px rgba(163,177,198,0.55), inset -5px -5px 10px rgba(255,255,255,0.85)';
const INSET_SM  = 'inset 3px 3px 7px rgba(163,177,198,0.55), inset -3px -3px 7px rgba(255,255,255,0.85)';
const BASE = '#e6e9ef';
const H1   = '#2f3542';
const H2   = '#5b6272';
const H3   = '#8991a0';
const ACC  = '#1a9e75';

const inputSt: React.CSSProperties = {
  background: BASE, boxShadow: INSET, border: 'none', color: H1,
  borderRadius: 9999, padding: '10px 16px', fontSize: '0.73rem', fontWeight: 600
};

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '1.5rem' }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Raised square icon container */}
      <span style={{ width: 42, height: 42, borderRadius: 16, background: BASE, boxShadow: RAISED_SM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-extrabold" style={{ color: H1 }}>{title}</h3>
        <p className="text-[11px] font-medium" style={{ color: H3 }}>{sub}</p>
      </div>
    </div>
  );
}

export function SettingsView() {
  const { custom, addRule, removeRule } = useRules();
  const [soundOn,   setSoundOn]   = useState(isSoundEnabled());
  const [hapticsOn, setHapticsOn] = useState(isHapticsEnabled());
  const counts = useLiveQuery(async () => {
    const [txns, batches] = await Promise.all([db.transactions.count(), db.importBatches.toArray()]);
    return { txns, batches };
  }, []);
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];

  // Budget form state
  const [budgetCat, setBudgetCat] = useState<string>(CATEGORIES[0]);
  const [budgetAmt, setBudgetAmt] = useState('');

  const [kw,  setKw]  = useState('');
  const [cat, setCat] = useState<string>(CATEGORIES[0]);
  const [restoreRef, setRestoreRef] = useState<HTMLInputElement | null>(null);

  const add = async () => {
    const ok = await addRule(kw, cat);
    if (ok) { setKw(''); toast('Rule added', 'success'); }
    else toast('That keyword already exists', 'error');
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) { playSound('success'); toast('Sound effects enabled', 'success'); }
    else toast('Sound effects muted', 'info');
  };

  const toggleHaptics = () => {
    const next = !hapticsOn;
    setHapticsOn(next);
    setHapticsEnabled(next);
    if (next) { playSound('success'); toast('Haptics enabled', 'success'); }
    else toast('Haptics disabled', 'info');
  };

  return (
    <div className="space-y-5">
      {/* ── Sound & Feedback ── */}
      <SectionCard>
        <SectionHeader
          icon={soundOn ? <Volume2 size={17} strokeWidth={2} style={{ color: H2 }} /> : <VolumeX size={17} strokeWidth={2} style={{ color: H3 }} />}
          title="Sound & feedback"
          sub="Acoustic + haptic feedback on every interaction"
        />

        {/* Sound toggle */}
        <div style={{ background: BASE, borderRadius: 20, boxShadow: RAISED_SM, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="text-xs font-bold" style={{ color: H1 }}>Button Click Sounds</p>
            <p className="text-[11px] font-medium" style={{ color: H3 }}>Acoustic click on taps and navigations</p>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            data-sound="pop"
            aria-label="Toggle sounds"
            style={{
              width: 52, height: 30, borderRadius: 20,
              background: BASE, boxShadow: INSET_SM,
              border: 'none', padding: 4, display: 'flex',
              alignItems: 'center', cursor: 'pointer', flexShrink: 0
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 9999,
              background: soundOn ? ACC : BASE,
              boxShadow: soundOn
                ? '2px 2px 6px rgba(26,158,117,0.35), -1px -1px 4px rgba(255,255,255,0.85)'
                : RAISED_SM,
              transform: soundOn ? 'translateX(22px)' : 'translateX(0)',
              transition: 'all 0.22s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {soundOn && <Check size={11} color="#fff" strokeWidth={3} />}
            </div>
          </button>
        </div>

        {/* Haptics toggle */}
        <div style={{ background: BASE, borderRadius: 20, boxShadow: RAISED_SM, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <div className="flex items-center gap-3">
            <span style={{ width: 34, height: 34, borderRadius: 12, background: BASE, boxShadow: RAISED_SM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Vibrate size={15} strokeWidth={2} style={{ color: hapticsOn ? ACC : H3 }} />
            </span>
            <div>
              <p className="text-xs font-bold" style={{ color: H1 }}>Haptic Feedback</p>
              <p className="text-[11px] font-medium" style={{ color: H3 }}>Vibration on taps, swipes and confirmations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleHaptics}
            data-sound="pop"
            aria-label="Toggle haptics"
            style={{
              width: 52, height: 30, borderRadius: 20,
              background: BASE, boxShadow: INSET_SM,
              border: 'none', padding: 4, display: 'flex',
              alignItems: 'center', cursor: 'pointer', flexShrink: 0
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 9999,
              background: hapticsOn ? ACC : BASE,
              boxShadow: hapticsOn
                ? '2px 2px 6px rgba(26,158,117,0.35), -1px -1px 4px rgba(255,255,255,0.85)'
                : RAISED_SM,
              transform: hapticsOn ? 'translateX(22px)' : 'translateX(0)',
              transition: 'all 0.22s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {hapticsOn && <Check size={11} color="#fff" strokeWidth={3} />}
            </div>
          </button>
        </div>

        {/* Preview row */}
        {soundOn && (
          <div style={{ background: BASE, borderRadius: 16, boxShadow: INSET_SM, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: H2 }}>
              <Sparkles size={12} style={{ color: ACC }} /> Preview:
            </span>
            <div className="flex gap-2">
              {(['tap', 'pop', 'success'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => playSound(s)}
                  style={{ background: BASE, borderRadius: 9999, boxShadow: RAISED_SM, border: 'none', padding: '5px 12px', fontSize: '0.68rem', fontWeight: 700, color: s === 'success' ? ACC : H2 }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Auto-category rules ── */}
      <SectionCard>
        <SectionHeader
          icon={<Tag size={17} strokeWidth={2} style={{ color: H2 }} />}
          title="Auto-category rules"
          sub="Keyword merchant matchers"
        />
        <p className="text-xs font-medium leading-relaxed mb-4" style={{ color: H2 }}>
          When importing, transactions are categorised by matching keywords. Add your own rules for frequent merchants.
        </p>

        {/* Add rule row */}
        <div className="flex gap-2 mb-4">
          <input
            style={{ ...inputSt, flex: 1 }}
            className="focus:outline-none placeholder:text-[#8991a0]"
            placeholder="e.g. Swiggy, DMart"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
          />
          <select
            style={inputSt}
            className="focus:outline-none"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            {CATEGORIES.map((c) => <option key={c} value={c} style={{ background: BASE }}>{c}</option>)}
          </select>
          <button
            onClick={add}
            data-sound="pop"
            className="neu-btn-accent"
            style={{ borderRadius: 9999, padding: '10px 18px', fontSize: '0.72rem', fontWeight: 700 }}
          >
            Add
          </button>
        </div>

        {custom.length > 0 ? (
          <ul className="space-y-2">
            {custom.map((r) => (
              <li key={r.keyword} style={{ background: BASE, borderRadius: 16, boxShadow: RAISED_SM, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: H1, fontWeight: 600 }}>
                  {r.keyword}
                  <span style={{ color: H3, margin: '0 8px' }}>→</span>
                  <span style={{ color: ACC, fontWeight: 700 }}>{r.category}</span>
                </span>
                <button
                  onClick={() => removeRule(r.keyword)}
                  data-sound="delete"
                  style={{ width: 28, height: 28, borderRadius: 9999, background: BASE, boxShadow: RAISED_SM, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: H3 }}
                >
                  <X size={13} strokeWidth={2.4} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ background: BASE, borderRadius: 16, boxShadow: INSET, padding: '1rem', textAlign: 'center' }}>
            <span className="text-xs font-medium" style={{ color: H3 }}>No custom rules defined yet.</span>
          </div>
        )}
      </SectionCard>

      {/* ── Monthly Budgets ── */}
      <SectionCard>
        <SectionHeader
          icon={<Target size={17} strokeWidth={2} style={{ color: H2 }} />}
          title="Monthly budgets"
          sub="Set per-category spending caps"
        />

        {/* Add / edit budget row */}
        <div className="flex gap-2 mb-3">
          <select
            value={budgetCat}
            onChange={(e) => setBudgetCat(e.target.value)}
            style={{ ...inputSt, flex: 1, minWidth: 0 }}
            className="focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} style={{ background: BASE }}>{cat}</option>
            ))}
          </select>
          <input
            type="number"
            inputMode="decimal"
            placeholder="₹ amount"
            value={budgetAmt}
            onChange={(e) => setBudgetAmt(e.target.value)}
            style={{ ...inputSt, width: 110 }}
            className="focus:outline-none"
          />
          <button
            data-sound="success"
            onClick={async () => {
              const amt = parseFloat(budgetAmt);
              if (!isFinite(amt) || amt <= 0) { toast('Enter a valid amount', 'error'); return; }
              await setBudget(budgetCat, amt);
              setBudgetAmt('');
              playSound('success');
              toast(`Budget set for ${budgetCat}`, 'success');
            }}
            style={{
              background: ACC, borderRadius: 9999, border: 'none',
              width: 42, height: 42, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0, cursor: 'pointer',
              boxShadow: '4px 4px 10px rgba(26,158,117,0.35), -2px -2px 6px rgba(255,255,255,0.5)'
            }}
            aria-label="Set budget"
          >
            <PlusCircle size={18} color="#fff" strokeWidth={2.3} />
          </button>
        </div>

        {/* Budget list */}
        {budgets.length > 0 ? (
          <div className="space-y-2">
            {budgets.map((b) => (
              <div key={b.id} style={{ background: BASE, borderRadius: 14, boxShadow: RAISED_SM, padding: '10px 14px' }}
                className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: H1 }}>{b.category}</p>
                  <p className="text-[11px] font-semibold" style={{ color: ACC }}>{fmtRupee(b.amount)} / month</p>
                </div>
                <button
                  data-sound="delete"
                  onClick={async () => { await deleteBudget(b.category); toast('Budget removed', 'success'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  aria-label="Remove budget"
                >
                  <X size={15} color="#dc2626" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: BASE, borderRadius: 14, boxShadow: INSET, padding: '1rem', textAlign: 'center' }}>
            <span className="text-xs font-medium" style={{ color: H3 }}>No budgets set yet. Add one above.</span>
          </div>
        )}
      </SectionCard>

      {/* ── Backup & Data ── */}
      <SectionCard>
        <SectionHeader
          icon={<Archive size={17} strokeWidth={2} style={{ color: H2 }} />}
          title="Backup & data"
          sub={counts ? `${counts.txns} transactions across ${counts.batches.length} imports` : 'Offline storage'}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Regular actions: raised buttons with icon square */}
          {[
            { label: 'Export CSV',     icon: <Download size={16} strokeWidth={2} style={{ color: H2 }} />, danger: false, action: () => { void exportCsv(); toast('CSV downloaded', 'success'); }, sound: 'pop' },
            { label: 'Backup JSON',    icon: <Archive  size={16} strokeWidth={2} style={{ color: H2 }} />, danger: false, action: () => { void exportBackup(); toast('Backup downloaded', 'success'); }, sound: 'pop' },
            { label: 'Restore backup', icon: <Upload   size={16} strokeWidth={2} style={{ color: H2 }} />, danger: false, action: () => restoreRef?.click(), sound: 'pop' },
            { label: 'Erase all data', icon: <Trash2   size={16} strokeWidth={2} style={{ color: '#dc2626' }} />, danger: true,
              action: () => { if (window.confirm('Delete ALL transactions, rules and imports on this phone? This cannot be undone.')) void wipeAll().then(() => toast('All data erased', 'success')); },
              sound: 'delete' }
          ].map(({ label, icon, danger, action, sound }) => (
            <button
              key={label}
              onClick={action}
              data-sound={sound}
              style={{
                background: BASE, borderRadius: 20,
                boxShadow: RAISED_SM, border: 'none',
                padding: '1rem', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '0.5rem',
                fontSize: '0.72rem', fontWeight: 700,
                color: danger ? '#dc2626' : H2
              }}
            >
              <span style={{ width: 36, height: 36, borderRadius: 12, background: BASE, boxShadow: RAISED_SM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>

        <input ref={setRestoreRef} type="file" accept=".json" className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            try { const r = await restoreBackup(f); toast(`Restored ${r.transactions} transactions`, 'success'); }
            catch (err) { console.error(err); toast('That is not a valid backup file', 'error'); }
          }} />
      </SectionCard>

      {/* ── Install & Privacy ── */}
      <SectionCard>
        <SectionHeader
          icon={<Smartphone size={17} strokeWidth={2} style={{ color: H2 }} />}
          title="Install & privacy"
          sub="100% on-device private PWA"
        />
        <div className="space-y-3.5">
          {[
            { icon: <Smartphone size={15} strokeWidth={2} style={{ color: H3 }} />, text: <>On iOS: open in <b>Safari</b>, tap <b>Share</b>, then <b>Add to Home Screen</b> for standalone offline usage.</> },
            { icon: <ShieldCheck size={15} strokeWidth={2} style={{ color: ACC }} />, text: <>Transactions reside strictly in client IndexedDB. No accounts, telemetry, or remote servers.</> },
            { icon: <HelpCircle  size={15} strokeWidth={2} style={{ color: H3 }} />, text: <>Get PDF: GPay app → profile → Transaction history → <b>⋮</b> → Get statement.</> }
          ].map(({ icon, text }, idx) => (
            <p key={idx} className="flex items-start gap-3 text-xs leading-relaxed font-medium" style={{ color: H2 }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <span>{text}</span>
            </p>
          ))}
        </div>
      </SectionCard>

      <p className="pb-4 text-center text-[11px] font-semibold" style={{ color: H3 }}>
        UPI Ledger · Light Neumorphism
      </p>
    </div>
  );
}