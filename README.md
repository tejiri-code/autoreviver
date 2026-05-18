# AutoReviver — Fitment & Trust Copilot

**UniHack Innovation Fest 2026 · Challenge 03 · Marketplace · AI · Trust**

> The intelligence layer the UK used car parts market has never had.

## The Problem

The UK used car parts market is worth £2.8 billion — and it's broken at every level. Buyers purchase wrong parts because listings are incomplete. Sellers spend 20–30 minutes manually listing each part and still get compatibility wrong 15% of the time. There is no trust infrastructure.

## The Solution

AutoReviver combines structured fitment matching, AI-generated listings, semantic search, image-based authenticity checks, and seller trust scoring into a single platform.

## Key Features

- **Part Compatibility Verification** — deterministic fitment engine with confidence scoring and buyer-readable explanations
- **Smart Listing Generation** — upload a photo + part number → AI generates title, description, compatibility list, condition assessment, and price suggestion
- **Intelligent Search** — natural language → structured intent → semantic vector search
- **Trust & Anti-Scam** — perceptual image hashing (pHash/dHash/aHash) detects duplicate photos and stolen images; seller reputation scoring

## Architecture

```
Frontend (Next.js) — Vercel
        ↓
Node.js API (Express) — Render
        ↓
FastAPI AI Service (Python) — Render
        ↓
MongoDB + ChromaDB (vector search)
```

**AI Stack:**
- HuggingFace Inference API — listing generation + query intent extraction
- `sentence-transformers/all-MiniLM-L6-v2` — local semantic embeddings
- `Salesforce/blip-image-captioning-large` — image-to-text for parts
- `imagehash` — perceptual fingerprinting (pHash, dHash, aHash)

## How to Run

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Python 3.11 or 3.12

### 1. Set up environment

```bash
cp .env.example .env
```

Add your Hugging Face API key to `.env` (`HF_API_KEY`).

### 2. Start services

```bash
docker compose up --build
```

### 3. Seed demo data

```bash
cd node-api && npm install
npm run seed
```

### 4. Development (without Docker)

Run these commands from the repo root (`/Users/evelyn/autoreviver`). If you are currently in `node-api`, run `cd ..` first. Use a separate terminal for each service.

**AI API:**
```bash
cd ai-api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If your machine is low on disk space, install the lightweight API dependencies first:

```bash
cd ai-api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-lite.txt
python -m uvicorn app.main:app --reload --port 8000
```

The lightweight install starts health, fitment, and trust endpoints. Image hashing and semantic vector search still require the full `requirements.txt`.

**Node API:**
```bash
cd node-api
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Node API | http://localhost:4000 |
| FastAPI docs | http://localhost:8000/docs |

## Demo Scenarios

1. **Buyer finds a compatible Ford Fiesta headlight** — select vehicle, search "left headlight", see 91% fitment confidence with explanation
2. **Wrong-part prevention** — VW Golf buyer searching for a Ford Focus bumper sees "Incompatible" badge
3. **Seller listing automation** — upload a headlight photo → AI generates full professional listing in seconds
4. **Suspicious listing flagged** — duplicate/stolen image detected, low trust score displayed

## Vehicle Data Strategy

- Structured local JSON dataset (18 makes/models, 2000–2020)
- Manual vehicle selector as primary input (no API dependency)
- Mock DVLA responses for 6 demo registrations (AB12CDE, WN67DSO, etc.)
- DVLA VES API integration ready — key pending approval

## APIs Used

- HuggingFace Inference API (free tier)
- imagehash (Python, local)
- sentence-transformers (local, no API)

## Ethical Design

- Raw registration numbers hashed before storage
- AI decisions are auditable — fitment engine is deterministic, not an LLM
- Safety-critical parts (brakes, airbags, steering) trigger mandatory warnings
- Duplicate image detection protects buyers from fraud
- Listing completeness score encourages better seller behaviour

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Product API | Node.js, Express, Mongoose |
| AI API | FastAPI, Python 3.11 |
| Database | MongoDB |
| Vector Search | ChromaDB + sentence-transformers |
| Image Auth | imagehash (pHash/dHash/aHash) |
| AI Models | HuggingFace Inference API (free tier) |
| Deployment | Vercel (frontend) + Render (APIs) |
