# AGENTS.md

Guidance for coding agents working on Clicky-Store.

## Project Intent

Clicky-Store is an educational e-commerce web app for gaming and office mice. The project must satisfy the brief in `plan/plan.pdf`: REST API, product browsing, user registration/login, cart, orders, payment simulation or integration, admin management, responsive frontend, security basics, testing, and documentation.

## Plan Brief Requirements

Use this summary before opening `plan/plan.pdf`; only inspect the PDF when exact wording or academic formatting is needed.

- Build a modern client-server e-commerce web system for selling products online.
- Provide an intuitive UI, secure transaction flow, and a structure that can scale.
- Core customer features: registration, login, product browsing, product detail views, cart management, order placement, and online payment handling by simulation or payment API integration.
- Core admin features: product management, order management, and user management.
- Technical requirements: REST API, database-backed persistence for products/users/orders, authorization/authentication, responsive frontend (RWD), and protection of user data.
- Business logic requirements: purchase flow handling, data validation, order processing, payment preparation, error handling, and edge-case handling.
- Frontend scope: product list, product details, cart, login form, and registration form, adapted to mobile devices.
- Testing and quality scope: API testing, functional/end-to-end testing, user behavior simulation, performance review, database query optimization, app load-time optimization, final refactor, launch instructions, and project documentation.
- Security topics from the brief: SSL/TLS in deployment, JWT/OAuth-style auth, and protection against XSS/CSRF-style attacks.

## Stack

- Backend: Go
- Frontend: plain HTML/CSS/JavaScript
- Local runtime: Docker Compose
- Database target: PostgreSQL

Prefer standard library Go unless a dependency gives clear value. If adding dependencies, document why and keep them small.

## Current Architecture

- `cmd/server/main.go` is the composition root: environment, logger, store adapter, service, HTTP handler, middleware, and server startup.
- `internal/core/domains` contains domain models and shared domain errors.
- `internal/core/ports` contains storage interfaces that service code depends on.
- `internal/service` contains application use cases, auth token handling, and password hashing for the prototype.
- `internal/adapters/db` contains the current in-memory database adapter. PostgreSQL should replace or sit beside this adapter later.
- `internal/adapters/http/v1` contains REST v1 routing, auth middleware, request DTOs, and handlers.
- `internal/web` contains shared HTTP helpers such as JSON responses and middleware.
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
