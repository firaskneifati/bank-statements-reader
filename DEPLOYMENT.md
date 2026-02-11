# Production Deployment

## Prerequisites

- A VPS or server with Docker and Docker Compose installed
- A domain name with DNS pointing to your server's IP
- Ports 80 and 443 open

## Setup

1. Clone the repo on your server:

```bash
git clone git@github.com:firaskneifati/bank-statements-reader.git
cd bank-statements-reader
```

2. Create your production env file:

```bash
cp .env.production.example .env.production
```

3. Fill in the values:

```bash
# Generate secrets
openssl rand -hex 32  # use for POSTGRES_PASSWORD
openssl rand -hex 32  # use for JWT_SECRET
```

Edit `.env.production`:

```
DOMAIN=app.yourdomain.com
POSTGRES_USER=bankuser
POSTGRES_PASSWORD=<generated>
POSTGRES_DB=bankstatements
JWT_SECRET=<generated>
ANTHROPIC_API_KEY=<from console.anthropic.com>
```

4. Deploy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Caddy automatically provisions HTTPS via Let's Encrypt. No extra SSL configuration needed.

5. Run database migrations:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## Verify

- Visit `https://yourdomain.com` — should load the app over HTTPS
- Check `https://yourdomain.com/api/v1/` — should return `{"status":"ok"}`
- Open browser DevTools → Network → check response headers for security headers

## Common Operations

**View logs:**

```bash
docker compose -f docker-compose.prod.yml logs -f
```

**Restart a service:**

```bash
docker compose -f docker-compose.prod.yml restart backend
```

**Rebuild after code changes:**

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Stop everything:**

```bash
docker compose -f docker-compose.prod.yml down
```

## Architecture

```
Internet → Caddy (:443 HTTPS) → Frontend (Next.js :3000)
                               → Backend  (FastAPI :8000) → Postgres (:5432)
```

- **Caddy** handles SSL termination and routing (`/api/v1/*` → backend, everything else → frontend)
- **Backend** runs 4 uvicorn workers (no `--reload`)
- **Frontend** runs a production Next.js build (`pnpm start`)
- **Postgres** data persists in a Docker volume
