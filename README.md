# Clicky-Store

Clicky-Store is a small e-commerce project for gaming and office mice. The project brief in `plan/plan.pdf` asks for a client-server web store with a REST API, user accounts, product browsing, cart management, order placement, online payment handling or simulation, admin management, responsive UI, security basics, testing, and documentation.

This repository is starting with the backend and container foundation using:

- Go for the HTTP API
- Docker Compose for local services
- HTML/CSS/JavaScript for the future frontend
- PostgreSQL in Compose for durable persistence

## Current Status

Implemented backend features:

- Public product listing and product details
- Customer registration and login
- HMAC-signed bearer tokens
- Authenticated profile endpoint
- Authenticated cart operations
- Authenticated order creation with simulated payment status
- Admin product management
- Admin order listing
- Admin user listing, inspection, and role updates
- Embedded responsive storefront for browsing, auth, cart, checkout, orders, and admin screens
- Health check endpoint
- Dockerfile and `compose.yaml`
- PostgreSQL persistence for users, products, carts, and orders when `DATABASE_URL` is set

The API uses PostgreSQL when `DATABASE_URL` is configured. If `DATABASE_URL` is empty, the server falls back to the in-memory store for lightweight local development and tests.

## Run With Docker Compose

Optional local configuration can start from:

```sh
cp .env.example .env
```

```sh
docker compose up --build
```

The API listens on:

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

## API Overview

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

## Planned Next Steps

- Add store contract tests around memory and PostgreSQL behavior
- Replace development password hashing/token handling with production-grade libraries
- Expand backend tests around edge cases and store behavior
- Expand frontend polish around loading states, validation, and admin filtering
- Add payment provider simulation or integration boundary

## Project Structure

```txt
cmd/server/               Go HTTP server composition root
internal/adapters/db/     Current in-memory database adapter
internal/adapters/db/postgres PostgreSQL adapter and embedded migrations
internal/adapters/http/v1 REST API v1 handlers and request DTOs
internal/core/domains/    Domain models and shared domain errors
internal/core/ports/      Storage interfaces
internal/frontend/        Embedded HTML/CSS/JavaScript storefront
internal/service/         Application use cases and prototype auth
internal/web/             Shared HTTP JSON and middleware helpers
compose.yaml              Local API and database services
Dockerfile                Production-style Go API image
plan/                     Local project brief files, ignored by git
```
