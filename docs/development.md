# Development

## Requirements

- Go 1.25 or newer
- Node.js 22 or newer
- npm
- Docker Compose

## Local Setup

Copy the example environment file if you want to override defaults:

```sh
cp .env.example .env
```

Start PostgreSQL, build the React frontend, and run the Go server:

```sh
docker compose up --build
```

The React storefront and API are served from:

```txt
http://localhost:8080
```

For UI development, run Vite separately while the Go server handles the API:

```sh
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api`, `/assets`, `/uploads`, and `/healthz` to `http://localhost:8080`.

To test the production-style Go static serving path locally without Docker:

```sh
cd frontend
npm run build
cd ..
FRONTEND_DIST_DIR=frontend/dist go run ./cmd/server
```

When `FRONTEND_DIST_DIR` is set, Go serves the Vite build and falls back to React `index.html` for frontend routes such as `/products/viper-x1-gaming-mouse` or `/admin/products`. If it is not set, the embedded legacy static frontend is still available as a temporary fallback during the migration.

The default development admin account is:

```txt
email: admin@clicky.local
password: admin12345
```

## Storage Modes

When `DATABASE_URL` is set, the server uses PostgreSQL and runs embedded migrations on startup.

When `DATABASE_URL` is empty, the server falls back to the in-memory store. Use that only for lightweight local development or tests, because data is lost on restart.

## Useful Commands

Run tests:

```sh
go test ./...
```

Run vet:

```sh
go vet ./...
```

Check formatting:

```sh
test -z "$(gofmt -l .)"
```

Build the Docker image:

```sh
docker build -t clicky-store:test .
```

Run frontend checks:

```sh
cd frontend
npm run lint
npm run typecheck
npm run build
```

The GitHub Actions workflow runs the formatting check, tests, vet, frontend lint/build, and Docker build on pushes to `main` and pull requests.

Render the final Compose configuration:

```sh
docker compose config
```

Run store contract tests against local PostgreSQL:

```sh
TEST_DATABASE_URL="postgres://clicky:clicky_dev_password@localhost:5432/clicky_store?sslmode=disable" \
  go test ./internal/adapters/db -run StoreContract -count=1
```

If an old local `data/postgresql` directory is corrupt, use a temporary data path rather than deleting local data blindly:

```sh
POSTGRES_DATA_PATH=/private/tmp/clicky-store-pgdata docker compose up -d db
```

## Project Notes

- Keep handlers independent from database details.
- Keep service code depending on `internal/core/ports`.
- Keep new frontend code in `frontend/` with React, Vite, TypeScript, and Tailwind CSS.
- Keep the legacy embedded frontend until React plus uploaded image support fully replace it.
- Do not commit `.env`, generated build output, `frontend/dist/`, `frontend/node_modules/`, `data/`, or files under `plan/`.
