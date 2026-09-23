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
      <div className="neu-card mx-auto my-12 flex max-w-sm flex-col items-center gap-4 rounded-[32px] p-10 text-center">
        <div className="neu-card-disc flex h-16 w-16 items-center justify-center text-[#ff5238]">
          <Loader2 size={28} className="animate-spin" />
        </div>
        <p className="text-sm font-bold text-slate-800">Reading statement…</p>
        <p className="text-xs font-medium text-slate-400">{fileName}</p>
      </div>
    );
  }

  if (stage === 'done' && doneInfo) {
    return (
      <div className="neu-card mx-auto my-8 flex max-w-md flex-col items-center gap-5 rounded-[32px] p-8 text-center">
        <div className="neu-accent-circle h-16 w-16 text-white">
          <CheckCircle2 size={32} strokeWidth={2.4} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Imported {doneInfo.count} transactions
        </h2>
        <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-xs">
          {doneInfo.skipped > 0 ? `${doneInfo.skipped} rows skipped (duplicates or incomplete). ` : ''}Your balance and
          insights are updated.
        </p>
        <div className="mt-3 flex w-full gap-3">
          <button
            onClick={() => {
              setStage('idle');
              setDoneInfo(null);
            }}
            data-sound="pop"
            className="neu-btn flex-1 rounded-full py-3 text-xs font-bold text-slate-700 uppercase tracking-wider"
          >
            Import another
          </button>
          {onDone && (
            <button
              onClick={onDone}
              data-sound="pop"
              className="neu-accent-btn flex-1 rounded-full py-3 text-xs font-bold uppercase tracking-wider text-white"
            >
              Go to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'review') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStage('idle')}
            data-sound="pop"
            className="neu-btn-circle flex h-9 w-9 items-center justify-center text-slate-600"
            title="Back"
          >
            <ArrowLeft size={16} strokeWidth={2.4} />
          </button>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Review statement</span>
          <div className="w-9" />
        </div>

        {/* Summary Card */}
        <div className="neu-card rounded-[28px] p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-slate-800">{fileName}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
              {cands.length} found · <span className="text-[#ff5238] font-bold">{selectedCount} selected</span> ·{' '}
              <span>{cands.length - selectedCount} skipped</span>
            </p>
          </div>
          {/* Vivid accent button */}
          <button
            onClick={commit}
            data-sound="success"
            className="neu-accent-btn shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
          >
            Import {selectedCount > 0 ? selectedCount : ''}
          </button>
        </div>

        <p className="px-2 text-xs font-medium text-slate-400">
          Tap any row to edit fields. Suspected duplicates are unchecked by default.
        </p>

        <ReviewTable cands={cands} onPatch={patch} expanded={expanded} onToggleExpand={toggleExpand} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 pt-2">
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

      {/* Large Extruded Dropzone Card */}
      <button
        onClick={() => inputRef.current?.click()}
        data-sound="pop"
        className="neu-card flex w-full flex-col items-center gap-4 rounded-[32px] p-10 transition-transform active:scale-[0.99] text-center"
      >
        <div className="neu-btn-circle flex h-16 w-16 items-center justify-center text-slate-700">
          <Upload size={28} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-base font-extrabold text-slate-800 tracking-tight">Tap to choose statement</p>
          <p className="mt-1 text-xs font-medium text-slate-400">
            PDF (Google Pay) or CSV / TXT (Bank, PhonePe, Paytm)
          </p>
        </div>
      </button>

      {/* Guide Cards (28px radius, base color, no borders) */}
      <div className="w-full space-y-4">
        <div className="neu-card rounded-[28px] p-5">
          <div className="flex items-start gap-3">
            <div className="neu-btn-circle flex h-8 w-8 shrink-0 items-center justify-center text-slate-600">
              <FileText size={16} strokeWidth={2.2} />
            </div>
            <div className="text-xs leading-relaxed text-slate-500 font-medium">
              <p className="mb-1 font-bold text-slate-800">How to export Google Pay statement</p>
              <p>
                In the GPay app: profile icon → <b>See transaction history</b> → <b>⋮</b> → <b>Get statement</b> →
                choose period → <b>Get statement</b> → <b>Share</b>. Save the PDF, then upload it here.
              </p>
            </div>
          </div>
        </div>

        <div className="neu-card rounded-[28px] p-5">
          <div className="flex items-start gap-3">
            <div className="neu-btn-circle flex h-8 w-8 shrink-0 items-center justify-center text-slate-600">
              <FileText size={16} strokeWidth={2.2} />
            </div>
            <div className="text-xs leading-relaxed text-slate-500 font-medium">
              <p className="mb-1 font-bold text-slate-800">Bank statements (CSV / Excel)</p>
              <p>
                Download the <b>UPI / Transactions</b> statement from your bank's app or net-banking as CSV or TXT,
                then upload. The columns are automatically detected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}