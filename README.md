# Knowledge Hub API

## Description

This project is a REST API built with **Nest.js** for a Knowledge Hub platform.

The API manages:

* Users
* Articles
* Categories
* Comments
* Authentication and authorization (JWT access + refresh)
* Logging and error handling

---

## Docker Image

<https://hub.docker.com/r/maiano/knowledge-hub:latest>

---

## Features

* Modular architecture (NestJS modules)
* DTO validation using `class-validator`
* Prisma + PostgreSQL
* Global `ValidationPipe`
* Swagger (OpenAPI) documentation at `/doc`
* Auth endpoints: signup, login, refresh, logout
* JWT access/refresh tokens
* RBAC roles: `viewer`, `editor`, `admin`
* AI endpoints for article summarize, translate, analyze, and usage stats
* RAG endpoints for indexing, semantic search, grounded chat, and source attribution
* Rate limiting for `/auth/signup` and `/auth/login`
* Daily cron cleanup of expired refresh tokens in blacklist
* Request/response logging with sensitive data redaction
* Global exception filter
* Custom application errors for `400/401/403/404`
* Process-level error handling with graceful shutdown
* File logging with size-based rotation
* Article filtering by `status`, `categoryId`, `tag`
* External Qdrant vector DB in Docker Compose
* Pagination & sorting (Hacker Scope)
* Cascade delete logic
* Password is never returned in API responses

---

## Prerequisites

* Node.js (v24.10+)
* PostgreSQL (local or Docker)
* Docker Compose (for app + PostgreSQL + Qdrant)

---

## Downloading

```bash
git clone <repository URL>
cd nodejs-2026q1-knowledge-hub
```

---

## Installing dependencies

```bash
npm install
```

---

## Environment variables

Create `.env` from `.env.example`.

Required auth variables:

* `JWT_SECRET_KEY`
* `JWT_SECRET_REFRESH_KEY`
* `JWT_ACCESS_TTL` (example: `15m`)
* `JWT_REFRESH_TTL` (example: `7d`)
* `AUTH_THROTTLE_LIMIT` (example: `100`)
* `AUTH_THROTTLE_TTL_MS` (example: `60000`)
* `LOG_LEVEL` (`log`, `debug`, `warn`, `error`, `verbose`)
* `LOG_MAX_FILE_SIZE` (kilobytes, example: `1024`)

Required DB variable:

* `DATABASE_URL`

Required AI variables:

* `GEMINI_API_KEY`
* `GEMINI_API_BASE_URL` (default: `https://generativelanguage.googleapis.com`)
* `GEMINI_MODEL` (default/example: `gemini-2.5-flash`)
* `GEMINI_EMBEDDING_MODEL` (default/example: `text-embedding-004`)
* `AI_RATE_LIMIT_RPM` (default: `20`)
* `AI_CACHE_TTL_SEC` (default: `300`)

Required RAG variables:

* `RAG_VECTOR_DB_PROVIDER` (default/example: `qdrant`)
* `RAG_VECTOR_DB_URL` (default/example: `http://vectordb:6333`)
* `RAG_VECTOR_COLLECTION` (default/example: `knowledge_hub_articles`)
* `RAG_CHUNK_SIZE` (default: `800`)
* `RAG_CHUNK_OVERLAP` (default: `200`)
* `RAG_CONVERSATION_MAX_MESSAGES` (default: `20`)

---

## AI and RAG Setup

This project integrates Google Gemini over the HTTP API inside a dedicated `AiModule`.

Default model:

* `gemini-2.5-flash`

Default embedding model:

* `text-embedding-004`

RAG vector DB:

* `Qdrant`
* collection: `knowledge_hub_articles`
* transport: HTTP API inside the same Docker Compose network

AI access policy:

* AI and RAG endpoints are intentionally restricted to `editor` and `admin`
* Reason: AI requests consume external API quota and should not be exposed to every authenticated user by default

How to obtain a Gemini API key:

1. Open Google AI Studio.
2. Open the API keys page.
3. Sign in with your Google account.
4. Create a key for an existing Google Cloud project, or import/create a project first if needed.
5. Copy the generated key.
6. Paste it into `.env` as `GEMINI_API_KEY=...`.

After cloning the repository:

1. Install dependencies with `npm install`.
2. Create `.env` from `.env.example`.
3. Fill in `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_SECRET_REFRESH_KEY`, and `GEMINI_API_KEY`.
4. Keep or adjust `GEMINI_MODEL=gemini-2.5-flash`.
5. Keep or adjust `GEMINI_EMBEDDING_MODEL=text-embedding-004`.
6. Keep default or adjust RAG chunking and conversation limits in `.env`.

