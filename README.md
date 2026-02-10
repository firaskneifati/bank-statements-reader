# Bank Statement Reader

A SaaS MVP that parses any bank's PDF statements (chequing, savings, credit cards) into structured transactions, categorizes them, and exports to CSV/Excel. Supports both mock mode (no API key needed) and real Claude API parsing.

## Architecture

```
Browser (Next.js :4000)                    FastAPI Backend (:8000)
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
- SQLModel + SQLAlchemy (async) + asyncpg (PostgreSQL ORM)
- Alembic (database migrations)
- PostgreSQL 16 (via Docker Compose)

**Frontend:**
- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4
- react-dropzone (file upload)
- @tanstack/react-table (sortable tables)
- lucide-react (icons)

## Project Structure

```
bank-statements-reader/
├── docker-compose.yml            # PostgreSQL + backend + frontend
├── backend/
│   ├── Dockerfile                # Python 3.11-slim, pip install, uvicorn --reload
│   ├── requirements.txt
│   ├── alembic.ini               # Alembic config (migrations)
│   ├── .env.example
│   ├── .env                      # Your local config (git-ignored)
│   └── app/
│       ├── __init__.py
│       ├── config.py             # Pydantic BaseSettings, env vars
│       ├── main.py               # FastAPI app, CORS, lifespan, router includes
│       ├── db/
│       │   ├── __init__.py
│       │   ├── engine.py         # Async SQLAlchemy engine, session factory, get_session
│       │   ├── models.py         # 6 SQLModel tables (Organization, User, Client, Upload, TransactionRecord, CategoryTemplate)
│       │   └── migrations/
│       │       ├── env.py        # Async Alembic env
│       │       ├── script.py.mako
│       │       └── versions/     # Auto-generated migration files
│       ├── models/
│       │   ├── __init__.py
│       │   └── transaction.py    # Transaction, StatementResult, UploadResponse, ExportRequest
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── upload.py         # POST /upload — concurrent file processing
│       │   └── export.py         # POST /export — CSV/Excel generation
│       └── services/
│           ├── __init__.py
│           ├── pdf_service.py           # pdfplumber text extraction
│           ├── llm_service.py           # Routes to mock or async Claude API
│           ├── mock_service.py          # Generates realistic Canadian mock data
│           ├── categorization_service.py # Keyword-based categorization
│           └── export_service.py        # CSV and styled Excel generation
├── frontend/
│   ├── Dockerfile                # Node 20-alpine, pnpm install, pnpm dev
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js            # Rewrites proxy + 5-min proxy timeout
│   ├── postcss.config.mjs
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx        # Root layout with header
│       │   └── page.tsx          # Main page: upload → loading → results state machine
│       ├── lib/
│       │   ├── types.ts          # TypeScript interfaces, CategoryConfig, DEFAULT_CATEGORIES
│       │   └── api-client.ts     # uploadStatements() + exportTransactions() with 5-min timeout
│       └── components/
│           ├── CategoryManager.tsx   # Custom category chips with add/remove/reset
│           ├── FileUploader.tsx      # Drag-and-drop zone (react-dropzone)
│           ├── TransactionTable.tsx  # Sortable table with conditional Posting Date column
│           ├── ExportButtons.tsx     # CSV + Excel download buttons
│           └── LoadingSpinner.tsx    # Animated loading state
├── .gitignore
└── README.md
```

## Git Usage

This repo uses the `firaskneifati` GitHub account. Before any push, switch SSH identity in **zsh**:

```zsh
# Switch to the correct GitHub account (required before pushing)
git-acc firaskneifati

# Stage changes
git add <files>

# Commit (use conventional commit format)
git commit -m "feat: add new feature"

# Push
git push
```

### Conventional Commit Format

```
feat:     new feature
fix:      bug fix
docs:     documentation only
style:    formatting, no code change
refactor: code restructuring, no behavior change
test:     adding or updating tests
chore:    maintenance, dependencies, config
```

### Important

- Always run `git-acc firaskneifati` in **zsh** before `git push` — this loads the correct SSH key (`~/.ssh/id_rsa_firaskneifati`)
- The command must run in the same shell session as the push
- If you get a "permission denied" error, re-run `git-acc firaskneifati`

## Quick Start

### Option A: Docker Compose (Recommended)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

This starts PostgreSQL, the backend (port 8000), and the frontend (port 4000). Run migrations:

```bash
docker compose exec backend alembic upgrade head
```

Open http://localhost:4000.

### Option B: Manual Setup

**Prerequisites:** Python 3.11+, Node.js 18+, pnpm, PostgreSQL 16

#### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env to set DATABASE_URL if using a local PostgreSQL instance
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup (separate terminal)

```bash
cd frontend
pnpm install
pnpm dev --port 4000
```

#### 3. Open the App

Open http://localhost:4000, drag-drop any PDF, view the sortable transaction table, and export to CSV or Excel.

## Environment Variables

Configured in `backend/.env` (copy from `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_MODE` | `true` | Use mock data instead of Claude API |
| `ANTHROPIC_API_KEY` | — | Required when MOCK_MODE=false |
| `ALLOWED_ORIGINS` | `http://localhost:4000` | CORS allowed origins (comma-separated for multiple) |
| `DATABASE_URL` | — | PostgreSQL connection string (e.g. `postgresql+asyncpg://bankuser:bankpass@localhost:5432/bankstatements`). App works without it. |
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

