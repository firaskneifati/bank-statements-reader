# Bank Statement Reader

A SaaS app that parses bank statements (PDFs, scanned documents, and photos) into structured transactions, categorizes them with AI, and exports to CSV/Excel. Features a hybrid OCR pipeline: Google Document AI for cheap, high-accuracy text extraction with Claude AI for intelligent transaction parsing.

## Features

- **Multi-file upload** with drag-and-drop and per-file progress tracking
- **Hybrid OCR pipeline** — Google Document AI for OCR ($0.0015/page) + Claude Haiku for parsing, with Claude Sonnet Vision as fallback
- **Image & scanned PDF support** — JPEG, PNG, HEIC uploads; scanned PDFs auto-detected
- **OCR confidence gating** — Document AI confidence score shown per file; files below 95% threshold rejected to prevent hallucination
- **Anti-hallucination prompts** — LLM instructed to return empty results rather than guess unclear content
- **Editable transaction table** — click any cell to edit (date, description, amount, type, balance, category)
- **Chequing & credit card support** with smart column display (posting date auto-detected)
- **AI categorization** via Claude Haiku 4.5 with 16 built-in categories or custom categories
- **CSV & Excel export** with styled, color-coded output
- **Authentication** — email/password with optional TOTP-based 2FA (Google Authenticator, Authy, etc.)
- **Terms of Service acceptance** required at sign-up with liability disclaimer
- **Usage tracking** — per-org page limits, text vs image page breakdown, monthly reset
- **Stripe billing** — Free, Basic, Starter, Pro, Business plans with automatic quota management
- **Security** — rate limiting, security headers, JWT auth, input validation, audit logging

## Architecture

```
Browser (Next.js :4001)                    FastAPI Backend (:8000)
┌──────────────────┐                    ┌────────────────────────┐
│  NextAuth.js v5  │──Bearer token──>   │  Auth (register/login) │
│  (credentials)   │                    │  2FA (TOTP setup/verify│
│                  │                    │  JWT verification      │
│  Drag-and-Drop   │──POST /upload──>   │  PDF → pdfplumber      │
│  Upload Zone     │  (multipart)       │  Scanned → Document AI │
│                  │                    │    → Claude Haiku       │
│                  │                    │  Fallback → Claude      │
│                  │                    │    Sonnet Vision        │
│  Editable        │<──JSON response──  │  Images → same pipeline│
│  Transaction     │                    │  Categorization        │
│  Table + Export  │                    │  Export (CSV/XLSX)     │
└──────────────────┘                    └────────────────────────┘
                         │
                    PostgreSQL 16 (users, orgs, usage, audit logs)
```

### Processing Pipeline

```
Text PDF:    pdfplumber (table-aware extraction) → Claude Haiku → transactions
Scanned PDF: Document AI OCR → confidence check (≥95%) → Claude Haiku → transactions
Image:       Document AI OCR → confidence check (≥95%) → Claude Haiku → transactions
Fallback:    Claude Sonnet Vision (when Document AI unavailable or fails)
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | FastAPI, Uvicorn, pdfplumber, PyMuPDF, Pillow, pillow-heif, Google Document AI, Anthropic Claude API (Haiku + Sonnet Vision), openpyxl, SQLModel + asyncpg, Alembic, python-jose, passlib, pyotp |
| **Frontend** | Next.js 15, React 19, TypeScript, NextAuth.js v5, Tailwind CSS v4, react-dropzone, @tanstack/react-table, qrcode.react |
| **Database** | PostgreSQL 16 (Docker) |
| **Production** | Docker Compose + Caddy (auto-HTTPS), Vercel (frontend), Hetzner VPS (backend) |

## Quick Start

See **[LOCAL_SETUP.md](LOCAL_SETUP.md)** for full local development instructions.

**Fastest path:**

```bash
cp backend/.env.example backend/.env   # set JWT_SECRET
# Create frontend/.env with NEXTAUTH_URL + NEXTAUTH_SECRET
docker compose up --build
docker compose exec backend alembic upgrade head
```

Open http://localhost:4001

## Production Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for full production setup.

Uses `docker-compose.prod.yml` with Caddy for auto-HTTPS.

```bash
# 1. Configure environment
cp .env.production.example .env.production
# Edit .env.production — set DOMAIN, POSTGRES_PASSWORD, JWT_SECRET, ANTHROPIC_API_KEY

