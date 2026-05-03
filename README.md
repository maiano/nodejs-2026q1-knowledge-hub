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
* Rate limiting for `/auth/signup` and `/auth/login`
* Daily cron cleanup of expired refresh tokens in blacklist
* Request/response logging with sensitive data redaction
* Global exception filter
* Custom application errors for `400/401/403/404`
* Process-level error handling with graceful shutdown
* File logging with size-based rotation
* Article filtering by `status`, `categoryId`, `tag`
* Pagination & sorting (Hacker Scope)
* Cascade delete logic
* Password is never returned in API responses

---

## Prerequisites

* Node.js (v24.10+)
* PostgreSQL (local or Docker)

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
* `AI_RATE_LIMIT_RPM` (default: `20`)
* `AI_CACHE_TTL_SEC` (default: `300`)

---

## AI Setup

This project integrates Google Gemini over the HTTP API inside a dedicated `AiModule`.

Default model:

* `gemini-2.5-flash`

AI access policy:

* AI endpoints are intentionally restricted to `editor` and `admin`
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
4. Optionally adjust `GEMINI_MODEL`, `AI_RATE_LIMIT_RPM`, and `AI_CACHE_TTL_SEC`.

Known limitations:

* Gemini free-tier quotas may throttle requests or return temporary upstream errors.
* AI responses are probabilistic, so wording may vary between calls.
* AI cache, usage metrics, rate-limit counters, and conversation context are stored in memory and reset after process restart.
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

The AI endpoints are intentionally limited to `editor` and `admin`, so update the role in the database before continuing.

```bash
npx prisma db execute --stdin
```

Then insert SQL:

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

7. Summarize

```bash
curl -X POST http://localhost:4000/ai/articles/<ARTICLE_ID>/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"maxLength":"short"}'
```

8. Translate

```bash
curl -X POST http://localhost:4000/ai/articles/<ARTICLE_ID>/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"targetLanguage":"Russian"}'
```

9. Analyze

```bash
curl -X POST http://localhost:4000/ai/articles/<ARTICLE_ID>/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"task":"review"}'
```

10. Optional generic generation

```bash
curl -X POST http://localhost:4000/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"prompt":"Give me three bullet points about NestJS modules.","sessionId":"manual-check-1"}'
```

11. Usage and observability metrics

```bash
curl http://localhost:4000/ai/usage \
  -H "Authorization: Bearer <TOKEN>"
```

Seed-based shortcut:

* If you prefer seeded demo data, run `npx prisma db seed` after migrations and client generation.
* Then skip steps `3` and `4`.
* Login with seeded editor credentials and continue from step `5`:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"editor","password":"editor123"}'
```

* You can still use step `6` to create a dedicated article for the AI check, or reuse an existing one from the seeded dataset by calling:

```bash
curl http://localhost:4000/article \
  -H "Authorization: Bearer <TOKEN>"
```

Expected behavior:

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