# Find and kill the process on port 4000 (frontend)
lsof -ti:4000 | xargs kill -9
```

Then restart the server. This commonly happens if a previous server instance wasn't shut down cleanly.

### Frontend starts on wrong port

If Next.js says `Port 3000 is in use, using port 3001 instead`, free port 3000 first (see above). The backend CORS and the Next.js proxy rewrite are configured to work on `localhost:4000` by default. If you want to use a different port:

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

## SaaS Transformation Plan

Transforming the current stateless single-page MVP into a production multi-tenant SaaS. Accountants manage clients and their bank statements; clients can log in to upload their own. Full database persistence, Clerk auth, Stripe billing (sandbox), accounting export formats, and Docker/production deployment.

### Key Architecture Decisions

1. **Clerk JWT verified directly** via JWKS (PyJWT) — no Clerk SDK on hot path, zero vendor lock-in per request
2. **`org_id` on every tenant table** — shared DB/schema multi-tenancy, all queries filter by org_id
3. **Old stateless endpoints kept** — `/api/v1/upload` remains for anonymous/trial; new `/api/v1/uploads` is DB-backed
4. **Client portal via Clerk org roles** — clients join org as role=`client`, frontend middleware routes by role
5. **Categories move to DB** — per-org CategoryTemplate table replaces localStorage

### Dependency Graph

```
1 Docker Compose
└─ 2 Database Schema (+ audit log table)
   └─ 3 Clerk Backend (+ MFA, GLBA privacy notice endpoint)
      └─ 4 Clerk Frontend (+ consent capture, cookie banner, GPC detection)
         └─ 5 DB-Backed Uploads (+ audit logging, data masking, PII minimization for API)
            ├─ 6 Client Management (+ data export/deletion endpoints)
            │  └─ 8 Client Portal (+ automated decision-making disclosure)
            ├─ 7 Server-Side Categories (parallel with 6)
            ├─ 9 Accounting Exports (parallel with 6-8)
            ├─ 10 Stripe Billing (after 6)
            └─ 11 Settings Page (+ data retention config, privacy controls)
               └─ 12 Production Deployment (+ TLS, encryption at rest, pen test, legal docs)

Cross-cutting: Privacy & Compliance (see full section below) — woven through all chunks
```

---

### Chunk 1: Docker Compose for Local Dev

**Goal:** Reproducible local env with PostgreSQL.

**Create:**
- `/docker-compose.yml` — 3 services: `postgres` (16-alpine, port 5432), `backend` (port 8000, hot-reload), `frontend` (port 4000)
- `/backend/Dockerfile` — Python 3.11-slim, pip install, uvicorn --reload
- `/frontend/Dockerfile` — Node 20-alpine, pnpm install, pnpm dev

**Modify:**
- `backend/.env.example` — add `DATABASE_URL=postgresql+asyncpg://bankuser:bankpass@localhost:5432/bankstatements`
- `frontend/next.config.js` — use env var `BACKEND_URL` (default `http://localhost:8000`) for rewrite destination
- `.gitignore` — add `docker-compose.override.yml`, `pgdata/`

**Verify:** `docker compose up` starts all services. Existing non-Docker workflow still works.

---

### Chunk 2: Database Schema + SQLModel + Alembic

**Goal:** Define multi-tenant schema. Keep existing endpoints unchanged.

**New deps:** `sqlmodel==0.0.22`, `asyncpg==0.30.0`, `alembic==1.14.1`, `greenlet==3.1.1`, `sqlalchemy[asyncio]==2.0.36`

**Create:**
- `backend/app/db/__init__.py`
- `backend/app/db/engine.py` — async engine, session factory, `get_session` FastAPI dependency
- `backend/app/db/models.py` — 6 tables, all tenant-scoped tables have `org_id` + index

**Database Tables:**

