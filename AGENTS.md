# AGENTS.md

Guidance for coding agents working on Clicky-Store.

## Project Intent

Clicky-Store is an educational e-commerce web app for gaming and office mice. The project must satisfy the brief in `plan/plan.pdf`: REST API, product browsing, user registration/login, cart, orders, payment simulation or integration, admin management, responsive frontend, security basics, testing, and documentation.

## Stack

- Backend: Go
- Frontend: plain HTML/CSS/JavaScript
- Local runtime: Docker Compose
- Database target: PostgreSQL

Prefer standard library Go unless a dependency gives clear value. If adding dependencies, document why and keep them small.

## Current Architecture

- `cmd/server/main.go` contains HTTP routing, middleware, auth helpers, and handlers.
- `internal/store/store.go` contains domain models and the current in-memory store.
- `compose.yaml` runs the API and a PostgreSQL service. The API does not use PostgreSQL yet.

## Development Rules

- Keep commits small and meaningful.
- Run `gofmt` on Go files before committing when Go tooling is available.
- Run `go test ./...` before finalizing backend changes when Go tooling is available.
- Do not commit local `.env` files, generated build output, or the files under `plan/`.
- Preserve the existing REST shape unless a change is required by the project brief.
- Use JSON responses consistently, including error responses shaped as `{"error":"message"}`.
- Keep frontend work in plain HTML/CSS/JavaScript unless the user explicitly changes the stack.

## Backend Priorities

Next backend work should focus on:

- PostgreSQL persistence for users, products, carts, and orders
- Store interfaces so handlers do not depend on storage details
- Tests for auth, cart, order placement, and admin permissions
- Safer password hashing and token libraries for non-demo use
- Request validation helpers and clearer error reporting

## Security Notes

The current auth implementation is for a project prototype. Before production-style usage, replace the custom password derivation and token format with vetted libraries, rotate `AUTH_SECRET`, add HTTPS in deployment, and review CSRF/CORS behavior for the frontend host.
