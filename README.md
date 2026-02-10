# Bank Statement Reader

A SaaS MVP that parses any bank's PDF statements (chequing, savings, credit cards) into structured transactions, categorizes them, and exports to CSV/Excel. Supports both mock mode (no API key needed) and real Claude API parsing.

## Architecture

```
Browser (Next.js :3000)                    FastAPI Backend (:8000)
┌──────────────────┐                    ┌────────────────────────┐
│  Drag-and-Drop   │──POST /upload──>   │  Upload Router         │
│  Upload Zone     │  (multipart)       │    ↓                   │
│                  │                    │  PDF Service           │
│                  │                    │  (pdfplumber extract)  │
│                  │                    │    ↓                   │
│  Transaction     │<──JSON response──  │  LLM Service           │
│  Table + Sort    │                    │  (Claude or Mock)      │
│                  │                    │    ↓                   │
│  Export Buttons  │──POST /export──>   │  Categorization        │
│  (CSV / Excel)   │<──file download──  │  Export Service         │
└──────────────────┘                    └────────────────────────┘
```

Next.js `rewrites` proxies `/api/*` to `localhost:8000` during dev — no CORS issues.

## Features

- **Multi-file upload** — drag-and-drop multiple PDFs at once
- **Concurrent processing** — all files parsed in parallel via `asyncio.gather` + async Claude client for fast batch uploads
- **Chequing & credit card support** — extracts both transaction date and posting date (credit card statements often have both)
- **Smart column display** — "Posting Date" column only appears when the data contains posting dates
- **Sortable table** — click any column header to sort ascending/descending
- **Custom categories** — define your own categories (name + description) before uploading; defaults to 16 built-in categories; persists in localStorage
- **Smart categorization** — Claude uses your custom categories first, falls back to "Other" for anything that doesn't fit
- **CSV & Excel export** — styled Excel with color-coded debits/credits
- **Mock mode** — works without an API key for development and testing
- **5-minute timeout** — handles large batch uploads (12+ statements) without timing out

## API Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/` | — | `{"status": "ok"}` |
| POST | `/api/v1/upload` | multipart `files: List[UploadFile]`, optional `categories: str` (JSON) | `UploadResponse` JSON |
| POST | `/api/v1/export` | `ExportRequest` JSON | Binary file download (CSV or XLSX) |

### Transaction Model

```json
{
  "date": "2025-12-01",
  "posting_date": "2025-12-03",
  "description": "TIM HORTONS #8901",
  "amount": 5.75,
  "type": "debit",
  "balance": 1234.56,
  "category": "Dining"
}
```

- `date` — transaction date (when the purchase/payment occurred)
- `posting_date` — posting date (when it appeared on the account), or `null` if not available. Credit card statements typically show both dates; chequing statements usually only have one.

## Tech Stack

**Backend:**
- FastAPI + Uvicorn
- pdfplumber (PDF text extraction)
- Anthropic Claude Haiku 4.5 API (async client for concurrent processing)
- openpyxl (Excel export)
- Pydantic v2 (validation & settings)

**Frontend:**
- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4
- react-dropzone (file upload)
- @tanstack/react-table (sortable tables)
- lucide-react (icons)

## Project Structure

```
bank-statements-reader/
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── .env                    # Your local config (git-ignored)
│   └── app/
│       ├── __init__.py
│       ├── config.py           # Pydantic BaseSettings, env vars
│       ├── main.py             # FastAPI app, CORS, router includes
│       ├── models/
│       │   ├── __init__.py
│       │   └── transaction.py  # Transaction, StatementResult, UploadResponse, ExportRequest
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── upload.py       # POST /upload — concurrent file processing
│       │   └── export.py       # POST /export — CSV/Excel generation
│       └── services/
│           ├── __init__.py
│           ├── pdf_service.py           # pdfplumber text extraction
│           ├── llm_service.py           # Routes to mock or async Claude API
│           ├── mock_service.py          # Generates realistic Canadian mock data
│           ├── categorization_service.py # Keyword-based categorization
│           └── export_service.py        # CSV and styled Excel generation
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js          # Rewrites proxy + 5-min proxy timeout
│   ├── postcss.config.mjs
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx      # Root layout with header
│       │   └── page.tsx        # Main page: upload → loading → results state machine
│       ├── lib/
│       │   ├── types.ts        # TypeScript interfaces, CategoryConfig, DEFAULT_CATEGORIES
│       │   └── api-client.ts   # uploadStatements() + exportTransactions() with 5-min timeout
│       └── components/
│           ├── CategoryManager.tsx   # Custom category chips with add/remove/reset
│           ├── FileUploader.tsx      # Drag-and-drop zone (react-dropzone)
│           ├── TransactionTable.tsx  # Sortable table with conditional Posting Date column
│           ├── ExportButtons.tsx     # CSV + Excel download buttons
│           └── LoadingSpinner.tsx    # Animated loading state
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- pnpm

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (separate terminal)

```bash
cd frontend
pnpm install
pnpm dev
```

### 3. Open the App

Open http://localhost:3000, drag-drop any PDF, view the sortable transaction table, and export to CSV or Excel.

## Environment Variables

Configured in `backend/.env` (copy from `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_MODE` | `true` | Use mock data instead of Claude API |
| `ANTHROPIC_API_KEY` | — | Required when MOCK_MODE=false |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins (comma-separated for multiple) |
| `UPLOAD_DIR` | `uploads` | Directory for temporary file uploads |
| `MAX_FILE_SIZE_MB` | `10` | Maximum upload file size in MB |

### Switching from Mock to Real Mode

Mock mode is enabled by default — no API key needed, any PDF returns sample data.

To use real Claude API parsing:

1. Sign up at [console.anthropic.com](https://console.anthropic.com/) (separate from claude.ai subscriptions like Claude Max — the API requires its own account)
2. Add billing — new accounts get **$5 free credits**
3. Generate an API key under Settings > API Keys
4. Edit `backend/.env`:
   ```
   MOCK_MODE=false
   ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Restart the backend — uploaded PDFs will now be parsed by Claude Haiku 4.5

