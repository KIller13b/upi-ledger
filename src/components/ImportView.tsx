import { useRef, useState } from 'react';
import { db } from '../db';
import { parsePdfFile, type ParsedRow } from '../lib/gpayPdf';
import { parseCsvText } from '../lib/csv';
import { buildCandidates, type Candidate } from '../lib/import';
import { useRules } from '../hooks';
import { toast } from '../lib/toast';
import { ReviewTable } from './ReviewTable';
import { Upload, FileText, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

type Stage = 'idle' | 'loading' | 'review' | 'done';

const RAISED    = '7px 7px 16px rgba(163,177,198,0.55), -7px -7px 16px rgba(255,255,255,0.85)';
const RAISED_SM = '5px 5px 12px rgba(163,177,198,0.55), -5px -5px 12px rgba(255,255,255,0.85)';
const INSET     = 'inset 5px 5px 10px rgba(163,177,198,0.55), inset -5px -5px 10px rgba(255,255,255,0.85)';
const BASE = '#e6e9ef';
const H1   = '#2f3542';
const H2   = '#5b6272';
const H3   = '#8991a0';
const ACC  = '#1a9e75';

export function ImportView({ onDone }: { onDone?: () => void }) {
  const { rules } = useRules();
  const inputRef  = useRef<HTMLInputElement>(null);
  const [stage,    setStage]    = useState<Stage>('idle');
  const [cands,    setCands]    = useState<Candidate[]>([]);
  const [fileName, setFileName] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [doneInfo, setDoneInfo] = useState<{ count: number; skipped: number } | null>(null);

  const onFile = async (f: File) => {
    setFileName(f.name);
    setStage('loading');
    try {
      const buf = await f.arrayBuffer();
      let rows: ParsedRow[];
      if (/\.pdf$/i.test(f.name)) {
        rows = await parsePdfFile(buf);
      } else {
        const text = new TextDecoder('utf-8').decode(buf);
        rows = parseCsvText(text);
      }
      const cand = await buildCandidates(rows, rules, /\.pdf$/i.test(f.name) ? 'gpay' : 'csv');
      if (cand.length === 0) { toast('No transactions recognized in this file', 'error'); setStage('idle'); return; }
      setCands(cand); setExpanded(new Set()); setStage('review');
    } catch (err) {
      console.error(err);
      toast('Could not read that file. Try a GPay statement or a CSV.', 'error');
      setStage('idle');
    }
  };

  const patch       = (i: number, c: Candidate) => setCands((prev) => prev.map((p, idx) => (idx === i ? c : p)));
  const toggleExpand= (i: number) => setExpanded((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const commit = async () => {
    const sel = cands.filter((c) => c.sel);
    if (sel.length === 0) { toast('Select at least one row to import', 'error'); return; }
    try {
      await db.transactions.bulkAdd(sel.map((c) => c.tx));
      await db.importBatches.add({ filename: fileName, importedAt: Date.now(), count: sel.length, skipped: cands.length - sel.length });
      setDoneInfo({ count: sel.length, skipped: cands.length - sel.length });
      setStage('done');
    } catch (err) { console.error(err); toast('Import failed', 'error'); }
  };

  const selectedCount = cands.filter((c) => c.sel).length;

  /* ── Loading ── */
  if (stage === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div style={{ width: 70, height: 70, borderRadius: 24, background: BASE, boxShadow: RAISED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={30} className="animate-spin" style={{ color: ACC }} />
        </div>
        <p className="text-sm font-bold" style={{ color: H1 }}>Reading statement…</p>
        <p className="text-xs font-medium" style={{ color: H3 }}>{fileName}</p>
      </div>
    );
  }

  /* ── Done ── */
  if (stage === 'done' && doneInfo) {
    return (
      <div style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, padding: '2.5rem 2rem', marginTop: '1rem' }}
        className="flex flex-col items-center gap-5 text-center">
        <div style={{ width: 64, height: 64, borderRadius: 9999, background: ACC, boxShadow: `5px 5px 14px rgba(26,158,117,0.3), -4px -4px 10px rgba(255,255,255,0.85)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle2 size={30} color="#ffffff" strokeWidth={2.4} />
        </div>
        <h2 className="text-xl font-extrabold" style={{ color: H1 }}>Imported {doneInfo.count} transactions</h2>
        <p className="text-xs font-medium leading-relaxed max-w-xs" style={{ color: H2 }}>
          {doneInfo.skipped > 0 ? `${doneInfo.skipped} rows skipped (duplicates or incomplete). ` : ''}Your balance and insights are updated.
        </p>
        <div className="flex w-full gap-3 mt-2">
          <button
            onClick={() => { setStage('idle'); setDoneInfo(null); }}
            data-sound="pop"
            style={{ flex: 1, background: BASE, borderRadius: 9999, boxShadow: RAISED_SM, border: 'none', padding: '12px 0', fontSize: '0.75rem', fontWeight: 700, color: H2 }}
          >
            Import another
          </button>
          {onDone && (
            <button
              onClick={onDone}
              data-sound="pop"
              className="neu-btn-accent"
              style={{ flex: 1, borderRadius: 9999, padding: '12px 0', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Go to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Review ── */
  if (stage === 'review') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStage('idle')}
            data-sound="pop"
            style={{ width: 38, height: 38, borderRadius: 9999, background: BASE, boxShadow: RAISED_SM, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: H2 }}
          >
            <ArrowLeft size={16} strokeWidth={2.4} />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: H2 }}>Review statement</span>
          <div style={{ width: 38 }} />
        </div>

        <div style={{ background: BASE, borderRadius: 26, boxShadow: RAISED_SM, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold" style={{ color: H1 }}>{fileName}</p>
            <p className="mt-0.5 text-[11px] font-medium" style={{ color: H3 }}>
              {cands.length} found ·{' '}
              <span style={{ color: ACC, fontWeight: 700 }}>{selectedCount} selected</span> ·{' '}
              <span>{cands.length - selectedCount} skipped</span>
            </p>
          </div>
          <button
            onClick={commit}
            data-sound="success"
            className="neu-btn-accent"
            style={{ flexShrink: 0, borderRadius: 9999, padding: '10px 20px', fontSize: '0.72rem', fontWeight: 700 }}
          >
            Import {selectedCount > 0 ? selectedCount : ''}
          </button>
        </div>

        <p className="px-1 text-xs font-medium" style={{ color: H3 }}>
          Tap any row to edit fields. Suspected duplicates are unchecked by default.
        </p>
        <ReviewTable cands={cands} onPatch={patch} expanded={expanded} onToggleExpand={toggleExpand} />
      </div>
    );
  }

  /* ── Idle / upload ── */
  return (
    <div className="flex flex-col items-center gap-5 pt-2">
      <input ref={inputRef} type="file" accept=".pdf,.csv,.txt,.tsv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />

      {/* Large raised upload zone */}
      <button
        onClick={() => inputRef.current?.click()}
        data-sound="pop"
        style={{ background: BASE, borderRadius: 30, boxShadow: RAISED, border: 'none', padding: '2.5rem 1.5rem', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'transform 0.12s ease' }}
        onMouseDown={(e) => (e.currentTarget.style.boxShadow = INSET)}
        onMouseUp={(e)   => (e.currentTarget.style.boxShadow = RAISED)}
        onTouchStart={(e)=> (e.currentTarget.style.boxShadow = INSET)}
        onTouchEnd={(e)  => (e.currentTarget.style.boxShadow = RAISED)}
      >
        <span style={{ width: 68, height: 68, borderRadius: 20, background: BASE, boxShadow: RAISED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Upload size={28} strokeWidth={2} style={{ color: H2 }} />
        </span>
        <div className="text-center">
          <p className="text-base font-extrabold" style={{ color: H1 }}>Tap to choose statement</p>
          <p className="mt-1 text-xs font-medium" style={{ color: H3 }}>
            PDF (Google Pay) or CSV / TXT (Bank, PhonePe, Paytm)
          </p>
        </div>
      </button>

      {/* Guide cards */}
      <div className="w-full space-y-4">
        {[
          {
            icon: <FileText size={16} strokeWidth={2} style={{ color: H2 }} />,
            title: 'How to export Google Pay statement',
            body: <>In the GPay app: profile icon → <b>See transaction history</b> → <b>⋮</b> → <b>Get statement</b> → choose period → Share.</>
          },
          {
            icon: <FileText size={16} strokeWidth={2} style={{ color: H2 }} />,
            title: 'Bank statements (CSV / Excel)',
            body: <>Download the <b>UPI / Transactions</b> statement from your bank as CSV or TXT. Columns are auto-detected on import.</>
          }
        ].map((g, i) => (
          <div key={i} style={{ background: BASE, borderRadius: 26, boxShadow: RAISED_SM, padding: '1.2rem' }}>
            <div className="flex items-start gap-3">
              <span style={{ width: 36, height: 36, borderRadius: 14, background: BASE, boxShadow: RAISED_SM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {g.icon}
              </span>
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: H1 }}>{g.title}</p>
                <p className="text-xs font-medium leading-relaxed" style={{ color: H2 }}>{g.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}