# Clicky-Store

Clicky-Store is a small e-commerce project for gaming and office mice. It is built as a client-server web store with a REST API, user accounts, product browsing, cart management, order placement, simulated payment handling, admin management, responsive UI, security basics, testing, and documentation.

This repository is starting with the backend and container foundation using:

- Go for the HTTP API
- Docker Compose for local services
- React, Vite, TypeScript, and Tailwind CSS for the storefront and admin UI
- PostgreSQL in Compose for durable persistence

## Current Status

Implemented features:

- Public product listing, search/filtering, and product details by ID or slug
- Customer registration and login
- HMAC-signed bearer tokens
- Basic login rate limiting
- Authenticated profile endpoint
- Authenticated cart operations
- Authenticated order creation with pending simulated payment status
- Authenticated payment simulation for pending orders
- Admin product management
- Admin JPEG/PNG product image upload, metadata editing, primary-image selection, reordering, and deletion
- Admin order listing
- Admin user listing, inspection, and role updates
- React storefront for browsing, product galleries, auth, cart, checkout, orders, and admin screens
- Polished responsive storefront and admin layout using Tailwind CSS
- Health check endpoint
- Multi-stage Dockerfile and `compose.yaml`
- GitHub Actions CI for format checks, tests, vet, and Docker build
- PostgreSQL persistence for users, products, product galleries, carts, and orders when `DATABASE_URL` is set
- Local upload storage served under `/uploads`
- Go production serving for the React build with SPA route fallback
- Optional validated demo catalog seed from `init/init.json` and local JPG/PNG files under `init/img/`

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

Uploaded product files are stored outside the React build. Docker Compose mounts `${UPLOAD_DATA_PATH:-./data/uploads}` into `/app/data/uploads`, and the server publishes generated image URLs under `/uploads`. Uploads accept JPEG and PNG only, with default limits of 10 images per product, 4 MiB per image, and 48 MiB per multipart request.

## Demo Catalog Init

Phase 19 uses a curated JSON init file instead of a live scraper. `init/init.json` defines 10 demo mice with Polish descriptions, PLN prices, product specs, and relative image paths such as:

```txt
img/logitech-mx-master-3s/1.jpg
```

Add local images under `init/img/{slug}/`. They must be JPG or PNG files, match the JSON paths, and decode as real images. The server validates the full catalog before seeding; if any required field or image is wrong, the original four fallback products remain in use.

Validate the catalog manually after adding images:

```sh
go run ./cmd/initcatalog -path init/init.json
```

Local files under `init/img/` are ignored by Git. Compose mounts `${INIT_DATA_PATH:-./init}` into `/app/init`, and the Docker image also copies the `init/` directory for production-style demos.

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
GET  /api/v1/products/slug/{slug}
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
POST   /api/v1/admin/products/{productId}/images
PATCH  /api/v1/admin/products/{productId}/images/order
PATCH  /api/v1/admin/products/{productId}/images/{imageId}
DELETE /api/v1/admin/products/{productId}/images/{imageId}
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

Get a product by slug:

```sh
curl http://localhost:8080/api/v1/products/slug/viper-x1-gaming-mouse
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

- Define an uploaded-image cleanup policy on product/image deletion
- Expand mouse-specific product specs such as sensor, weight, switch type, polling rate, dimensions, and accessories
- Add real demo photos under `init/img/` for the Phase 19 catalog

## Project Structure

```txt
cmd/server/               Go HTTP server composition root
cmd/initcatalog/          Manual validator for init/init.json and referenced images
internal/adapters/db/     Current in-memory database adapter
internal/adapters/db/postgres PostgreSQL adapter and embedded migrations
internal/adapters/http/v1 REST API v1 handlers and request DTOs
internal/adapters/uploads Local product image upload storage
internal/core/domains/    Domain models and shared domain errors
internal/core/ports/      Storage interfaces
internal/frontend/        React build serving adapter (FRONTEND_DIST_DIR aware)
internal/initcatalog/     Validated demo catalog loader and seeder
internal/service/         Application use cases and auth helpers
internal/web/             Shared HTTP JSON and middleware helpers
init/                     Phase 19 demo catalog JSON and ignored image source folder
frontend/                 React + Vite + TypeScript + Tailwind source app
frontend/public/assets/products Seed product SVGs included in the Vite build
compose.yaml              Local API and database services
Dockerfile                Multi-stage React and Go production image
```
