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

* Node.js (v22.14+)
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