| Table | Key Fields |
|-------|-----------|
| **Organization** | id (uuid), name, clerk_org_id, stripe_customer_id, stripe_subscription_id, plan ("free"/"starter"/"pro"/"enterprise") |
| **User** | id (uuid), clerk_user_id, email, full_name, role ("owner"/"admin"/"member"), org_id FK |
| **Client** | id (uuid), org_id FK, name, email, clerk_user_id (nullable), phone, notes |
| **Upload** | id (uuid), org_id FK, client_id FK (nullable), uploaded_by_user_id FK, filename, status ("processing"/"completed"/"failed"), transaction_count, total_debits, total_credits |
| **TransactionRecord** | id (uuid), org_id FK, upload_id FK, client_id FK (nullable), date, posting_date, description, amount, type, balance, category |
| **CategoryTemplate** | id (uuid), org_id FK, name, description, sort_order |

- `backend/alembic.ini` + `backend/app/db/migrations/env.py` + initial migration

**Verify:** `alembic upgrade head` creates all tables. Existing endpoints still work.

---

### Chunk 3: Clerk Auth — Backend

**Goal:** JWT verification middleware. Protect new routes, keep old routes unprotected.

**New deps:** `PyJWT[crypto]==2.10.1`, `httpx==0.28.1`, `svix==1.44.0`

**Create:**
- `backend/app/auth/__init__.py`
- `backend/app/auth/clerk.py` — `get_current_user(credentials)` verifies Clerk JWT via JWKS (cached in-memory)
- `backend/app/auth/dependencies.py` — `get_authenticated_user(claims, session)` resolves DB User row; `get_current_org(user, session)` resolves Organization
- `backend/app/routers/webhooks.py` — `POST /api/v1/webhooks/clerk` handles `user.created`, `organization.created`, `organizationMembership.created` events

**Verify:** `GET /api/v1/me` returns user info with valid Clerk JWT, 401 without. Old endpoints still work unprotected.

---

### Chunk 4: Clerk Auth — Frontend

**Goal:** Clerk in Next.js. Sign-in/up pages. Authenticated layout with sidebar nav.

**New dep:** `@clerk/nextjs@^6`

**Create:**
- `frontend/src/middleware.ts` — `clerkMiddleware()`, public routes: `/sign-in`, `/sign-up`, `/api`
- `frontend/src/app/sign-in/[[...sign-in]]/page.tsx` — Clerk `<SignIn />`
- `frontend/src/app/sign-up/[[...sign-up]]/page.tsx` — Clerk `<SignUp />` with org creation
- `frontend/src/app/(authenticated)/layout.tsx` — sidebar (Dashboard, Clients, Uploads, Billing, Settings) + header with `<UserButton />` + `<OrganizationSwitcher />`
- `frontend/src/app/(authenticated)/dashboard/page.tsx` — moved parser tool from page.tsx
- `frontend/src/components/Sidebar.tsx` — nav links with active state
- `frontend/src/components/Header.tsx` — breadcrumbs + Clerk components

**Modify:**
- `frontend/src/app/layout.tsx` — wrap in `<ClerkProvider>`, remove old header
- `frontend/src/app/page.tsx` — redirect: signed in → `/dashboard`, not → `/sign-in`
- `frontend/src/lib/api-client.ts` — add `Authorization: Bearer <token>` header via Clerk session

**Verify:** `/` redirects to sign-in. After signup, land on `/dashboard` with sidebar. Parser works. Sign out redirects back.

---

### Chunk 5: Database-Backed Uploads

**Goal:** Persist uploads + transactions. Upload history page.

**Create (backend):**
- `backend/app/routers/uploads.py` (new, authenticated):
  - `POST /api/v1/uploads` — creates Upload + TransactionRecord rows
  - `GET /api/v1/uploads` — list history (filterable by client_id)
  - `GET /api/v1/uploads/{id}` — detail with transactions
  - `DELETE /api/v1/uploads/{id}` — cascade delete
- `backend/app/routers/transactions.py`:
  - `GET /api/v1/transactions` — search/filter (client, category, date range, type, pagination)
  - `PATCH /api/v1/transactions/{id}` — re-categorize

**Create (frontend):**
- `frontend/src/app/(authenticated)/uploads/page.tsx` — upload history list
- `frontend/src/app/(authenticated)/uploads/[id]/page.tsx` — upload detail with TransactionTable + export

**Verify:** Upload PDF while authenticated → rows in DB. `/uploads` shows history. Click into detail. Export from detail. Delete cascades.

---

### Chunk 6: Client Management

**Goal:** CRUD for clients. Associate uploads with clients.

**Create (backend):**
- `backend/app/routers/clients.py`:
  - `POST /api/v1/clients` — create (auto-sets org_id)
  - `GET /api/v1/clients` — list with upload counts
  - `GET /api/v1/clients/{id}` — detail with recent uploads
  - `PATCH /api/v1/clients/{id}` — update
  - `DELETE /api/v1/clients/{id}` — delete