**Note:** The Claude Max subscription (claude.ai) does NOT include API access. The API is billed separately through console.anthropic.com.

## How It Works

### Upload Flow
1. User configures categories in the Category Manager (or keeps the 16 defaults)
2. User drops PDF(s) into the drag-and-drop zone
3. Frontend sends multipart POST to `/api/v1/upload` with files and categories JSON (5-minute timeout for large batches)
4. Next.js rewrites proxy the request to the FastAPI backend
5. Backend saves each PDF temporarily, extracts text with pdfplumber
6. **All files are processed concurrently** via `asyncio.gather` with the async Claude client — 12 files take roughly the same time as 1
7. Claude extracts structured transactions using the user's custom categories (or defaults), including both transaction date and posting date (for credit cards)
8. Anything that doesn't fit the user's categories gets labeled "Other"
9. JSON response is returned; temp files are deleted

### Export Flow
1. User clicks "Export CSV" or "Export Excel"
2. Frontend sends the transaction data as JSON to `/api/v1/export`
3. Backend generates the file (csv module or openpyxl)
4. File is streamed back as a download
5. Export includes columns: Date, Posting Date, Description, Amount, Type, Balance, Category

### Credit Card vs Chequing Statements
- **Chequing/savings statements** typically have one date per transaction — stored as `date`, `posting_date` is `null`
- **Credit card statements** often show both a transaction date (when you swiped) and a posting date (when it hit your account) — both are extracted
- The frontend table **auto-detects** whether posting dates exist and only shows the column when relevant

### Custom Categories
Users can customize the category list before uploading statements:

1. **Category Manager** appears above the file uploader on the idle screen
2. Shows all categories as removable chips/tags with an (x) button
3. **Add Category** — enter a name and optional description (e.g. "Client Payments" — "Payments received from clients")
4. **Remove** — click the x on any chip to remove it
5. **Reset to Defaults** — restores all 16 built-in categories
6. Categories persist in **localStorage** across page refreshes
7. On upload, categories are sent as JSON to the backend and injected into the Claude prompt

**Default categories (16):** Payroll & Income, Rent & Mortgage, Utilities, Groceries, Dining, Transportation, Insurance, Subscriptions, E-Transfer, Bank Fees, Shopping, Health & Wellness, Entertainment, Business Expense, Transfers, Other

### Keyword Categorization (Mock Mode Fallback)
In mock mode, transactions also go through keyword-based categorization:

| Category | Example Keywords |
|----------|-----------------|
| Payroll & Income | payroll, salary, direct deposit |
| Rent & Mortgage | rent, mortgage, landlord |
| Utilities | hydro, enbridge, rogers, bell |
| Groceries | loblaws, metro, costco, walmart |
| Dining | tim hortons, starbucks, uber eats |
| Transportation | presto, petro, shell, uber trip |
| Insurance | sunlife, manulife, intact |
| Subscriptions | netflix, spotify, adobe |
| E-Transfer | interac e-transfer |
| Bank Fees | monthly fee, overdraft, nsf |
| Other | (no keyword match) |

## API Cost Estimates

Using Claude Haiku 4.5 ($0.80/M input tokens, $4.00/M output tokens, USD):

**Per statement** (tested with a real 2-page RBC chequing statement):
- ~548 input tokens + ~500 output tokens = **~$0.0024 USD per statement**

