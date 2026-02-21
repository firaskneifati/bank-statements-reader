# BankRead — VPS Server Guide

This file lives at `/root/VPS_README.md` on the Hetzner VPS (`157.180.21.148`).
It explains everything about how this server is set up so future sessions can orient quickly.

---

## What this server does

Hosts the **backend API** for [bankread.ai](https://bankread.ai) — a SaaS that extracts transactions from bank statements (PDF, scanned images, CSV/XLSX) using OCR + LLM, categorizes them, and exports to spreadsheets.

```
bankread.ai       → Cloudflare → Vercel   (Next.js frontend — NOT on this server)
api.bankread.ai   → Cloudflare → THIS VPS (Caddy → FastAPI + PostgreSQL)
```

The frontend auto-deploys to Vercel on push to `main`. This server only runs the backend.

---

## Directory layout

```
/root/bank-statements-reader/          ← git repo (cloned from GitHub)
├── .env.production                    ← production secrets (DO NOT commit)
├── docker-compose.prod.yml            ← production compose file
├── Caddyfile                          ← reverse proxy config
├── backend/
│   ├── Dockerfile                     ← Python 3.11 slim image
│   ├── app/
│   │   ├── main.py                    ← FastAPI entrypoint, health check at GET /
│   │   ├── config.py                  ← Settings (from env vars)
│   │   ├── routers/                   ← API endpoints (auth, upload, export, billing, etc.)
│   │   ├── services/                  ← Business logic (OCR, LLM, categorization, export)
│   │   ├── db/
│   │   │   ├── models.py             ← SQLModel table definitions
│   │   │   ├── engine.py             ← Async SQLAlchemy engine
│   │   │   └── migrations/versions/  ← Alembic migrations
│   │   └── auth/                      ← JWT, password hashing, TOTP 2FA
│   ├── manage.py                      ← Admin CLI (create-user, usage, etc.)
│   ├── scripts/
│   │   └── healthcheck.py            ← Cron health check (see below)
│   └── requirements.txt
├── frontend/                          ← Next.js source (built on Vercel, not here)
├── DEPLOYMENT.md                      ← Full setup guide
├── LOCAL_SETUP.md                     ← Local dev guide
└── VPS_README.md                      ← This file
```

---

## Docker services (production)

Defined in `docker-compose.prod.yml`, always run with `--env-file .env.production`:

| Service    | Image              | Ports                    | Purpose                          |
|------------|--------------------|--------------------------|----------------------------------|
| `caddy`    | caddy:2-alpine     | 80, 443 (public)         | Reverse proxy, auto-HTTPS        |
| `postgres` | postgres:16-alpine | internal only            | Database (persistent `pgdata` volume) |
| `backend`  | ./backend          | 127.0.0.1:8000 (local)  | FastAPI API (4 uvicorn workers)  |

Caddy terminates TLS with a self-signed cert (Cloudflare SSL mode is "Full", not "Full Strict") and proxies to the backend container on port 8000.

---

## Common commands

All commands assume you're in `/root/bank-statements-reader/`.

### Compose shorthand

Every docker compose command needs these flags:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production <command>
```

### View logs
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend   # backend only
```

### Restart
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend
```

### Deploy new code
```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build backend
```

To rebuild everything (including Caddy/Postgres):
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Run database migrations
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend alembic upgrade head
```

### Management CLI
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend python manage.py <command>
```

Available commands:
| Command | Example | Description |
|---------|---------|-------------|
| `create-user` | `--email x@y.com --password "pass" --name "Name"` | Create user + org. Optional: `--org`, `--page-limit` |
| `delete-user` | `--email x@y.com` | Delete user and their data |
| `set-limit` | `--email x@y.com --pages 500` | Set monthly page quota |
| `grant-pages` | `--email x@y.com --pages 50` | Add bonus page credits |
| `usage` | *(no args)* | Show per-user stats and totals |

### Quick health check
```bash
curl -s https://api.bankread.ai/ | python3 -m json.tool
# Expected: {"status": "ok"}
```

---

## Environment variables

All secrets are in `.env.production` (git-ignored). Key vars:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Database credentials |
| `JWT_SECRET` | Shared secret between backend and frontend (NextAuth) |
| `ANTHROPIC_API_KEY` | Claude API for transaction parsing and categorization |
| `STRIPE_MODE` | `test` or `live` |
| `STRIPE_SECRET_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET_LIVE` | Stripe billing |
| `STRIPE_PRICE_STARTER_LIVE`, `..._PRO_LIVE`, `..._BUSINESS_LIVE` | Stripe price IDs |
| `RESEND_API_KEY` | Email sending (contact form, alerts, notifications) |
| `CONTACT_EMAIL` | Admin email (receives contact form submissions and alerts) |
| `FRONTEND_URL` | `https://bankread.ai` |
| `REGISTRATION_OPEN` | `true`/`false` — controls public sign-up |
| `GOOGLE_DOCAI_PROJECT_ID`, `..._LOCATION`, `..._PROCESSOR_ID` | Google Document AI OCR |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP key inside container (`/app/gcp-docai-key.json`) |

---

## Health check monitor (cron)

`backend/scripts/healthcheck.py` runs **outside Docker** on the host, triggered by cron every 3 hours.

**What it checks:**
1. `GET https://api.bankread.ai/` — expects `{"status": "ok"}`
2. `POST https://api.bankread.ai/api/v1/auth/login` with bad creds — expects HTTP 401 (proves full stack: Caddy → backend → DB)

**On failure:** sends alert email via Resend API to `CONTACT_EMAIL`.
**On success:** exits silently (no spam).

**Cron entry** (view with `crontab -l`):
```
0 */3 * * * cd /root/bank-statements-reader && /usr/bin/env bash -c 'set -a; source .env.production; set +a; python3 backend/scripts/healthcheck.py'
```

**Test manually:**
```bash
cd /root/bank-statements-reader
set -a; source .env.production; set +a
python3 backend/scripts/healthcheck.py && echo "All checks passed"
```

**Test failure alerting** (stop backend, run check, restart):
```bash
cd /root/bank-statements-reader
docker compose -f docker-compose.prod.yml --env-file .env.production stop backend
set -a; source .env.production; set +a
python3 backend/scripts/healthcheck.py    # should send alert email
docker compose -f docker-compose.prod.yml --env-file .env.production start backend
```

The script uses only Python stdlib (`urllib`, `json`) — no pip dependencies needed on the host.

---

## Architecture overview

### Request flow
```
Browser → Vercel (Next.js) → api.bankread.ai → Cloudflare → Caddy (:443) → backend (:8000) → PostgreSQL
```

### File upload pipeline
```
Upload (PDF / image / CSV / XLSX)
  │
  ├─ Text PDF       → pdfplumber (layout=True preserves columns)
  ├─ Scanned PDF    → Google Document AI OCR (≥95% confidence)
  ├─ Image          → Google Document AI OCR
  ├─ CSV/XLSX       → openpyxl / csv parser
  └─ Fallback       → Claude Sonnet Vision
  │
  ▼
Claude Haiku → parse transactions (date, description, amount, balance, type)
  │
  ▼
Categorization: user-defined rules first, then LLM fallback
  │
  ▼
Return editable transaction table to frontend
```

### Auth
- JWT tokens (24h expiry) shared between NextAuth (frontend) and FastAPI (backend)
- Optional TOTP 2FA (Google Authenticator)
- Auto sign-out on 401 in the frontend API client

### Billing
- Stripe subscriptions (Starter / Pro / Business plans)
- Monthly page quota tracked per organization
- Bonus pages consumed after regular quota
- Image pages cost 3x text pages

### Key backend endpoints
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Health check |
| `POST` | `/api/v1/auth/login` | Login |
| `POST` | `/api/v1/auth/register` | Sign up |
| `POST` | `/api/v1/upload` | Upload bank statements |
| `POST` | `/api/v1/export` | Export transactions (CSV/XLSX) |
| `GET` | `/api/v1/usage` | User quota and stats |
| `POST` | `/api/v1/billing/checkout` | Create Stripe checkout session |
| `POST` | `/api/v1/billing/webhook` | Stripe webhook |
| `GET/POST/DELETE` | `/api/v1/categories/*` | Custom category CRUD |
| `POST` | `/api/v1/contact` | Contact form |

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs backend

# Common causes:
# - Missing env var → check .env.production
# - DB not ready → check postgres logs
# - Port conflict → check if something else is on 8000
```

### Database issues
```bash
# Connect to postgres
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres psql -U bankuser -d bankstatements

# Check migration state
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend alembic current
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend alembic history
```

### Caddy / SSL issues
```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs caddy

# Cloudflare SSL must be "Full" (not "Full Strict") since Caddy uses self-signed certs
# Verify Caddyfile has: tls internal
```

### Health check failing
```bash
# Test endpoints manually
curl -s https://api.bankread.ai/
curl -s -o /dev/null -w "%{http_code}" -X POST https://api.bankread.ai/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
# Should return 401
```

---

## Git

The repo is cloned via HTTPS. To pull:
```bash
cd /root/bank-statements-reader && git pull
```

The `main` branch is the only branch used in production. Frontend deploys automatically to Vercel on push. Backend must be rebuilt manually (see "Deploy new code" above).