# 2. Deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 3. Run migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register (creates user + org) |
| POST | `/api/v1/auth/login` | No | Login (returns JWT; 403 if 2FA required) |
| GET | `/api/v1/auth/me` | Bearer | Current user info |
| POST | `/api/v1/auth/2fa/setup` | Bearer | Generate TOTP secret + QR URI |
| POST | `/api/v1/auth/2fa/verify-setup` | Bearer | Verify code and enable 2FA |
| POST | `/api/v1/auth/2fa/disable` | Bearer | Disable 2FA (requires password + code) |
| POST | `/api/v1/upload` | Bearer | Upload PDFs or images for parsing |
| GET | `/api/v1/usage` | Bearer | Get usage stats (text/image breakdown) |
| POST | `/api/v1/export` | Bearer | Export transactions (CSV/XLSX) |

## Project Structure

```
bank-statements-reader/
├── docker-compose.yml              # Local dev (postgres + backend + frontend)
├── docker-compose.prod.yml         # Production (+ Caddy auto-HTTPS)
├── Caddyfile                       # Reverse proxy config
├── .env.production.example         # Production env template
├── LOCAL_SETUP.md                  # Local development guide
├── DEPLOYMENT.md                   # Production deployment guide
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py                   # CLI: create-user, usage, delete-user
│   ├── alembic.ini
│   └── app/
│       ├── config.py               # Pydantic settings (incl. Document AI)
│       ├── main.py                 # FastAPI app
│       ├── auth/
│       │   ├── password.py         # bcrypt hashing
│       │   ├── jwt.py              # JWT create/decode
│       │   ├── totp.py             # TOTP generate/verify (pyotp)
│       │   ├── dependencies.py     # CurrentUser dependency
│       │   └── schemas.py          # Request/response models
│       ├── db/
│       │   ├── engine.py           # Async SQLAlchemy engine
│       │   ├── models.py           # SQLModel tables (User, Org, Upload, AuditLog)
│       │   └── migrations/         # Alembic migrations
│       ├── routers/
│       │   ├── auth.py             # Auth + 2FA endpoints
│       │   ├── upload.py           # PDF/image upload + parsing + confidence gating
│       │   ├── usage.py            # Usage stats endpoint
│       │   └── export.py           # CSV/Excel export
│       └── services/
│           ├── pdf_service.py      # pdfplumber table-aware text extraction
│           ├── image_service.py    # Image conversion, optimization, validation
│           ├── docai_service.py    # Google Document AI OCR + confidence scoring
│           ├── llm_service.py      # Claude Haiku (text) + Sonnet (vision) with anti-hallucination prompts
│           ├── categorization_service.py  # Mock mode categorization
│           ├── audit.py            # Audit logging
│           └── export_service.py   # CSV/XLSX file generation
├── frontend/
│   ├── Dockerfile                  # Dev container
│   ├── Dockerfile.prod             # Production multi-stage build
│   ├── package.json
│   ├── next.config.js              # API proxy rewrites
│   └── src/
│       ├── auth.ts                 # NextAuth config
│       ├── middleware.ts           # Route protection
│       ├── app/
│       │   ├── dashboard/page.tsx  # Main upload/results page
│       │   ├── sign-in/            # Login with 2FA support
│       │   ├── sign-up/            # Registration with terms acceptance
│       │   ├── settings/security/  # 2FA setup page
│       │   ├── settings/billing/   # Stripe billing management
│       │   ├── terms/              # Terms of Service
│       │   └── privacy/            # Privacy Policy
│       ├── lib/
│       │   ├── types.ts            # TypeScript interfaces
│       │   └── api-client.ts       # API helpers with auth
│       └── components/
│           ├── Header.tsx          # Nav with settings + sign out
│           ├── FileUploader.tsx    # Drag-and-drop zone with mobile tips
│           ├── TransactionTable.tsx # Editable, sortable results table
│           ├── CategoryManager.tsx # Custom category editor
│           ├── CategorySummary.tsx # Spending breakdown by category
│           ├── UsageBanner.tsx     # Plan usage + text/image page breakdown
│           ├── UploadProgress.tsx  # Per-file upload progress
│           └── ExportButtons.tsx   # CSV/Excel download
```
