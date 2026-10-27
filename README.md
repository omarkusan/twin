# Maimaiti Aimaier: portfolio and AI digital twin

A personal portfolio whose main feature is an AI digital twin: a chat that answers questions about my background from a single, structured, verified profile and says so when it doesn't know.

Live site: <https://maimaitidigitaltwin.com>

## How it fits together

```
content/profile.json   single source of truth (experience, projects, skills, twin copy)
        │                         │
        ▼                         ▼
frontend/  Next.js static export  backend/  FastAPI on Lambda (Mangum) → Amazon Bedrock
(S3 + CloudFront)                 (memory in S3 or local files)
```

- The site and the twin's knowledge read the same `content/profile.json`, so they cannot drift apart. `frontend/scripts/sync-content.mjs` copies it into the frontend; `backend/deploy.py` packages it into the Lambda.
- The whole profile (a few thousand tokens) goes into the system prompt. A small lexical retriever only picks "related profile sections" chips and follow-up suggestions. RAG is not used for answering because the corpus is small.
- Infrastructure is unchanged: Terraform in `terraform/`, deploy via `scripts/deploy.sh` and GitHub Actions.

## Run locally

Prerequisites: Node 22.12+, [uv](https://docs.astral.sh/uv/), and AWS credentials with Bedrock model access (SSO, profile, or env vars).

```bash
# Backend (http://localhost:8000)
cd backend
cp ../.env.example .env        # then edit; see "Configuration"
uv sync
uv run uvicorn server:app --reload --port 8000

# Frontend (http://localhost:3000), in another terminal
cd frontend
npm install
npm run dev
```

The frontend calls `http://localhost:8000` unless `NEXT_PUBLIC_API_URL` is set.

## Configuration

See [`.env.example`](.env.example) for every variable. The ones you will touch:

| Variable | Where | Purpose |
| --- | --- | --- |
| `DEFAULT_AWS_REGION` | backend | Bedrock region |
| `BEDROCK_MODEL_ID` | backend | Model or inference profile (default `global.amazon.nova-2-lite-v1:0`) |
| `CORS_ORIGINS` | backend | Comma-separated allowed origins |
| `USE_S3`, `S3_BUCKET` | backend | Store conversation memory in S3 instead of `../memory` |
| `RATE_LIMIT_PER_MINUTE` | backend | Per-client limit (default 15) |
| `NEXT_PUBLIC_API_URL` | frontend | Public API base URL (not a secret) |

To change the AI provider, edit `call_bedrock` and `map_model_error` in `backend/server.py`. Everything else (prompt, memory, validation, rate limiting, logging) is provider-independent. No provider key ever reaches the browser.

## Test

```bash
# Frontend
cd frontend
npm run lint && npm run typecheck && npm test && npm run build

# Backend offline tests (no AWS needed)
cd backend
uv run pytest

# Live eval against the real model (needs AWS credentials; costs a few cents)
DEFAULT_AWS_REGION=us-east-2 uv run python evals/run_live.py [--only <id>] [--json]
```

The offline suite covers the prompt, knowledge retrieval, validation, rate limiting, error mapping, leak detection, and the eval scorer. The live eval (`backend/evals/cases.json`) checks grounding, refusal to invent, prompt-extraction resistance, and scope.

## Editing content

Change `content/profile.json` only. Keep claims to what the resume supports. Items the profile doesn't cover should stay out, because the twin treats anything absent as "not documented". Bump `meta.version` when you edit.

## Observability and privacy

Each chat request logs one JSON line: request id, latency, token counts, estimated cost, stop reason, model, prompt and knowledge versions, retrieved section ids, and a hashed session id. Message text and IP addresses are not logged.

## Deploy

Unchanged: push to `main` (or run the workflow manually) and `scripts/deploy.sh` builds the Lambda package, applies Terraform, builds the static site, syncs it to S3, and invalidates CloudFront. `.github/workflows/ci.yml` runs lint, types, tests, and a build on pull requests and non-main branches.