Known limitations:

* Gemini free-tier quotas may throttle requests or return temporary upstream errors.
* AI responses are probabilistic, so wording may vary between calls.
* AI cache, usage metrics, rate-limit counters, and conversation context are stored in memory and reset after process restart.
* RAG indexing time depends on article count and Gemini embedding latency.
* Hybrid retrieval quality depends on chunking and article content quality.
* Vector collection health and embedding/vector dimension compatibility must be verified in the running environment.
* Google AI Studio and API key/project availability can depend on account/project access and regional availability.

---

## Database (Prisma)

Apply migrations:

```bash
npx prisma migrate deploy
```

Generate Prisma client:

```bash
npx prisma generate
```

Optional seed:

```bash
npx prisma db seed
```

---

## Running the application

Recommended full startup flow with Docker Compose:

```bash
docker compose up --build
```

This starts:

* app on `http://localhost:4000`
* PostgreSQL on `localhost:5432`
* Qdrant on `localhost:6333`

If you run the API without Docker:

```bash
npm start
```

App URL: `http://localhost:4000`  
Swagger: `http://localhost:4000/doc`
Health: `http://localhost:4000/health`

For dev mode:

```bash
npm run start:dev
```

## RAG Manual Check

1. Start the full stack

```bash
docker compose up --build
```

2. Register a user

```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"login":"rag_editor","password":"Pass123!"}'
```

3. Promote the user to `EDITOR`

```bash
npx prisma db execute --stdin
```

```sql
UPDATE "User"
SET role = 'EDITOR'
WHERE login = 'rag_editor';
```

4. Login and copy the `accessToken`

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"rag_editor","password":"Pass123!"}'
```

5. Create one or more published articles

```bash
curl -X POST http://localhost:4000/article \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "title":"NestJS RAG Guide",
    "content":"Retrieval-augmented generation combines vector search with grounded generation. Qdrant stores chunk embeddings, and Gemini is used for embeddings and final answers.",
    "status":"published",
    "tags":["rag","nestjs","qdrant"]
  }'
```

6. Build or refresh the RAG index

```bash
curl -X POST http://localhost:4000/ai/rag/index \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"onlyPublished":true}'
```

7. Run semantic search

```bash
curl -X POST http://localhost:4000/ai/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"query":"How does Qdrant help RAG?","limit":5}'
```

8. Run grounded chat

```bash
curl -X POST http://localhost:4000/ai/rag/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"question":"Explain how embeddings and Qdrant work together in this project."}'
```

9. Optional conversation history inspection

```bash
curl http://localhost:4000/ai/rag/chat/<CONVERSATION_ID>/history \
  -H "Authorization: Bearer <TOKEN>"
```

10. Delete one article from the vector index

```bash
curl -X DELETE http://localhost:4000/ai/rag/index/articles/<ARTICLE_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

Expected RAG behavior:

* `POST /ai/rag/index` returns `200` with `indexedArticles`, `indexedChunks`, `vectorCollection`
* `POST /ai/rag/search` returns `200` with ranked chunks and article attribution
* `POST /ai/rag/chat` returns `200` with `answer`, `sources`, and `conversationId`
* `DELETE /ai/rag/index/articles/:articleId` returns `204`
* missing `query` or `question` returns `400`
* invalid article id format returns `400`
* unknown article id on delete returns `404`
* vector DB outage returns `503`
* Gemini outage returns `503`

## RAG Verification Algorithm

1. Start `docker compose up --build` and confirm `GET /health` returns `200`.
2. Confirm Qdrant is reachable on `http://localhost:6333/dashboard`.
3. Create or reuse at least one `published` article with distinctive content.
4. Call `POST /ai/rag/index` and verify `indexedArticles > 0` and `indexedChunks > 0`.
5. Call `POST /ai/rag/search` with a query that should clearly match the article.
6. Check that returned chunks actually contain the facts needed to answer the query.
7. Call `POST /ai/rag/chat` with the same topic and verify the answer is grounded in returned sources.
8. Call `POST /ai/rag/chat` again with `conversationId` and verify history is retained.
9. Delete the indexed article with `DELETE /ai/rag/index/articles/:articleId`.
10. Repeat `search` and verify deleted article chunks are no longer returned.
11. Change article content, re-run `POST /ai/rag/index`, and verify updated chunks appear in results.
12. Negative-check `400`, `404`, and `503` paths before final submission.

---

## AI Automation Check

AI verification script:

* For a quick end-to-end AI check, run:

```bash
./scripts/check-ai.sh
```

What the script does:

* creates a user
* promotes the user to `EDITOR` through `prisma db execute`
* logs in
* creates one article
* calls `summarize`, `translate`, `analyze`, `generate`, and `usage`

Script requirements:

* the API must already be running on `http://localhost:4000` or on `APP_URL`
* `.env` must contain valid `DATABASE_URL` and `GEMINI_API_KEY`

Supported environments:

* `macOS`
* `Linux`
* `Windows` via `WSL`

Optional overrides:

```bash
APP_URL=http://localhost:4000 LOGIN=my_ai_check PASSWORD='Pass123!' ./scripts/check-ai.sh
```

---

## AI Manual Check

This is a legacy non-RAG verification flow for summarize, translate, analyze, generate, and usage endpoints.

1. Create `.env` from `.env.example`, fill in DB, JWT, and Gemini variables, then prepare the database

```bash
npx prisma migrate deploy
npx prisma generate
```

2. Start the API

```bash
npm run start:dev
```

3. Register a user

```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"login":"ai_editor","password":"Pass123!"}'
```

4. Promote that user to `EDITOR`

```bash
npx prisma db execute --stdin
```

```sql
UPDATE "User"
SET role = 'EDITOR'
WHERE login = 'ai_editor';
```

5. Login and copy the `accessToken`

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"ai_editor","password":"Pass123!"}'
```

6. Create one article manually and copy its `id` from the response

```bash
curl -X POST http://localhost:4000/article \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "title":"AI Integration Smoke Test",
    "content":"This article is used to manually verify Gemini summarize, translate, and analyze endpoints.",
    "status":"draft",
    "tags":["ai","nestjs","gemini"]
  }'
```

7. Call `summarize`, `translate`, `analyze`, `generate`, and `usage` as shown in previous project steps.

Expected AI behavior:

* `POST /ai/articles/:articleId/summarize` returns `200` with `articleId`, `summary`, `originalLength`, `summaryLength`
* `POST /ai/articles/:articleId/translate` returns `200` with `articleId`, `translatedText`, `detectedLanguage`
* `POST /ai/articles/:articleId/analyze` returns `200` with `articleId`, `analysis`, `suggestions`, `severity`
* `POST /ai/generate` returns `200` with generated text
* `GET /ai/usage` returns in-memory usage counters and cache stats
* invalid article id format returns `400`
* unknown article id returns `404`
* missing `targetLanguage` returns `400`
* AI rate limit overflow returns `429` with `Retry-After`

---

## Logging

The app uses `nestjs-pino`.

Implemented behavior:

* human-readable logs in development
* structured logs in production
* request logging with method, URL, query, and sanitized body
* response logging with status code and response time
* file logging to `logs/app.log`
* size-based file rotation controlled by `LOG_MAX_FILE_SIZE`

Sensitive fields are redacted in logs:

* `password`
* `accessToken`
* `refreshToken`
* `token`

Process-level handlers are also registered for:

* `uncaughtException`
* `unhandledRejection`

---

## Error Handling

The app uses a global exception filter.

Handled error types:

* Nest `HttpException`
* `ValidationError` -> `400`
* `UnauthorizedError` -> `401`
* `ForbiddenError` -> `403`
* `NotFoundError` -> `404`

Unknown errors return:

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Auth quick check (for reviewer)

1. Signup

```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"login":"reviewer_user","password":"Pass123!"}'
```

2. Login (get access + refresh)

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"reviewer_user","password":"Pass123!"}'
```

3. Refresh

```bash
curl -X POST http://localhost:4000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

4. Logout (invalidates refresh token)

```bash
curl -X POST http://localhost:4000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

5. Refresh again with same token should return `403`

6. Invalid login or password should return `403`

7. Missing refresh token should return `401`

---

## RBAC summary

* `viewer`: read-only (`GET`)
* `editor`: `GET` + create/update own articles/comments
* `admin`: full access

---

## Testing

Unit tests (Vitest):

```bash
npm run test:unit
```

Coverage:

```bash
npm run test:coverage
```

Full auth-aware e2e:

```bash
npm run test:e2e
```

Auth e2e tests:

```bash
npm run test:auth
```

RBAC tests:

```bash
npm run test:rbac
```

Refresh tests:

```bash
npm run test:refresh
```

Legacy Jest-only suite:

```bash
npm run test:legacy
```

Important for e2e tests:

* API must be running on `http://localhost:4000` (`npm start`)
* DB must be available and migrations applied
* If tests fail with `AggregateError`, first check API health: `GET /health`

Current Vitest coverage thresholds:

* lines >= `90`
* branches >= `85`

## Lint & Format

```bash
npm run lint
npm run format
```