**Create (frontend):**
- `frontend/src/app/(authenticated)/clients/page.tsx` — client list table
- `frontend/src/app/(authenticated)/clients/[id]/page.tsx` — client detail + their uploads
- `frontend/src/components/ClientForm.tsx` — create/edit form
- `frontend/src/components/ClientSelector.tsx` — dropdown for upload flow

**Verify:** Create client → upload for that client → see upload in client detail → filter uploads by client.

---

### Chunk 7: Server-Side Category Templates

**Goal:** Move categories from localStorage to DB (per-org).

**Create (backend):**
- `backend/app/routers/categories.py`:
  - `GET /api/v1/categories` — list (auto-seed defaults on first access)
  - `POST /api/v1/categories` — create
  - `PUT /api/v1/categories` — bulk replace
  - `DELETE /api/v1/categories/{id}` — delete
  - `POST /api/v1/categories/reset` — reset to 16 defaults

**Modify:**
- `frontend/src/components/CategoryManager.tsx` — fetch from API instead of localStorage; optimistic UI

**Verify:** New org gets defaults auto-seeded. Add/remove persists via API. Different org = independent categories.

---

### Chunk 8: Client Portal

**Goal:** Clients log in with own Clerk account, see simplified UI, upload their own statements.

**Flow:** Accountant creates client → invites via email → client signs up in Clerk with `client` role → webhook links `clerk_user_id` to Client row → frontend routes client to `/portal`

**Create (backend):**
- `backend/app/routers/invitations.py` — `POST /api/v1/clients/{id}/invite`
- `backend/app/auth/permissions.py` — `require_role(*roles)` dependency
- `backend/app/auth/client_auth.py` — `get_current_client(claims, session)` resolves Client from clerk_user_id
- `backend/app/routers/portal.py` — portal-specific endpoints (`/api/v1/portal/me`, uploads, transactions)

**Create (frontend):**
- `frontend/src/app/(portal)/layout.tsx` — simplified sidebar (My Uploads, My Transactions)
- `frontend/src/app/(portal)/portal/page.tsx` — client dashboard + uploader
- `frontend/src/hooks/useUserRole.ts` — `{ role, isClient, isAccountant }` from Clerk org

**Verify:** Invite client → client signs up → lands on `/portal` → uploads statement → accountant sees it in client detail.

---

### Chunk 9: Accounting Export Formats

**Goal:** Add QBO, IIF, Xero CSV, Sage CSV alongside existing CSV/Excel.

**Create (backend):**
- `backend/app/services/export_qbo.py` — OFX 1.0.2 format (SGML-like, `<STMTTRN>` blocks)
- `backend/app/services/export_iif.py` — tab-delimited (TRNS/SPL/ENDTRNS blocks)
- `backend/app/services/export_xero.py` — CSV: Date, Amount, Payee, Description, Reference
- `backend/app/services/export_sage.py` — CSV: Date, Reference, Description, Amount

**Modify:**
- `backend/app/routers/export.py` — add cases for new formats with correct MIME types
- `frontend/src/components/ExportButtons.tsx` — dropdown menu grouped: General (CSV, Excel), QuickBooks (Online QBO, Desktop IIF), Other (Xero, Sage)

**Verify:** Export to all 6 formats. Validate QBO structure (OFX headers, STMTTRN blocks). Validate IIF structure (tab-delimited, proper headers). Xero/Sage CSVs have correct columns and date format.

---

### Chunk 10: Stripe Billing (Sandbox)

**Goal:** Subscription plans with usage limits. Stripe Checkout + Customer Portal.

**New dep:** `stripe==11.4.1`

**Plans:**

| Plan | Monthly Uploads | Clients | Price |
|------|----------------|---------|-------|
| Free | 10 | 3 | $0 |
| Starter | 100 | 25 | $15/mo |
| Pro | 1000 | 100 | $49/mo |
| Enterprise | Unlimited | Unlimited | $149/mo |

**Create (backend):**
- `backend/app/services/stripe_service.py` — `create_checkout_session()`, `create_customer_portal_session()`, `check_upload_limit()`
- `backend/app/routers/billing.py` — checkout, portal, status, and webhook endpoints

**Create (frontend):**
- `frontend/src/app/(authenticated)/billing/page.tsx` — plan comparison, usage meters, upgrade/manage buttons
- `frontend/src/components/UsageBanner.tsx` — warning when approaching limits
- `frontend/src/components/PricingTable.tsx` — plan comparison grid

**Verify:** Free tier → upload 10 → 11th returns 402. Upgrade via Stripe Checkout (test card 4242...). Webhook updates plan. 11th upload succeeds. Cancel in Portal → reverts to free.

