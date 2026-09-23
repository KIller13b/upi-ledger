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

export function ImportView({ onDone }: { onDone?: () => void }) {
  const { rules } = useRules();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [cands, setCands] = useState<Candidate[]>([]);
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
      if (cand.length === 0) {
        toast('No transactions recognized in this file', 'error');
        setStage('idle');
        return;
      }
      setCands(cand);
      setExpanded(new Set());
      setStage('review');
    } catch (err) {
      console.error(err);
      toast('Could not read that file. Try a GPay statement or a CSV.', 'error');
      setStage('idle');
    }
  };

  const patch = (i: number, c: Candidate) => {
    setCands((prev) => prev.map((p, idx) => (idx === i ? c : p)));
  };

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const commit = async () => {
    const sel = cands.filter((c) => c.sel);
    if (sel.length === 0) {
      toast('Select at least one row to import', 'error');
      return;
    }
    try {
      await db.transactions.bulkAdd(sel.map((c) => c.tx));
      await db.importBatches.add({
        filename: fileName,
        importedAt: Date.now(),
        count: sel.length,
        skipped: cands.length - sel.length
      });
      setDoneInfo({ count: sel.length, skipped: cands.length - sel.length });
      setStage('done');
    } catch (err) {
      console.error(err);
      toast('Import failed', 'error');
    }
  };

  const selectedCount = cands.filter((c) => c.sel).length;

  if (stage === 'loading') {
    return (
      <div className="neu-card mx-auto my-12 flex max-w-sm flex-col items-center gap-3.5 rounded-3xl p-10 text-center">
        <div className="neu-sunken flex h-14 w-14 items-center justify-center rounded-2xl">
          <Loader2 size={28} className="animate-spin text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-slate-200">Reading and parsing transactions…</p>
        <p className="text-xs text-slate-400">{fileName}</p>
      </div>
    );
  }

  if (stage === 'done' && doneInfo) {
    return (
      <div className="neu-card mx-auto my-8 flex max-w-md flex-col items-center gap-4 rounded-3xl p-8 text-center">
        <div className="neu-sunken flex h-16 w-16 items-center justify-center rounded-2xl text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Imported {doneInfo.count} transactions</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {doneInfo.skipped > 0 ? `${doneInfo.skipped} rows skipped (duplicates or incomplete). ` : ''}Your balance and
          dashboard are updated.
        </p>
        <div className="mt-3 flex w-full gap-3">
          <button
            onClick={() => {
              setStage('idle');
              setDoneInfo(null);
            }}
            data-sound="pop"
            className="neu-btn flex-1 rounded-xl py-2.5 text-xs font-semibold text-slate-300"
          >
            Import another
          </button>
          {onDone && (
            <button
              onClick={onDone}
              data-sound="pop"
              className="neu-btn-primary flex-1 rounded-xl py-2.5 text-xs font-bold text-slate-950"
            >
              Go to dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'review') {
    return (
      <div>
        <button
          onClick={() => setStage('idle')}
          data-sound="pop"
          className="neu-btn mb-3.5 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-300"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="neu-card mb-3.5 flex items-center justify-between gap-3 rounded-2xl p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{fileName}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {cands.length} rows · <span className="text-emerald-400 font-semibold">{selectedCount} selected</span> ·{' '}
              <span className="text-amber-400">{cands.length - selectedCount} skipped</span>
            </p>
          </div>
          <button
            onClick={commit}
            data-sound="success"
            className="neu-btn-primary shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-950"
          >
            Import {selectedCount > 0 ? selectedCount : ''}
          </button>
        </div>
        <p className="mb-3 px-1 text-xs text-slate-400">
          Tap a row to fix the date, amount, type or category. Rows flagged as likely duplicates start unchecked.
        </p>
        <ReviewTable cands={cands} onPatch={patch} expanded={expanded} onToggleExpand={toggleExpand} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-1 pt-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.csv,.txt,.tsv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        data-sound="pop"
        className="neu-card flex w-full flex-col items-center gap-3.5 rounded-3xl p-8 transition-transform active:scale-[0.99] border-dashed border-2 border-emerald-500/20 hover:border-emerald-500/40"
      >
        <div className="neu-sunken flex h-16 w-16 items-center justify-center rounded-2xl text-emerald-400">
          <Upload size={28} />
        </div>
        <div className="text-center">
          <p className="font-bold text-slate-100">Tap to choose a statement</p>
          <p className="mt-1 text-xs text-slate-400">PDF (Google Pay) or CSV / TXT (bank, PhonePe, Paytm)</p>
        </div>
      </button>

      <div className="w-full space-y-3 pt-1">
        <div className="neu-card rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="neu-sunken flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-emerald-400">
              <FileText size={16} />
            </div>
            <div className="text-xs leading-relaxed text-slate-400">
              <p className="mb-1 font-semibold text-slate-200">How to get your Google Pay statement</p>
              <p>
                In the GPay app: profile icon → <b>See transaction history</b> → <b>⋮</b> → <b>Get statement</b> →
                choose period → <b>Get statement</b> → <b>Share</b>. Save the PDF, then upload it here.
              </p>
            </div>
          </div>
        </div>

        <div className="neu-card rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="neu-sunken flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sky-400">
              <FileText size={16} />
            </div>
            <div className="text-xs leading-relaxed text-slate-400">
              <p className="mb-1 font-semibold text-slate-200">Bank statements (CSV/Excel)</p>
              <p>
                Download the <b>UPI / Transactions</b> statement from your bank's app or net-banking as CSV/Excel/PDF,
                then upload. The app auto-detects the columns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}