<div align="center">

# Clicky-Store

**A focused e-commerce sandbox for gaming and office mice — built with Go on the back, React on the front.**

[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)

</div>

---

Clicky-Store is an educational online shop. It carries two product categories — **gaming** and **office** — and ships with the full e-commerce loop: browse, search, view a dedicated product page, add to cart, place an order, simulate payment, and manage everything from an admin dashboard.

Backend is plain `net/http` Go with a hexagonal layout (domains / ports / adapters). Frontend is a Vite-built React SPA in TypeScript, styled with Tailwind 4 and served by the same Go binary in production. PostgreSQL handles persistence; an in-memory store is the dev-only fallback.

---

## Highlights

| Customer | Admin | Platform |
| --- | --- | --- |
| Browse, search, sort, filter | Product CRUD with sectioned form | PostgreSQL persistence |
| Dedicated product pages by slug | JPEG/PNG image upload (drag-and-drop, max 10 / product) | In-memory fallback for tests |
| Image gallery with thumbnails | Image reorder, primary, alt text, delete | HMAC-signed bearer tokens |
| Quantity controls + sticky mobile buy bar | Order browsing, filtering, status badges | Bcrypt password hashing |
| Cart, checkout, order placement | User browsing + role updates | Login rate limiting |
| Simulated payment (success/failure) | Dashboard with revenue + low-stock alerts | Local upload storage with safe filename gen |
| Auth + protected routes | Server-side category whitelist (`gaming` / `office`) | Multi-stage Docker build |

---

## Quick start (Docker Compose)

```sh
git clone <your-fork-url> clicky-store
cd clicky-store
cp .env.example .env          # optional — defaults work for local dev
docker compose up --build
```

The storefront and API both serve from one container at:

```
http://localhost:8080
```

Health probe:

```sh
curl http://localhost:8080/healthz
```

Seeded admin account (development only):

```
email:    admin@clicky.local
password: admin12345
```

> **Heads up.** Outside `APP_ENV=development` the seeded admin is disabled and `AUTH_SECRET` must be set to a non-demo value. See [`docs/deployment.md`](docs/deployment.md).

---

## Local dev (without Docker)

Three terminals — Postgres in Compose, the Go backend, and the Vite dev server with API proxy:

```sh
# 1. Database
docker compose up db

# 2. Backend
go run ./cmd/server

# 3. Frontend
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/v1`, `/uploads`, and `/healthz` to `localhost:8080`, so the SPA at `http://localhost:5173` talks to the running Go backend without CORS gymnastics.

---

## Tech stack

```
Backend     Go 1.25 · net/http · pgx · golang.org/x/crypto
Frontend    React 19 · Vite 8 · TypeScript · Tailwind CSS 4 · React Router 7 · lucide-react
Storage     PostgreSQL 16 (memory fallback)
Auth        HMAC-signed bearer tokens · bcrypt password hashing
DevOps      Docker · Docker Compose · multi-stage build · GitHub Actions CI
```

---

## API surface

<details>
<summary><strong>Public endpoints</strong></summary>

```
GET  /healthz
GET  /api/v1/products
GET  /api/v1/products/{productId}
GET  /api/v1/products/slug/{slug}
POST /api/v1/auth/register
POST /api/v1/auth/login
```

</details>

<details>
<summary><strong>Customer endpoints (Bearer token)</strong></summary>

```
GET    /api/v1/me
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/{productId}
DELETE /api/v1/cart/items/{productId}
GET    /api/v1/orders
POST   /api/v1/orders
POST   /api/v1/orders/{orderId}/payment/simulate
```

</details>

<details>
<summary><strong>Admin endpoints (admin role required)</strong></summary>

```
GET    /api/v1/admin/products
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/{productId}
DELETE /api/v1/admin/products/{productId}
POST   /api/v1/admin/products/{productId}/images
PATCH  /api/v1/admin/products/{productId}/images/order
PATCH  /api/v1/admin/products/{productId}/images/{imageId}
DELETE /api/v1/admin/products/{productId}/images/{imageId}
GET    /api/v1/admin/orders
GET    /api/v1/admin/users
GET    /api/v1/admin/users/{userId}
PATCH  /api/v1/admin/users/{userId}
```

</details>

The OpenAPI spec lives in [`docs/openapi.yaml`](docs/openapi.yaml). Runnable curl recipes live in [`docs/api-examples.md`](docs/api-examples.md).

---

## Example flow