---

### Chunk 11: Settings Page

**Goal:** Org settings, team member management.

**Create (backend):**
- `backend/app/routers/settings.py` — `GET/PATCH /api/v1/settings`, `GET /api/v1/settings/members`, `POST /api/v1/settings/members/invite`, `DELETE /api/v1/settings/members/{id}`

**Create (frontend):**
- `frontend/src/app/(authenticated)/settings/page.tsx` — tabs: General (org name), Team (members list + invite), Categories (full-page CategoryManager)

**Verify:** Update org name. Invite team member. They join and appear in list. Remove member.

---

### Chunk 12: Production Deployment

**Goal:** Vercel (frontend) + Railway (backend + Postgres).

**Create:**
- `frontend/vercel.json` — rewrites `/api/*` to Railway backend URL
- `backend/railway.toml` — `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `backend/Procfile` — fallback for Railway

**Env vars for Vercel:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`, sign-in/up URLs

**Env vars for Railway:** `DATABASE_URL` (auto), `ANTHROPIC_API_KEY`, `CLERK_*`, `STRIPE_*`, `ALLOWED_ORIGINS`, `MOCK_MODE=false`

**Verify:** Push → auto-deploy. Full flow works: signup → create client → upload → export → billing.

---

### Implementation Status

- [x] **Chunk 1** — Docker Compose for Local Dev
- [x] **Chunk 2** — Database Schema + SQLModel + Alembic
- [ ] **Chunk 3** — Clerk Auth — Backend
- [ ] **Chunk 4** — Clerk Auth — Frontend
- [ ] **Chunk 5** — Database-Backed Uploads
- [ ] **Chunk 6** — Client Management
- [ ] **Chunk 7** — Server-Side Category Templates
- [ ] **Chunk 8** — Client Portal
- [ ] **Chunk 9** — Accounting Export Formats
- [ ] **Chunk 10** — Stripe Billing (Sandbox)
- [ ] **Chunk 11** — Settings Page
- [ ] **Chunk 12** — Production Deployment

## Privacy, Legal & Compliance

Bank statements contain highly sensitive financial data — account numbers, transaction details, balances, merchant names. Processing this data as a SaaS triggers legal obligations across every jurisdiction we serve. This section documents applicable laws, required legal documents, technical controls, and implementation requirements.

> **Important:** This section is a planning reference, not legal advice. Engage qualified legal counsel in each jurisdiction before launch.

---

### Applicable Laws by Jurisdiction

#### United States

**Gramm-Leach-Bliley Act (GLBA)**

The FTC defines "financial institutions" broadly to include entities "significantly engaged" in financial activities. A SaaS processing bank statements for accountants likely qualifies as a financial institution or service provider to one.

- **Financial Privacy Rule:** Provide clear privacy notices explaining what data is collected, how it is shared, and consumers' right to opt out. Initial notice required at account creation.
- **Safeguards Rule (Updated June 2023):**
  - Designate a **Qualified Individual** to oversee the information security program
  - Conduct a **written risk assessment** identifying threats
  - **Encrypt** all customer information in transit and at rest
  - Require **MFA** for access to information systems
  - Maintain a **data inventory** of where customer info is collected, stored, and transmitted
  - **Annual penetration testing** + **semi-annual vulnerability scans**
  - Assess security of **third-party APIs** (including Anthropic)
  - **Least-privilege access controls**
  - Maintain an **incident response plan**
- **Penalties:** Up to $100,000 per violation; $10,000 per violation for officers; criminal penalties up to 5 years

**CCPA / CPRA (California)**

Applies if doing business in California and meeting any threshold: $25M+ revenue, 100K+ California residents' data, or 50%+ revenue from selling personal information. Financial account numbers + access codes are classified as **sensitive personal information**.

- **Consumer Rights:** Right to know, delete, correct, opt out of sale/sharing, limit use of sensitive data
- **Service Provider Contracts:** Written contracts specifying limited processing purposes, compliance verification
- **Risk Assessments:** Required for processing sensitive personal information
- **Annual Cybersecurity Audits** required for handlers of sensitive personal information
- **Automated Decision-Making (eff. Jan 2027):** Pre-use notices, opt-out rights, and logic explanations for AI-based decisions
- **Breach Notification (eff. Jan 2026):** 30 calendar days from discovery; AG notification if 500+ residents affected
- **Global Privacy Control (GPC):** Must detect and honor browser GPC signals

**Other State Privacy Laws (20+ states)**

