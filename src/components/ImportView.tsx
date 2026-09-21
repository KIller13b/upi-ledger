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
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Loader2 size={28} className="animate-spin text-emerald-400" />
        <p className="text-sm text-slate-300">Reading and parsing transactions…</p>
        <p className="text-xs text-slate-500">{fileName}</p>
      </div>
    );
  }

  if (stage === 'done' && doneInfo) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">Imported {doneInfo.count} transactions</h2>
        <p className="text-sm text-slate-400">
          {doneInfo.skipped > 0 ? `${doneInfo.skipped} rows skipped (duplicates or incomplete). ` : ''}Your balance and
          dashboard are updated.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              setStage('idle');
              setDoneInfo(null);
            }}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200"
          >
            Import another
          </button>
          {onDone && (
            <button
              onClick={onDone}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950"
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
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{fileName}</p>
            <p className="text-[11px] text-slate-500">
              {cands.length} rows found · <span className="text-emerald-400">{selectedCount} selected</span> ·{' '}
              <span className="text-amber-400">{cands.length - selectedCount} skipped</span>
            </p>
          </div>
          <button
            onClick={commit}
            className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950"
          >
            Import {selectedCount > 0 ? selectedCount : ''}
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Tap a row to fix the date, amount, type or category. Rows flagged as likely duplicates start unchecked.
        </p>
        <ReviewTable cands={cands} onPatch={patch} expanded={expanded} onToggleExpand={toggleExpand} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 pt-4">
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
        className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 transition-colors active:border-emerald-500"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <Upload size={26} />
        </div>
        <div>
          <p className="text-center font-semibold text-slate-100">Tap to choose a statement</p>
          <p className="mt-1 text-center text-xs text-slate-500">PDF (Google Pay) or CSV / TXT (bank, PhonePe, Paytm)</p>
        </div>
      </button>

      <div className="w-full space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            <div className="text-xs leading-relaxed text-slate-400">
              <p className="mb-1 font-semibold text-slate-200">How to get your Google Pay statement</p>
              <p>
                In the GPay app: profile icon → <b>See transaction history</b> → <b>⋮</b> → <b>Get statement</b> →
                choose period → <b>Get statement</b> → <b>Share</b>. Save the PDF, then upload it here.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 shrink-0 text-sky-400" />
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