<p align="center">
  <img src="public/icons/icon-192x192.png" width="96" height="96" alt="UPI Ledger icon" />
</p>

<h1 align="center">UPI Ledger</h1>

<p align="center">
  A private, offline-first tracker for your UPI transactions that lives entirely on your phone.
</p>

<p align="center">
  <a href="https://github.com/KIller13b/upi-ledger"><img src="https://img.shields.io/github/actions/workflow/status/KIller13b/upi-ledger/deploy.yml?branch=main&logo=github&label=deploy" alt="Deploy status" /></a>
  <a href="https://killer13b.github.io/upi-ledger/"><img src="https://img.shields.io/badge/live-killer13b.github.io%2Fupi--ledger-0b1220?logo=safari" alt="Live site" /></a>
  <img src="https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Vite-0ea5e9" alt="Stack" />
  <img src="https://img.shields.io/badge/version-1.0.0-22c55e" alt="Version" />
</p>

---

## What is this?

**UPI Ledger** is an installable web app that turns your **Google Pay statement PDFs** (or bank CSV exports) into a searchable, categorized view of your spending — with a running balance, monthly charts, and category breakdowns.

It is a **tracker, not a bank**: it cannot send money or read your live balance. Everything is derived from the statement you import.

## Why it exists

- **Private by design** — every transaction stays in your phone's browser storage (`IndexedDB`). No account, no server, no analytics, no cloud.
- **Works offline** — install it once, open it anywhere.
- **Runs on iPhone without a Mac** — a progressive web app, so no App Store and no Apple developer account required.
- **Built for real statements** — handles GPay's multi-column PDF layout, wrapped description lines, failed transactions, and running balances.

---

## Features

| | |
|---|---|
| **GPay PDF import** | Full statement → transactions parsed on-device with `pdf.js`, including UPI reference numbers, running balance, and failed-payment flagging. |
| **CSV import** | Delimiter and header auto-detection, so most bank exports just work. |
| **Review before commit** | Every import lands in a review queue — edit descriptions, fix types, drop duplicates, then commit. |
| **Auto-categorization** | 13 categories with ~100 default merchant rules. Custom rules take priority. |
| **Running balance** | The newest available balance wins; otherwise it's computed from credit minus debit. |
| **Dashboard** | Current balance, money in/out, a category donut, and a 6-month spending bar chart. |
| **Add & edit manually** | Transactions can be added, edited, or deleted by hand at any time. |
| **Search & filter** | By text, type (credit/debit), and month. |
| **Backup & restore** | Export everything to JSON or CSV; restore it on another phone. |
| **PWA** | Installable, offline-capable, standalone like a native app. |

---

## Install on your phone

### iPhone (Safari)

1. Open **<https://killer13b.github.io/upi-ledger/>** in Safari.
2. Tap the **Share** button (square with an up arrow).
3. Scroll and tap **Add to Home Screen**.
4. Tap **Add**.

The app now launches full-screen from your home screen and works offline.

### Android (Chrome)

Tap the install icon in the address bar (or Chrome menu → **Install app**).

---

## Importing a statement

### From Google Pay

1. Open the **GPay** app → profile → **See transaction history**.
2. Tap **⋯** → **Get statement** → choose a range.
3. **Share** or **Save to Files** the PDF.
4. Open UPI Ledger → **Import** → pick the PDF.

### From a bank (CSV)

Export transactions as CSV (most banks and UPI apps support this), then choose it in **Import**. UPI Ledger auto-detects the delimiter and column layout.

---

## How it works

```
PDF / CSV
   │
   ├─ pdf.js extracts text lines with positions ──► GPay parser
   └─ delimiter + header sniffing ────────────────► CSV parser
   │
   ▼
Parsed rows (date, description, UPI ref, amount, balance, failed?)
   │  dedupe by UPI ref / amount+date signature
   ▼
Categorize (custom rules win, then ~100 default merchant rules)
   │
   ▼
Review queue ──► commit
   ▼
IndexedDB (Dexie): transactions · categoryRules · importBatches
   │
   ▼
Dashboard · Transactions · Charts (custom SVG, no chart library)
```

Key details:

- **Parsing strategy** — pdf.js merges table cells unpredictably, so the GPay parser works from each line's extracted *text* (regex date/amount/UPI-reference extraction) instead of token positions. When a row has no obvious debit/credit wording, the type is resolved from the **running-balance delta** — e.g. `balance − previous balance = −200` means a credit of 200.
- **Failed transactions** — rows matching fail markers are tagged and never included in dashboard sums.
- **Balance rule** — the last transaction that carries a balance column wins; otherwise it is computed as credits minus debits from the imported set.

---

## Project structure

```
upi-ledger/
├─ public/                   # PWA icons, favicon
├─ src/
│  ├─ components/            # Dashboard, Transactions, Import, Review, Settings, charts
│  ├─ lib/
│  │  ├─ gpayPdf.ts          # GPay PDF → ParsedRow  (pdf.js text extraction + line parser)
│  │  ├─ csv.ts              # CSV parsing with auto-detection
│  │  ├─ import.ts           # dedupe, categorize, build candidates
│  │  ├─ categories.ts       # categories + default merchant rules
│  │  ├─ export.ts           # CSV / JSON backup-restore
│  │  ├─ parseShared.ts      # shared date/amount helpers
│  │  ├─ parser.test.ts      # unit tests (6)
│  │  └─ pdf.integration.test.ts  # end-to-end PDF parse test
│  ├─ db.ts                  # Dexie schema (IndexedDB)
│  └─ hooks.ts               # Dexie live queries
├─ vite.config.ts            # base path, PWA manifest, workbox
└─ .github/workflows/deploy.yml  # build + deploy to GitHub Pages
```

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript, Tailwind CSS v4 |
| Build | Vite, `vite-plugin-pwa` (generateSW) |
| Storage | Dexie 4 (IndexedDB) with live queries |
| PDF parsing | `pdfjs-dist` (lazy-loaded chunk) |
| Charts | Hand-rolled SVG (donut + bars, no chart library) |
| Tests | Vitest |
| Hosting | GitHub Pages (free HTTPS) |

---

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit + integration tests
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

> **Base path note** — the app is deployed at `https://killer13b.github.io/upi-ledger/`, so `vite.config.ts` sets `base: '/upi-ledger/'`. If you self-host elsewhere, change this and the PWA `navigateFallback`.

### Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: it installs, builds, uploads `dist/` as a Pages artifact, and deploys. GitHub Pages must be configured with **Source: GitHub Actions** (repo Settings → Pages).

---

## Known limitations

- It can't send UPI payments or show your real-time bank balance — it's a statement tracker, not a wallet.
- Parsing is tuned for GPay statement PDFs; bank PDF formats may need small tweaks in `src/lib/gpayPdf.ts`.
- Installed apps update automatically; data lives only in the browser profile it was created in.

## Roadmap

- Recurring / scheduled transaction detection
- More bank-specific PDF parsers
- Export charts as shareable images

## Privacy

No network requests are made for your data. Importing is also fully local — pdf.js runs in your browser, so your statement never leaves your device.