| State | Law | Key Differences |
|-------|-----|-----------------|
| Virginia | VCDPA | Consent required for sensitive data; 30-day cure period |
| Colorado | CPA | GPC mandatory from 2025; biometric data provisions (July 2025) |
| Connecticut | CTDPA | Threshold lowered to 35K residents in 2025; narrowing GLBA exemptions |
| Texas | TDPSA | No revenue threshold; broad applicability; 30-day breach notification |
| New York | SHIELD Act | 30-day breach notification; reasonable security safeguards |

> **Note:** Many states historically exempted GLBA-covered data. 2025 amendments are narrowing these from entity-level to data-level exemptions — financial SaaS companies can no longer claim blanket exemption.

**FTC Act Section 5**

Applies to all commercial entities. Prohibits "unfair or deceptive acts or practices."

- Privacy policy promises are legally binding
- "Reasonable" security measures required for the type of data handled
- Data minimization — FTC has brought standalone claims for unreasonable data retention
- Sharing financial data with third parties (including AI providers) without adequate disclosure is actionable

**SOC 2**

Not legally mandated but de facto required for any SaaS handling financial data. Accounting firm clients will universally require it.

- **Recommended criteria:** Security (mandatory), Availability, Processing Integrity, Confidentiality, Privacy
- **Timeline:** Type I: 2-3 months; Type II: 6-12 months (evaluates controls over time)

---

#### Canada

**PIPEDA (Federal)**

Applies to private-sector organizations collecting, using, or disclosing personal information in commercial activities. Financial information is explicitly listed as personal information.

**10 Fair Information Principles:**
1. **Accountability** — Designate a Privacy Officer
2. **Identifying Purposes** — Document purposes before/at time of collection
3. **Consent** — Financial data requires **express (explicit) consent**
4. **Limiting Collection** — Collect only what's necessary
5. **Limiting Use/Disclosure/Retention** — Use only for stated purposes; documented retention schedules
6. **Accuracy** — Keep data accurate and up-to-date
7. **Safeguards** — Security measures appropriate to data sensitivity
8. **Openness** — Privacy policies readily available
9. **Individual Access** — Respond to access requests within **30 days**
10. **Challenging Compliance** — Provide mechanism for individuals to challenge compliance

**Breach Notification (eff. Nov 2024):**
- Report to Office of the Privacy Commissioner (OPC) **"as soon as feasible"** when there is real risk of significant harm
- Notify affected individuals directly
- Maintain records of **all breaches for 24 months**
- Knowingly failing to comply is a **criminal offense**

**Cross-Border Transfers:**
- Permitted but requires **comparable protection** via contractual arrangements
- Must **notify individuals** that data may be processed outside Canada
- Organization remains accountable for data in hands of third parties (e.g., Anthropic in the US)

**Quebec Law 25**

Applies to any organization processing personal information of Quebec residents, including out-of-province entities.

- **Privacy Impact Assessments (PIAs)** required before any new project involving personal information
- **Privacy Officer** must be designated; contact info published on website
- **Consent** must be specific, informed, and obtained for each purpose separately
- **Cross-Border Transfer Assessment** — PIA required before transferring data outside Quebec
- **Automated Decision-Making** — Individuals must be informed when decisions are made exclusively by automated processing; opportunity to present observations to a human reviewer
- **Penalties:** Up to 10M CAD or 2% of global revenue (administrative); up to 25M CAD or 4% of global revenue (serious infractions)

**Alberta PIPA & BC PIPA**