| Volume | Monthly Cost (USD) | Monthly Cost (CAD) | Suggested Price |
|--------|-------------------|--------------------|-----------------|
| 100 statements | $0.24 | $0.35 | $15/mo |
| 1,000 statements | $2.40 | $3.46 | $49/mo |
| 10,000 statements | $24.00 | $34.56 | $149/mo |
| 50,000 statements | $122.00 | $175.68 | $499/mo |

### Cost Optimization Strategies
- **Batch API (50% off):** Anthropic's batch endpoint for non-real-time processing
- **Prompt caching:** The parsing prompt is identical every call — caching saves ~90% on that portion
- **Regex for known formats:** Standard bank formats (RBC, TD, etc.) can be parsed without LLM calls, reserving Claude for tricky or unknown formats

## Mock Data Strategy

- `MOCK_MODE=true` by default — no API key needed
- Mock service generates ~20-40 realistic transactions per statement
- Canadian merchant names (Tim Hortons, Loblaws, Shoppers, etc.)
- Realistic amounts, proper date sequencing, correct running balances
- Simulated posting dates on ~50% of mock transactions
- Pre-assigned categories: Payroll & Income, Rent & Mortgage, Utilities, Groceries, Dining, Transportation, Insurance, Subscriptions, E-Transfer, Bank Fees, Other
- 0.5-1.5s artificial delay to test loading states

## Troubleshooting

### Port already in use

If you see `[Errno 48] Address already in use` when starting the backend or frontend:

```bash
# Find and kill the process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Find and kill the process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

Then restart the server. This commonly happens if a previous server instance wasn't shut down cleanly.

### Frontend starts on wrong port

If Next.js says `Port 3000 is in use, using port 3001 instead`, free port 3000 first (see above). The backend CORS and the Next.js proxy rewrite are configured to work on `localhost:3000` by default. If you want to use a different port:

1. Update `ALLOWED_ORIGINS` in `backend/.env`
2. Start the frontend with `pnpm dev --port <port>`

### Backend won't start

```bash
# Make sure you're in the backend directory with venv activated
cd backend
source venv/bin/activate

# Verify the app imports correctly
python -c "from app.main import app; print('OK')"

# Check that .env exists
ls -la .env
```

### Upload fails with multiple files

This was fixed by switching to concurrent processing. If you still see timeouts:
- The backend uses `asyncio.gather` to process all files in parallel
- The frontend fetch has a 5-minute timeout (`AbortController`)
- The Next.js proxy timeout is set to 5 minutes (`proxyTimeout: 300000`)
- Check that the backend is using the async Claude client (`AsyncAnthropic`)

### PDF upload returns "Could not extract text"

The PDF may be scanned/image-based. In mock mode (`MOCK_MODE=true`), any PDF will return sample data regardless. For real parsing of scanned PDFs, you'll need OCR support (future feature).

## Development Phases

### Phase 1 — MVP (Current)
- Backend: PDF parsing + Claude API integration + CSV/Excel export
- Frontend: Upload UI + sortable transaction table + export download
- Custom categories: user-defined categories with localStorage persistence
- Concurrent file processing for batch uploads
- Credit card support (transaction date + posting date)
- Mock mode for API-free development

### Phase 2 — Auth & Billing
- User authentication (Clerk/NextAuth)
- Stripe subscription integration
- PostgreSQL for persistence

### Phase 3 — Accountant Features
- Multi-client management
- Custom categorization rules
- Accounting software export formats (QuickBooks, Xero, Sage)

### Phase 4 — Scale & Compliance
- SOC 2 compliance
- Self-hosted option
- Bank template optimization (regex parsers for known bank formats)
- OCR for scanned/image-based PDFs (Claude Vision)

## Privacy & Compliance

- Bank statements contain highly sensitive financial data
- Uploaded files are saved temporarily and deleted immediately after processing
- Anthropic API data is NOT used for training
- No data is persisted between requests (MVP — no database yet)
- API keys stored in `.env` which is git-ignored
- Clear data retention policies required for production

## Verification

1. Start backend: `cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000`
2. Start frontend: `cd frontend && pnpm dev`
3. Open http://localhost:3000
4. See the Category Manager with 16 default categories above the uploader
5. Remove a category → it disappears, localStorage updates
6. Add a custom category (e.g. "Client Payments" with description "Payments received from clients")
7. Refresh the page → custom categories persist
8. Drag-drop a PDF → transactions use the custom category list
9. Click "Reset to Defaults" → all 16 defaults restored
10. Click column headers to sort
11. Upload a credit card statement → see "Posting Date" column appear
12. Click "Export CSV" → file downloads with all columns including Posting Date
13. Click "Export Excel" → styled Excel file downloads
14. Upload multiple PDFs at once → all processed concurrently
15. Verify health check: `curl http://localhost:8000/` → `{"status": "ok"}`
