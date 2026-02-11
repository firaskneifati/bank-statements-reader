# Production Deployment

## Architecture

```
bankread.ai      → Cloudflare (proxy) → Vercel  (Next.js frontend)
api.bankread.ai  → Cloudflare (proxy) → Hetzner (FastAPI + PostgreSQL + Caddy)
```

---

## 1. Hetzner VPS Setup

### Create a server

1. Sign up at [hetzner.com/cloud](https://www.hetzner.com/cloud/)
2. Create project → Add Server
3. Location: **Ashburn** (US East, closest to Cloudflare/Vercel edge)
4. Image: **Ubuntu 22.04**
5. Type: **CX22** — 2 vCPU, 4 GB RAM, 40 GB NVMe (~$4.50/mo)
6. SSH Key: Add your public key (or create one)
7. Name: `bankread-api` → Create

Note the server's **IPv4 address** — you'll need it for Cloudflare DNS.

### Firewall (recommended)

In Hetzner Cloud Console → Firewalls → Create:

| Direction | Port | Protocol | Source    |
|-----------|------|----------|-----------|
| Inbound   | 22   | TCP      | Any       |
| Inbound   | 80   | TCP      | Any       |
| Inbound   | 443  | TCP      | Any       |

Attach the firewall to the `bankread-api` server.

### Install Docker

SSH into the server:

```bash
ssh root@<server-ip>

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt-get install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

---

## 2. Cloudflare DNS

In your Cloudflare dashboard for `bankread.ai`:

| Type  | Name  | Content                | Proxy  |
|-------|-------|------------------------|--------|
| A     | `api` | `<Hetzner server IP>`   | Orange (proxied) |
| CNAME | `@`   | `cname.vercel-dns.com` | DNS only (grey)  |

**Important:** The root `@` record must be **DNS only** (grey cloud) for Vercel — Vercel manages its own SSL.

### Cloudflare SSL settings (for api.bankread.ai)

1. SSL/TLS → Overview → Set mode to **Full** (not "Full Strict")
2. This allows Cloudflare to accept Caddy's internal (self-signed) certificate on the origin

---

## 3. Deploy Backend to Hetzner

SSH into the server:

```bash
# Clone the repo
git clone https://github.com/firaskneifati/bank-statements-reader.git
cd bank-statements-reader

# Create production env file
cp .env.production.example .env.production
```

Edit `.env.production`:

```bash
DOMAIN=bankread.ai
API_DOMAIN=api.bankread.ai
POSTGRES_USER=bankuser
POSTGRES_PASSWORD=<run: openssl rand -hex 32>
POSTGRES_DB=bankstatements
JWT_SECRET=<run: openssl rand -hex 32>
ANTHROPIC_API_KEY=<from console.anthropic.com>
```

Deploy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Run database migrations:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Verify:

```bash
curl -k https://localhost/
# Should return: {"status":"ok"}
```

---

## 4. Deploy Frontend to Vercel

### Connect the repo

1. Go to [vercel.com](https://vercel.com) → Import project
2. Select the `bank-statements-reader` repo
3. Set **Root Directory** to `frontend`
4. Framework Preset: **Next.js** (auto-detected)

### Set environment variables

In Vercel project settings → Environment Variables:

| Key              | Value                        |
|------------------|------------------------------|
| `BACKEND_URL`    | `https://api.bankread.ai`    |
| `NEXTAUTH_URL`   | `https://bankread.ai`        |
| `NEXTAUTH_SECRET`| `<same JWT_SECRET as backend>` |
| `AUTH_TRUST_HOST` | `true`                      |

### Add custom domain

1. Vercel project → Settings → Domains → Add `bankread.ai`
2. Vercel will show verification instructions (already handled by the CNAME record above)

---

## Verify

- `https://bankread.ai` — should load the app
- `https://api.bankread.ai/` — should return `{"status":"ok"}`
- Try registering and logging in

---

## Common Operations

**View backend logs:**

```bash
docker compose -f docker-compose.prod.yml logs -f
```

**Restart a service:**

```bash
docker compose -f docker-compose.prod.yml restart backend
```

**Rebuild after code changes:**

```bash
cd bank-statements-reader
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

**Redeploy frontend:**

Push to `main` — Vercel auto-deploys.

---

## Management CLI

The `manage.py` script handles user creation and usage reporting.

### Local

```bash
cd backend
source venv/bin/activate
python manage.py <command>
```

### Production (Hetzner)

```bash
source ~/.zshrc && git-acc firaskneifati
ssh root@157.180.21.148
cd bank-statements-reader
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend python manage.py <command>
```

### Commands

**Create a user:**

```bash
python manage.py create-user --email user@example.com --password "securepass" --name "Jane Doe"
# Optional: --org "Company Name" (defaults to "<name>'s Organization")
```

**View usage stats:**

```bash
python manage.py usage
# Shows per-user uploads, documents, pages, transactions, exports, and totals
```
