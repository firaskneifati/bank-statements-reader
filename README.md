# Bank Statement Reader

A SaaS app that parses bank statements (PDFs, scanned documents, and photos) into structured transactions, categorizes them with AI, and exports to CSV/Excel. Supports text-based PDFs, scanned/image-based PDFs, and direct image uploads (JPEG, PNG, HEIC).

## Features

- **Multi-file upload** with drag-and-drop and concurrent processing
- **Image & scanned PDF support** — scanned PDFs auto-detected and processed via Claude Vision API; direct image uploads (JPEG, PNG, HEIC) accepted; mobile camera capture with native flash
- **Chequing & credit card support** with smart column display (posting date auto-detected)
- **AI categorization** via Claude Haiku 4.5 (or mock mode without API key)
- **Custom categories** — define your own or use 16 built-in defaults
- **CSV & Excel export** with styled, color-coded output
- **Authentication** — email/password with optional TOTP-based 2FA (Google Authenticator, Authy, etc.)
- **Security** — rate limiting, security headers, JWT auth, input validation
- **Sortable tables** — click any column header to sort

## Architecture

```
Browser (Next.js :4001)                    FastAPI Backend (:8000)
┌──────────────────┐                    ┌────────────────────────┐
│  NextAuth.js v5  │──Bearer token──>   │  Auth (register/login) │
│  (credentials)   │                    │  2FA (TOTP setup/verify│
│                  │                    │  JWT verification      │
│  Drag-and-Drop   │──POST /upload──>   │  PDF → pdfplumber      │
│  Upload Zone     │  (multipart)       │  Scanned → PyMuPDF →   │
│  + Camera Capture│                    │    Claude Vision API   │
│                  │                    │  Images → Vision API   │
│                  │                    │  LLM → Claude / Mock   │
│                  │                    │  Categorization        │
│  Transaction     │<──JSON response──  │                        │
│  Table + Export  │                    │  Export (CSV/XLSX)     │
└──────────────────┘                    └────────────────────────┘
                         │
                    PostgreSQL 16 (users, orgs, usage tracking)
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | FastAPI, Uvicorn, pdfplumber, PyMuPDF, Pillow, pillow-heif, Anthropic Claude API (text + vision), openpyxl, SQLModel + asyncpg, Alembic, python-jose, passlib, pyotp |
| **Frontend** | Next.js 15, React 19, TypeScript, NextAuth.js v5, Tailwind CSS v4, react-dropzone, @tanstack/react-table, qrcode.react |
| **Database** | PostgreSQL 16 (Docker) |
| **Production** | Docker Compose + Caddy (auto-HTTPS) |

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

Caddy automatically provisions TLS certificates via Let's Encrypt.

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
| POST | `/api/v1/export` | Bearer | Export transactions (CSV/XLSX) |

## Project Structure

```
bank-statements-reader/
├── docker-compose.yml              # Local dev (postgres + backend + frontend)
├── docker-compose.prod.yml         # Production (+ Caddy auto-HTTPS)
├── Caddyfile                       # Reverse proxy config
├── .env.production.example         # Production env template
├── LOCAL_SETUP.md                  # Local development guide
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   └── app/
│       ├── config.py               # Pydantic settings
│       ├── main.py                 # FastAPI app
│       ├── auth/
│       │   ├── password.py         # bcrypt hashing
│       │   ├── jwt.py              # JWT create/decode
│       │   ├── totp.py             # TOTP generate/verify (pyotp)
│       │   ├── dependencies.py     # CurrentUser dependency
│       │   └── schemas.py          # Request/response models
│       ├── db/
│       │   ├── engine.py           # Async SQLAlchemy engine
│       │   ├── models.py           # SQLModel tables
│       │   └── migrations/         # Alembic migrations
│       ├── routers/
│       │   ├── auth.py             # Auth + 2FA endpoints
│       │   ├── upload.py           # PDF/image upload + parsing
│       │   └── export.py           # CSV/Excel export
│       └── services/
│           ├── pdf_service.py      # pdfplumber text extraction
│           ├── image_service.py   # Scanned PDF detection, image conversion, optimization
│           ├── llm_service.py      # Claude text + vision API / mock routing
│           └── export_service.py   # File generation
├── frontend/
│   ├── Dockerfile                  # Dev container
│   ├── Dockerfile.prod             # Production multi-stage build
│   ├── package.json
│   ├── next.config.js              # API proxy rewrites
│   └── src/
│       ├── auth.ts                 # NextAuth config
│       ├── middleware.ts           # Route protection
│       ├── app/
│       │   ├── page.tsx            # Main upload/results page
│       │   ├── sign-in/            # Login with 2FA support
│       │   ├── sign-up/            # Registration
│       │   └── settings/security/  # 2FA setup page
│       ├── lib/
│       │   ├── types.ts            # TypeScript interfaces
│       │   └── api-client.ts       # API helpers with auth
│       └── components/
│           ├── Header.tsx          # Nav with settings + sign out
│           ├── FileUploader.tsx    # Drag-and-drop zone
│           ├── TransactionTable.tsx # Sortable results table
│           └── ExportButtons.tsx   # CSV/Excel download
```

## Implementation Status

- [x] Docker Compose (local dev + production)
- [x] Database schema (PostgreSQL + SQLModel + Alembic)
- [x] Backend auth (JWT, register/login)
- [x] Frontend auth (NextAuth.js, sign-in/up, middleware)
- [x] Usage tracking + statement filter tabs
- [x] Security hardening (rate limiting, headers, validation)
- [x] Production deployment (Caddy auto-HTTPS)
- [x] Two-factor authentication (TOTP)
- [x] Image & scanned PDF processing (Claude Vision API)
- [ ] Stateless privacy-by-design conversion
- [ ] Client management
- [ ] Server-side categories
- [ ] Accounting export formats (QBO, IIF, Xero, Sage)
- [ ] Stripe billing
- [ ] Settings + team management
