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

# Google Document AI (optional — enables cheaper OCR for scanned PDFs/images)
GOOGLE_DOCAI_PROJECT_ID=<your GCP project ID>
GOOGLE_DOCAI_LOCATION=us
GOOGLE_DOCAI_PROCESSOR_ID=<your processor ID>
GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-docai-key.json
```

### Deploy GCP key (if using Document AI)

```bash
# Copy key file to the server
scp gcp-docai-key.json root@<server-ip>:/root/bank-statements-reader/backend/gcp-docai-key.json
```

The key is mounted into the backend container via docker-compose.prod.yml. The `GOOGLE_APPLICATION_CREDENTIALS` path should be `/app/gcp-docai-key.json` (the container-internal path).

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

## 4. Stripe Billing Setup

BankRead uses Stripe for subscription billing. You need to create products and prices for each plan.

### Install the Stripe CLI

```bash
# macOS (download prebuilt binary)
curl -sL https://github.com/stripe/stripe-cli/releases/latest/download/stripe_darwin_arm64.tar.gz -o /tmp/stripe.tar.gz
tar -xzf /tmp/stripe.tar.gz -C /usr/local/bin/

# Or via Homebrew
brew install stripe/stripe-cli/stripe
```

### Authenticate

```bash
stripe login
# Opens browser — authorize the CLI for your Stripe account
# Verify with: stripe config --list
```

### Create products and prices

Each plan needs a **product** and a recurring **price**. Repeat for both test and live mode by passing the appropriate `--api-key`.

**Example: Create the Basic plan (CA$15/mo, 100 pages)**

```bash
# 1. Create the product
stripe products create \
  --name "BankRead Basic" \
  -d "metadata[pages]=100" \
  --api-key "sk_test_..."

# Note the product ID from the response (e.g. prod_Xxx...)

# 2. Create the recurring price (amount in cents: CA$15 = 1500)
stripe prices create \
  --product "prod_Xxx..." \
  --currency cad \
  --unit-amount 1500 \
  -d "recurring[interval]=month" \
  --api-key "sk_test_..."

# Note the price ID from the response (e.g. price_Xxx...)
```

Repeat for each plan, adjusting the name, metadata, and amount:

| Plan | Amount (cents) | Pages |
|------|---------------|-------|
| Basic | 1500 | 100 |
| Starter | 4900 | 400 |
| Pro | 19900 | 2000 |
| Business | 49900 | 10000 |

Repeat the same commands with `--api-key "sk_live_..."` for live mode.

### Configure price IDs

Add the price IDs to your `.env` (local) or `.env.production` (server):

```bash
STRIPE_MODE=test  # or "live" for production

STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_SECRET_KEY_LIVE=sk_live_...

STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...

STRIPE_PRICE_BASIC_TEST=price_...
STRIPE_PRICE_STARTER_TEST=price_...
STRIPE_PRICE_PRO_TEST=price_...
STRIPE_PRICE_BUSINESS_TEST=price_...

STRIPE_PRICE_BASIC_LIVE=price_...
STRIPE_PRICE_STARTER_LIVE=price_...
STRIPE_PRICE_PRO_LIVE=price_...
STRIPE_PRICE_BUSINESS_LIVE=price_...
```

### Useful commands

```bash
# List all products
stripe products list --api-key "sk_test_..."

# List all prices
stripe prices list --api-key "sk_test_..."

# View a specific price
stripe prices retrieve price_Xxx... --api-key "sk_test_..."
```

---

## 5. Deploy Frontend to Vercel

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
# Shows per-user uploads, documents, pages (text vs image breakdown), transactions, exports, and totals
```

**Delete a user:**

```bash
python manage.py delete-user --email user@example.com
# Deletes user, their uploads, and their organization (if sole member)
```
