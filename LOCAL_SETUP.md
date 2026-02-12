# Local Development Setup

## Prerequisites

- Python 3.11+
- Node.js 18+ with pnpm
- Docker Desktop (for PostgreSQL)

## Option A: Docker Compose (Easiest)

Starts PostgreSQL, backend, and frontend in one command.

```bash
# 1. Copy env file
cp backend/.env.example backend/.env
# Edit backend/.env — set JWT_SECRET (e.g. openssl rand -hex 32)

# 2. Create frontend env
cat > frontend/.env <<EOF
NEXTAUTH_URL=http://localhost:4001
NEXTAUTH_SECRET=<same value as JWT_SECRET>
EOF

# 3. Start everything
docker compose up --build

# 4. Run migrations (separate terminal)
docker compose exec backend alembic upgrade head
```

Open http://localhost:4001, register an account, and start uploading.

**Tear down** (containers + database):

```bash
docker compose down -v
```

## Option B: Manual Setup

### 1. Start PostgreSQL

```bash
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env — set JWT_SECRET

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend (separate terminal)

```bash
cd frontend
pnpm install

# Create .env if not exists
cat > .env <<EOF
NEXTAUTH_URL=http://localhost:4001
NEXTAUTH_SECRET=<same JWT_SECRET value>
EOF

pnpm dev --port 4001
```

### 4. Open http://localhost:4001

Register an account, upload PDFs or images, view transactions, export to CSV/Excel.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_MODE` | `true` | Use mock data instead of Claude API |
| `ANTHROPIC_API_KEY` | — | Required when `MOCK_MODE=false` |
| `ALLOWED_ORIGINS` | `http://localhost:4001` | CORS origins (comma-separated) |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | **Required.** Must match `NEXTAUTH_SECRET` |
| `MAX_FILE_SIZE_MB` | `10` | Max upload size per file |
| `MAX_IMAGE_DIMENSION` | `2048` | Max image dimension (px) before resizing |
| `GOOGLE_DOCAI_PROJECT_ID` | — | GCP project ID (optional — enables Document AI OCR) |
| `GOOGLE_DOCAI_LOCATION` | `us` | Document AI processor region |
| `GOOGLE_DOCAI_PROCESSOR_ID` | — | Document AI processor ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Path to GCP service account JSON key |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXTAUTH_URL` | `http://localhost:4001` | NextAuth base URL |
| `NEXTAUTH_SECRET` | — | **Required.** Must match `JWT_SECRET` |

## Using Real Claude API (Instead of Mock)

1. Sign up at [console.anthropic.com](https://console.anthropic.com/) (separate from claude.ai)
2. Add billing — new accounts get $5 free credits
3. Generate an API key under Settings > API Keys
4. Edit `backend/.env`:
   ```
   MOCK_MODE=false
   ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Restart the backend

## Setting Up Google Document AI (Optional)

Document AI provides cheap, high-accuracy OCR for scanned PDFs and images ($0.0015/page). Without it, the app falls back to Claude Sonnet Vision ($0.02/page).

1. Create a GCP project at [console.cloud.google.com](https://console.cloud.google.com/)
2. Enable the **Document AI API**
3. Create an **Enterprise Document OCR** processor in the `us` region
4. Create a service account with the `Cloud Document AI API User` role
5. Download the JSON key file and place it in `backend/` (e.g., `backend/gcp-docai-key.json`)
6. Add to `backend/.env`:
   ```
   GOOGLE_DOCAI_PROJECT_ID=your-project-id
   GOOGLE_DOCAI_LOCATION=us
   GOOGLE_DOCAI_PROCESSOR_ID=your-processor-id
   GOOGLE_APPLICATION_CREDENTIALS=gcp-docai-key.json
   ```
7. Restart the backend — scanned PDFs and images will now use Document AI + Haiku instead of Vision

Files with OCR confidence below 95% are automatically rejected (0 transactions returned) to prevent hallucination.

## Resetting the Database

```bash
# Docker Compose (full reset)
docker compose down -v && docker compose up --build
docker compose exec backend alembic upgrade head

# Manual setup
docker compose down -v && docker compose up postgres -d
cd backend && source venv/bin/activate && alembic upgrade head
```

## Troubleshooting

### Port already in use

```bash
lsof -ti:8000 | xargs kill -9   # backend
lsof -ti:4001 | xargs kill -9   # frontend
```

### Backend won't start

```bash
cd backend && source venv/bin/activate
python -c "from app.main import app; print('OK')"
ls -la .env
```

### Docker socket unresponsive

If `docker ps` fails even though Docker Desktop shows "Running", restart Docker Desktop.