Substantially similar to PIPEDA. Key differences: 45-day access request response time (vs. PIPEDA's 30). Must notify individuals if using service providers outside Canada.

**OSFI Guidelines (B-13, B-10)**

Directly apply to federally regulated financial institutions. Our accounting firm clients may impose these requirements contractually as flow-down provisions: encryption, right-to-audit clauses, incident response requirements, RBAC, documented third-party risk management.

---

#### Europe

**GDPR**

Applies if we offer services to EU/EEA residents or process their data. If Canadian/US accountants have European clients whose bank statements are processed, GDPR applies to that data.

**Roles:** Accountant = **controller** (determines purposes); our SaaS = **processor**; Anthropic = **sub-processor**.

**Legal Basis:** Article 6(1)(b) — processing necessary for contract performance; Article 6(1)(f) — legitimate interests.

**Key Obligations:**

- **Data Processing Agreement (DPA)** — Mandatory under Article 28 between us and every client (controller), and between us and Anthropic (sub-processor). Must specify: subject matter, duration, data types, processor obligations, sub-processor authorization, security measures, audit cooperation.
- **Data Protection Impact Assessment (DPIA)** — Required under Article 35 for high-risk processing. Processing bank data at scale using AI triggers this. Must assess necessity, proportionality, risks, and mitigations.
- **Data Protection Officer (DPO)** — Likely required if processing personal data at large scale as a core activity.
- **Records of Processing Activities (ROPA)** — Detailed records under Article 30.
- **Privacy by Design and Default** — Article 25 requires data protection built into systems from the outset.

**Data Subject Rights (respond within 1 month):**
- Access, rectification, erasure ("right to be forgotten"), restriction, data portability, right to object

**Breach Notification:**
- Notify supervisory authority within **72 hours** of awareness
- Notify affected individuals **without undue delay** if high risk
- Document all breaches regardless of severity

**Cross-Border Transfers:**
- Require adequacy decision, **Standard Contractual Clauses (SCCs)**, Binding Corporate Rules, or other approved mechanism
- US transfers: EU-US Data Privacy Framework provides adequacy for certified US companies; verify Anthropic's certification status
- **Transfer Impact Assessment** required for US processing

**Penalties:** Up to 20M EUR or **4% of global annual turnover**, whichever is higher.

**PSD2 (Payment Services Directive 2)**

If we only process **uploaded PDF statements** without direct bank account access, PSD2 likely does not directly apply. However, EDPB guidance clarifies that bank statement data can reveal special-category data (religious donations, medical payments, trade union membership).

**ePrivacy Directive**

- Cookie consent required before storing non-essential cookies
- Consent must be freely given, specific, informed, and unambiguous
- Non-essential tracking must be **blocked before page load** until consent is granted

**EU AI Act (obligations by August 2026)**

If AI output is used for credit scoring or financial standing assessments, the system may be classified as **high-risk**. Obligations include:
- Risk management system, data governance, technical documentation
- Record-keeping and traceability (automatic event logging)
- Transparency: users must be informed they are interacting with AI
- Human oversight capabilities
- Accuracy, robustness, and cybersecurity requirements

---

### AI/LLM-Specific Compliance (Anthropic API)

Sending bank statement data to Anthropic's Claude API is a **critical compliance concern** across all jurisdictions.

**Anthropic's Position:**
- Offers a **Data Processing Addendum (DPA)** with SCCs, incorporated into Commercial Terms of Service
- API inputs/outputs **deleted within 30 days** by default
- **Zero Data Retention (ZDR)** available for enterprise customers
- Completed **SOC 2 Type II** audit
- Does **not** use API customer data for model training

**What We Must Do:**
1. **Execute Anthropic's DPA** — ensure SCCs are in place for EU data transfers
2. **Pursue Zero Data Retention** — especially for EU and Canadian financial data
3. **Data Minimization** — strip/redact unnecessary PII before API calls:
   - Tokenize or mask account numbers
   - Remove names and addresses where possible
   - Send only transaction descriptions and amounts when feasible
4. **Disclosure** — privacy policy and consent flows must explicitly state data is sent to a third-party AI service
5. **Sub-processor Management** — list Anthropic as sub-processor in DPAs with clients; notify of sub-processor changes
6. **Transfer Impact Assessment** — for EU data processed via US-based Anthropic
7. **DPIA** — AI processing of financial data requires a Data Protection Impact Assessment (GDPR)
8. **Fallback Option** — offer processing without AI for users who do not consent to third-party AI processing

---

### Breach Notification Summary

Design incident response around the **strictest applicable timelines**:

| Jurisdiction | Authority Notification | Individual Notification |
|-------------|----------------------|------------------------|
| **GDPR** | **72 hours** | Without undue delay (if high risk) |
| **PIPEDA** | "As soon as feasible" | As soon as feasible |
| **Quebec Law 25** | Promptly | Promptly |
| **California** (eff. 2026) | AG if 500+ affected | **30 calendar days** |
| **New York** | AG | **30 days** |
| **Texas** | AG if 500+ affected | **30 days** |
| **Colorado** | AG | **30 days** |
| **GLBA** | Per regulator | Per regulator |

**Target:** 72 hours for authority notification; 30 days for individual notification.

---

### Required Legal Documents

| Document | Required By | Priority |
|----------|-------------|----------|
| **Privacy Policy** | All jurisdictions | Critical — Day 1 |
| **Terms of Service** | All jurisdictions | Critical — Day 1 |
| **Cookie Policy** | GDPR, ePrivacy | Critical for EU users |
| **Data Processing Agreement (DPA)** | GDPR Art. 28, CCPA/CPRA | Critical — needed for every client |
| **Sub-Processing Agreement** with Anthropic | GDPR, PIPEDA | Critical — execute Anthropic's DPA |
| **Data Retention Policy** | All jurisdictions | High |
| **Information Security Policy** | GLBA, SOC 2, ISO 27001 | High |
| **Incident Response Plan** | GLBA, GDPR, PIPEDA, all states | High |
| **GLBA Privacy Notice** | GLBA | High |
| **Cross-Border Transfer Impact Assessment** | GDPR | High for EU users |
| **DPIA / Privacy Impact Assessment** | GDPR Art. 35, Quebec Law 25 | High |
| **Risk Assessment Documentation** | GLBA Safeguards, CCPA/CPRA | High |

---

### Technical Controls Required by Law

**Consent & Transparency (build into the app):**
- Cookie consent banner with granular controls (opt-in for non-essential; block before consent)
- GLBA privacy notice at account creation
- Explicit consent capture for financial data processing (timestamped, version-logged)
- Disclosure that data is processed by third-party AI (Anthropic) — specific, prominent, separate consent
- Quebec Law 25 / CPRA: separate consent per processing purpose
- Automated decision-making disclosure (if AI output affects decisions about individuals)
- Global Privacy Control (GPC) signal detection and honoring
- "Do Not Sell or Share My Personal Information" link (CCPA)

**Data Subject Rights Endpoints (build into the app):**
- `GET /api/v1/me/data-export` — download all personal data in portable format (JSON/CSV). Respond within 30 days (GDPR, PIPEDA) or 45 days (CCPA/CPRA)
- `DELETE /api/v1/me/data` — delete all personal data, cascading to Anthropic and sub-processors. Respond within 30 days.
- `PATCH /api/v1/me/data` — correct inaccurate information
- Opt-out mechanism for data sharing/sale
- Restrict processing toggle for sensitive data (CPRA)

**Security Controls (required by GLBA, GDPR, general best practice):**
- **Encryption at rest** — AES-256 for all stored financial data
- **Encryption in transit** — TLS 1.2+ for all transmission, including to Anthropic API
- **MFA** — for all user accounts and admin access (GLBA Safeguards Rule: mandatory)
- **RBAC** — accountants see only their clients' data; clients see only their own; tiered admin access
- **Audit logging** — all data access, modifications, exports, deletions, and API calls. Tamper-evident. Retained per policy. Required by GLBA, SOC 2, ISO 27001, EU AI Act.
- **Session management** — automatic timeout, secure session handling
- **Penetration testing** — annual (GLBA mandatory); semi-annual vulnerability scans
- **Secure file upload** — validate PDF format, scan for malware, strip metadata
- **Data masking** — mask account numbers in UI; tokenize before sending to external APIs

**Data Lifecycle Management:**
- Automated retention enforcement (auto-delete after defined period)
- Data anonymization for analytics
- Secure deletion (cryptographic erasure or overwrite)
- Breach record log maintained for 24+ months (PIPEDA)

**AI-Specific Controls:**
- Pre-processing pipeline to minimize PII sent to Anthropic API
- Logging of all API calls (what was sent, received, timestamps) for audit trail
- Human oversight capability for AI-generated outputs
- AI output labeling/disclosure to end users
- Option to process without AI for users who decline third-party AI consent

---

### Certifications to Pursue (Priority Order)

1. **SOC 2 Type II** (Security + Confidentiality + Processing Integrity) — most requested by accounting firm clients. Type I: 2-3 months → Type II: 6-12 months.
2. **ISO 27001** — internationally recognized; valued by European and Canadian clients. 3-9 months.
3. **GLBA Safeguards Rule Compliance** — legal obligation, not optional. Document compliance with 2023 requirements.
4. **EU-US Data Privacy Framework Certification** — simplifies cross-border data transfers for EU clients.

---

### Organizational Measures

- Appoint a **Qualified Individual** (GLBA) to oversee information security
- Appoint a **Privacy Officer** (PIPEDA) / **Data Protection Officer** (GDPR) — can be the same role
- Publish Privacy Officer contact info on website (Quebec Law 25)
- Regular privacy and security **employee training**
- Documented **vendor management program** for all third-party processors (including Anthropic)
- **Annual reviews** of security program, risk assessments, privacy policies, and DPIAs

---

### Legal Counsel Requirements

1. **US privacy/fintech attorney** — GLBA compliance, state privacy laws, FTC exposure, Terms of Service and Privacy Policy drafting
2. **Canadian privacy attorney** — PIPEDA and Quebec Law 25 compliance, cross-border AI processing
3. **EU data protection counsel** — GDPR compliance, DPIA, DPA drafting, transfer impact assessment, EU AI Act classification
4. **AI compliance counsel** — CCPA ADMT rules, EU AI Act, Quebec Law 25 automated decision-making requirements

---

### Current Status (MVP)

- Uploaded files are saved temporarily and deleted immediately after processing
- Anthropic API data is NOT used for training
- No data is persisted between requests (no database yet)
- API keys stored in `.env` which is git-ignored
- Full compliance implementation planned across Chunks 2-12 above

## Verification

1. Start backend: `cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000`
2. Start frontend: `cd frontend && pnpm dev`
3. Open http://localhost:4000
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
