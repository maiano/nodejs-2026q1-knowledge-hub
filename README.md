# Knowledge Hub API

## Description

This project is a REST API built with **Nest.js** for a Knowledge Hub platform.

The application allows managing:

* Users
* Articles
* Categories
* Comments

The API supports creating, updating, deleting, and retrieving data, as well as filtering, pagination, and sorting for selected endpoints.

---

## Docker Image

<https://hub.docker.com/r/maiano/knowledge-hub:latest>

---

## Features

* Modular architecture (NestJS modules)
* DTO validation using `class-validator`
* Global `ValidationPipe`
* In-memory storage (easily replaceable with DB)
* Swagger (OpenAPI) documentation at `/doc`
* Article filtering by:

  * `status`
  * `categoryId`
  * `tag`
* Pagination & sorting (Hacker Scope)
* Cascade delete logic:

  * Deleting **User** → `authorId` in Articles becomes `null`, Comments are deleted
  * Deleting **Category** → `categoryId` in Articles becomes `null`
  * Deleting **Article** → related Comments are deleted
* Password is never returned in API responses

---

## Prerequisites

* Node.js (v24+) - https://nodejs.org/

---

## Downloading

```
git clone <repository URL>
cd nodejs-2026q1-knowledge-hub
```

---

## Installing dependencies

```
npm install
```

---

## Environment variables

Rename `.env.example` file in the root

---

## Running the application

```
npm start
```

Application will be available at:

```
http://localhost:4000
```

Swagger documentation:

```
http://localhost:4000/doc
```

---

## API Overview

### User (`/user`)

* GET /user
* GET /user/:id
* POST /user
* PUT /user/:id
* DELETE /user/:id

### Article (`/article`)

* GET /article (supports filtering)
* GET /article/:id
* POST /article
* PUT /article/:id
* DELETE /article/:id

### Category (`/category`)

* GET /category
* GET /category/:id
* POST /category
* PUT /category/:id
* DELETE /category/:id

### Comment (`/comment`)

* GET /comment?articleId=...
* POST /comment
* DELETE /comment/:id

---

## Pagination & Sorting

Supported on list endpoints (`/user`, `/article`, `/category`):

Query params:

* `page`
* `limit`
* `sortBy`
* `order` (`asc` | `desc`)

Response format:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 10
}
```

---

## Filtering (Articles only)

```
GET /article?status=published&tag=nodejs
```

---

## Testing

Run all tests:

```
npm run test
```

Run tests with authorization:

```
npm run test:auth
```

Run specific test:

```
npm run test -- <path>
```

RBAC tests:

```
npm run test:rbac
```

Refresh token tests:

```
npm run test:refresh
```

---

## Lint & Format

```
npm run lint
npm run format
```
