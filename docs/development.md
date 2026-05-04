# Development

## Requirements

- Go 1.25 or newer
- Docker Compose

## Local Setup

Copy the example environment file if you want to override defaults:

```sh
cp .env.example .env
```

Start PostgreSQL and the API:

```sh
docker compose up --build
```

The storefront and API are served from:

```txt
http://localhost:8080
```

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

The GitHub Actions workflow runs the formatting check, tests, vet, and Docker build on pushes to `main` and pull requests.

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
- Keep frontend code in plain HTML, CSS, and JavaScript.
- Do not commit `.env`, generated build output, `data/`, or files under `plan/`.
