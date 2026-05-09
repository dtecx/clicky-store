# Clicky-Store

Clicky-Store is a small e-commerce project for gaming and office mice. The project brief in `plan/plan.pdf` asks for a client-server web store with a REST API, user accounts, product browsing, cart management, order placement, online payment handling or simulation, admin management, responsive UI, security basics, testing, and documentation.

This repository is starting with the backend and container foundation using:

- Go for the HTTP API
- Docker Compose for local services
- React, Vite, TypeScript, and Tailwind CSS for the storefront and admin UI
- PostgreSQL in Compose for durable persistence

## Current Status

Implemented backend features:

- Public product listing and product details
- Customer registration and login
- HMAC-signed bearer tokens
- Basic login rate limiting
- Authenticated profile endpoint
- Authenticated cart operations
- Authenticated order creation with pending simulated payment status
- Authenticated payment simulation for pending orders
- Admin product management
- Admin order listing
- Admin user listing, inspection, and role updates
- React storefront for browsing, product details, auth, cart, checkout, orders, and admin screens
- Health check endpoint
- Multi-stage Dockerfile and `compose.yaml`
- GitHub Actions CI for format checks, tests, vet, and Docker build
- PostgreSQL persistence for users, products, carts, and orders when `DATABASE_URL` is set
- Go production serving for the React build with SPA route fallback

The API uses PostgreSQL when `DATABASE_URL` is configured. If `DATABASE_URL` is empty, the server falls back to the in-memory store for lightweight local development and tests.

## Run With Docker Compose

Optional local configuration can start from:

```sh
cp .env.example .env
```

```sh
docker compose up --build
```

The API and React storefront listen on:

```txt
http://localhost:8080
```

Open the storefront at:

```txt
http://localhost:8080/
```

Health check:

```sh
curl http://localhost:8080/healthz
```

## Local API Credentials

Seeded admin account:

```txt
email: admin@clicky.local
password: admin12345
```

Set a stronger local secret before serious testing:

```sh
AUTH_SECRET="replace-me" docker compose up --build
```

`DATABASE_URL` defaults to the PostgreSQL service in `compose.yaml`. Leave it empty only when you intentionally want the server to use the in-memory development store.

Development mode (`APP_ENV=development`) provides demo defaults for `AUTH_SECRET` and the seeded admin account. Outside development, set a non-demo `AUTH_SECRET`; admin seeding only runs when `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are all configured.

## API Overview

More detailed API and setup documentation is available in:

```txt
docs/openapi.yaml
docs/api-examples.md
docs/development.md
docs/deployment.md
```

Public endpoints:

```txt
GET  /healthz
GET  /api/v1/products
GET  /api/v1/products/{productId}
POST /api/v1/auth/register
POST /api/v1/auth/login
```

Customer endpoints:

```txt
GET    /api/v1/me
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/{productId}
DELETE /api/v1/cart/items/{productId}
GET    /api/v1/orders
POST   /api/v1/orders
POST   /api/v1/orders/{orderId}/payment/simulate
```

Admin endpoints:

```txt
GET    /api/v1/admin/products
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/{productId}
DELETE /api/v1/admin/products/{productId}
GET    /api/v1/admin/orders
GET    /api/v1/admin/users
GET    /api/v1/admin/users/{userId}
PATCH  /api/v1/admin/users/{userId}
```

Use the token from login/register as:

```txt
Authorization: Bearer <token>
```

## Example Flow

Register:

```sh
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

List products:

```sh
curl http://localhost:8080/api/v1/products
```

Add to cart:

```sh
curl -X POST http://localhost:8080/api/v1/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"productId":"prod-gaming-viper","quantity":1}'
```

Create an order:

```sh
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"paymentMethod":"simulation"}'
```

Simulate payment:

```sh
curl -X POST http://localhost:8080/api/v1/orders/<order-id>/payment/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"result":"success"}'
```

Use `"failure"` to mark the pending simulated payment as failed.

## Planned Next Steps

- Polish the storefront layout (hero, category sidebar, sorting controls, responsive review)
- Define an uploaded-image cleanup policy on product/image deletion
- Seed the catalog with real Polish retailer data via the upcoming scraper

## Project Structure

```txt
cmd/server/               Go HTTP server composition root
internal/adapters/db/     Current in-memory database adapter
internal/adapters/db/postgres PostgreSQL adapter and embedded migrations
internal/adapters/http/v1 REST API v1 handlers and request DTOs
internal/core/domains/    Domain models and shared domain errors
internal/core/ports/      Storage interfaces
internal/frontend/        React build serving adapter (FRONTEND_DIST_DIR aware)
internal/service/         Application use cases and auth helpers
internal/web/             Shared HTTP JSON and middleware helpers
frontend/                 React + Vite + TypeScript + Tailwind source app
compose.yaml              Local API and database services
Dockerfile                Multi-stage React and Go production image
plan/                     Local project brief files, ignored by git
```