```sh
# Register
curl -sS -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Browse
curl -sS http://localhost:8080/api/v1/products | jq

# Direct product lookup by slug
curl -sS http://localhost:8080/api/v1/products/slug/viper-x1-gaming-mouse | jq

# Add to cart
curl -sS -X POST http://localhost:8080/api/v1/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"productId":"prod-gaming-viper","quantity":1}'

# Place order
curl -sS -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"paymentMethod":"simulation"}'

# Simulate payment success or failure
curl -sS -X POST http://localhost:8080/api/v1/orders/<order-id>/payment/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"result":"success"}'   # or "failure"
```

---

## Project structure

```
clicky-store/
├── cmd/
│   ├── server/                  HTTP server composition root
│   └── initcatalog/             Manual validator for init/init.json
├── internal/
│   ├── adapters/
│   │   ├── db/                  In-memory store + contract tests
│   │   ├── db/postgres/         PostgreSQL adapter + embedded migrations
│   │   ├── http/v1/             REST API v1 handlers, requests, middleware
│   │   └── uploads/             Local product image upload storage
│   ├── core/
│   │   ├── domains/             Domain models, validation, shared errors
│   │   └── ports/               Storage interfaces
│   ├── service/                 Application use cases + auth
│   ├── frontend/                React build serving adapter
│   ├── initcatalog/             Validated demo catalog loader
│   ├── config/                  Environment loading + production secret guards
│   └── web/                     Shared HTTP / JSON / middleware helpers
├── frontend/
│   ├── src/                     React + TS source (pages, components, state, API)
│   └── public/assets/products/  Seed product SVGs shipped with the build
├── init/                        Demo catalog JSON + ignored local image source folder
├── docs/                        OpenAPI + dev/deploy/API docs
├── compose.yaml                 Local API + PostgreSQL services
├── Dockerfile                   Multi-stage React + Go production image
└── AGENTS.md                    Contributor + AI-agent guidance + roadmap
```

---

## Catalog model

Two categories, server-side enforced:

```
gaming    High-DPI competitive picks
office    Quiet, ergonomic desk mice
```

Demo catalog seeding is opt-in. Drop matching JPG/PNG files into `init/img/{slug}/` to match the entries in `init/init.json`, then start the server. The initializer validates every JSON field plus every referenced image (extension, MIME sniff, decoded headers, size). If anything fails validation, the original four fallback products remain.

```sh
# Validate the demo catalog locally
go run ./cmd/initcatalog -path init/init.json
```

---

## Roadmap

| Phase | Title | Status |
| ----: | ----- | :----: |
| 0 | Sanity check current repo                                | Done |
| 1 | Switch frontend roadmap to React                         | Done |
| 2 | Add React app skeleton                                   | Done |
| 3 | Typed API client                                         | Done |
| 4 | Rebuild auth + layout                                    | Done |
| 5 | Rebuild product listing                                  | Done |
| 6 | Add product slug routes                                  | Done |
| 7 | Build product detail page                                | Done |
| 8 | Rebuild cart, checkout, orders                           | Done |
| 9 | Rebuild admin UI                                         | Done |
| 10 | Serve React build from Go                               | Done |
| 11 | Product image persistence                               | Done |
| 12 | Upload storage service                                  | Done |
| 13 | Admin image upload API                                  | Done |
| 14 | React drag-and-drop image uploader                      | Done |
| 15 | Use galleries across storefront                         | Done |
| 16 | Remove legacy static frontend                           | Done |
| 17 | E-shop layout polish                                    | Done |
| 18 | Documentation and final checks                          | Done |
| 19 | Validated demo catalog init                             | Done |
| 20 | Drop the travel category                                | Done |
| 21 | UI redesign (modern, responsive, accessible)            | Done |

Open candidates (none in flight):

- Drop the legacy `imageUrl` field once nothing on the wire reads it.
- Define an uploaded-file cleanup policy on product or image deletion.
- Expand product specs (sensor model, weight, switch type, polling rate, dimensions, accessories).

---

## Documentation

```
docs/
├── openapi.yaml         Machine-readable API spec
├── api-examples.md      Curl recipes
├── development.md       Local dev workflow + env vars
└── deployment.md        Production deploy + secrets + upload storage
```

`AGENTS.md` is the source of truth for contributor and AI-agent rules — design tokens, do/don't lists, phase plans, commit conventions.

---

## Status

Educational project. No license file is attached; treat the repository as "look, learn, fork — no production warranty." Security limitations are documented honestly in [`AGENTS.md`](AGENTS.md) and [`docs/deployment.md`](docs/deployment.md).

CI runs `gofmt`, `go test`, `go vet`, the frontend lint + build, and a full Docker image build on every push to `main` and every pull request.
