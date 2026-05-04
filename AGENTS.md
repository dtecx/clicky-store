# AGENTS.md

Guidance for coding agents working on Clicky-Store.

## Project Intent

Clicky-Store is an educational e-commerce web app for gaming and office mice. The project must satisfy the brief in `plan/plan.pdf`: REST API, product browsing, user registration/login, cart, orders, payment simulation or integration, admin management, responsive frontend, security basics, testing, and documentation.

Treat the current application as a backend-first MVP that already has the main flows implemented. The next work should make it durable, testable, documented, and easier to maintain.

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

Do not migrate the frontend to React/Vue/Svelte unless the user explicitly changes the stack. The current project scope is better served by a clean plain JavaScript frontend with reusable helpers, templates, and shared rendering functions.

## Current Architecture

- `cmd/server/main.go` is the composition root: environment, logger, store adapter, service, HTTP handler, middleware, and server startup.
- `internal/core/domains` contains domain models and shared domain errors.
- `internal/core/ports` contains storage interfaces that service code depends on.
- `internal/service` contains application use cases, auth token handling, and password hashing for the prototype.
- `internal/adapters/db` contains the current in-memory database adapter. PostgreSQL should replace or sit beside this adapter.
- `internal/adapters/http/v1` contains REST v1 routing, auth middleware, request DTOs, and handlers.
- `internal/web` contains shared HTTP helpers such as JSON responses and middleware.
- `internal/frontend` contains the embedded frontend.
- `compose.yaml` runs the API and a PostgreSQL service. The API must be wired to PostgreSQL in the next major backend step.

## Development Rules

- Keep commits small and meaningful.
- Prefer branch-per-feature work.
- Run `gofmt` on Go files before committing when Go tooling is available.
- Run `go test ./...` before finalizing backend changes when Go tooling is available.
- Do not commit local `.env` files, generated build output, secrets, or files under `plan/`.
- Preserve the existing REST shape unless a change is required by the project brief.
- Use JSON responses consistently, including error responses shaped as `{"error":"message"}`.
- Keep frontend work in plain HTML/CSS/JavaScript unless the user explicitly changes the stack.
- Prefer incremental refactors over rewrites.
- After every meaningful step, leave the repository in a buildable and testable state.

## Git Workflow

Use focused branches and commits. Recommended branch order:

1. `feature/postgres-persistence`
2. `feature/auth-hardening`
3. `feature/payment-simulation`
4. `test/store-and-api-coverage`
5. `docs/api-documentation`
6. `refactor/frontend-templates`
7. `ci/basic-checks`
8. `chore/deployment-polish`

Example workflow:

```bash
git switch -c feature/postgres-persistence
go test ./...
git status
git add .
git commit -m "feat: add postgres persistence"
```

Avoid large mixed commits that combine database work, UI redesign, tests, and documentation at the same time.

## Updated Implementation Roadmap

### 1. PostgreSQL Persistence

Status: implemented.

PostgreSQL persistence is now available when `DATABASE_URL` is configured. The memory store remains useful for lightweight local development and tests. Future database work should focus on migration safety, persistence tests, rollback behavior, and query cleanup rather than reimplementing the adapter.

Add or update:

- `internal/adapters/db/postgres.go`
- `internal/adapters/db/migrations/`
- `internal/adapters/db/postgres_test.go`
- `cmd/server/main.go`
- `compose.yaml`
- `README.md`

Recommended tables:

- `users`
- `products`
- `carts`
- `cart_items`
- `orders`
- `order_items`

Important persistence rules:

- User accounts must survive server restart.
- Products and stock must survive server restart.
- Cart contents must survive server restart.
- Orders and order items must survive server restart.
- Order items should store a snapshot of product name and unit price, not only product IDs.
- Checkout must be transactional.
- Checkout must reduce stock exactly once.
- Checkout must fail cleanly when stock is insufficient.
- Cart clearing after checkout must happen in the same transaction as order creation.

`CreateOrderFromCart` must use a database transaction:

1. Start transaction.
2. Load cart items.
3. Lock product rows for the selected products.
4. Validate stock.
5. Insert order.
6. Insert order items.
7. Decrease product stock.
8. Clear cart.
9. Commit.

If any step fails, rollback.

Use `DATABASE_URL` for configuration.

### 2. Store Interface and Adapter Boundaries

Keep handlers and service code independent from storage details.

Rules:

- HTTP handlers must not import PostgreSQL-specific code.
- Service code should depend on interfaces from `internal/core/ports`.
- The PostgreSQL adapter should satisfy the same store behavior as the memory adapter.
- Shared behavior should be tested through store contract tests where practical.

Suggested files:

- `internal/core/ports/store.go`
- `internal/adapters/db/store_contract_test.go`
- `internal/adapters/db/memory.go`
- `internal/adapters/db/postgres.go`

### 3. Auth and Security Hardening

The current auth implementation is acceptable only as a project prototype.

Before presenting the project as production-style, replace or harden:

- Password hashing
- Token generation/validation
- Auth secret handling
- Seeded admin configuration
- Login error behavior
- CORS/CSRF assumptions

Recommended changes:

- Use a vetted password hashing library such as bcrypt or Argon2id.
- Require `AUTH_SECRET` from environment.
- Do not silently use weak default secrets in production mode.
- Move seeded admin credentials to environment variables.
- Add clear local-development defaults only for `APP_ENV=development`.
- Add basic login rate limiting if time allows.
- Keep authorization checks explicit for admin-only endpoints.

Recommended environment variables:

```yaml
APP_ENV: development
DATABASE_URL: postgres://clicky:clicky_dev_password@db:5432/clicky_store?sslmode=disable
AUTH_SECRET: change-me-for-local-development
ADMIN_EMAIL: admin@clicky.local
ADMIN_PASSWORD: admin12345
ADMIN_NAME: Clicky Admin
```

### 4. Payment Simulation Flow

The project brief allows payment simulation or real payment integration. Implement a clean simulation boundary instead of treating checkout as instantly paid.

Recommended flow:

- Creating an order should create an order with pending payment.
- A separate payment simulation endpoint should mark payment as paid or failed.
- Order status should reflect payment state.

Suggested endpoints:

```text
POST /api/v1/orders
POST /api/v1/orders/{orderId}/payment/simulate
```

Suggested states:

```text
order.status: pending | confirmed | cancelled | payment_failed
order.paymentStatus: pending | paid | failed
```

Rules:

- Do not integrate a real payment provider unless explicitly requested.
- Keep payment simulation isolated so a real provider can replace it later.
- Document clearly that payment is simulated for educational purposes.

### 5. Backend Validation and Error Handling

Improve request validation before adding many new features.

Add validation for:

- Product name
- Product slug
- Price
- Stock
- Cart quantity
- Email
- Password length
- Role value
- Order/payment state transitions

Rules:

- Return consistent JSON errors.
- Do not expose internal database errors to users.
- Use domain errors for expected failure cases.
- Keep error responses shaped as:

```json
{"error":"message"}
```

### 6. Tests and Quality Coverage

The project already has some tests. Expand coverage around edge cases and persistence.

Required test areas:

Auth:

- Register valid user
- Duplicate email
- Weak password
- Login success
- Login failure
- Invalid token
- Non-admin blocked from admin endpoints

Products:

- Product list
- Product details
- Unknown product
- Admin create/update/delete product
- Invalid product payload

Cart:

- Add product
- Update quantity
- Quantity below 1
- Quantity above stock
- Unknown product
- Clear cart

Orders:

- Empty cart checkout
- Successful checkout
- Stock reduction
- Insufficient stock
- User can see own orders
- User cannot see another user's orders
- Admin can list orders

Payment:

- Pending order payment simulation success
- Pending order payment simulation failure
- Invalid payment transition blocked

Database:

- PostgreSQL migrations apply cleanly
- Store behavior matches memory store behavior where possible
- Checkout transaction rolls back on failure

Run before finalizing backend changes:

```bash
gofmt -w .
go test ./...
go vet ./...
```

### 7. Frontend Refactor: Unified Parts and Templates

The frontend must not keep rewriting the same DOM code over and over again.

Before adding more screens, create shared frontend utilities and reusable rendering patterns.

Goals:

- Unify repeated card rendering.
- Unify repeated table rendering.
- Unify repeated form handling.
- Unify API fetch/error handling.
- Unify loading, empty, and error states.
- Reuse templates for product cards, order rows, cart rows, admin rows, and status badges.
- Avoid copy-pasted HTML strings scattered across many unrelated functions.

Recommended frontend structure:

```text
internal/frontend/static/
  index.html
  styles.css
  app.js
  js/
    api.js
    auth.js
    state.js
    templates.js
    render.js
    forms.js
    admin.js
    cart.js
    orders.js
    products.js
```

If keeping a single `app.js`, still split the code into clear sections:

- API client helpers
- State helpers
- Template helpers
- Rendering helpers
- Product UI
- Cart UI
- Order UI
- Admin UI
- Event binding

Frontend rules:

- Use one API helper for all requests.
- Use one auth header helper.
- Use one error display helper.
- Use one money formatting helper.
- Use one status badge helper.
- Use template functions instead of duplicating large HTML strings.
- Use event delegation where it simplifies repeated buttons.
- Keep CSS class names consistent.
- Keep responsive behavior simple and testable.
- Do not introduce a frontend framework unless explicitly requested.

Example template direction:

```js
function productCardTemplate(product) {
  return `
    <article class="card product-card" data-product-id="${escapeHtml(product.id)}">
      <img src="${escapeAttr(product.imageUrl)}" alt="${escapeAttr(product.name)}">
      <h3>${escapeHtml(product.name)}</h3>
      <p>${formatMoney(product.priceCents, product.currency)}</p>
      ${stockBadgeTemplate(product.stock)}
      <button data-action="add-to-cart" data-product-id="${escapeAttr(product.id)}">
        Add to cart
      </button>
    </article>
  `;
}
```

All template helpers must escape user-controlled content.

### 8. Frontend UX Polish

After the frontend is refactored into reusable helpers/templates, improve UX.

Customer-facing improvements:

- Product detail section or product detail page.
- Better empty states.
- Stock badges.
- Disabled add-to-cart button for out-of-stock products.
- Cart quantity validation.
- Checkout summary.
- Order detail view.
- Payment status feedback.
- Mobile layout review.

Admin improvements:

- Product search/filter.
- Order filtering by status.
- User filtering by role/search.
- Safer delete confirmation.
- Clear admin-only navigation.
- Better validation messages in admin forms.

Do not prioritize visual polish before persistence, auth hardening, and tests.

### 9. API Documentation

Add documentation that makes the project easy to evaluate.

Recommended files:

- `docs/openapi.yaml`
- `docs/api-examples.md`
- `docs/development.md`
- `docs/deployment.md`

Document:

- Auth endpoints
- Product endpoints
- Cart endpoints
- Order endpoints
- Payment simulation endpoint
- Admin endpoints
- Error format
- Required environment variables
- Local development commands
- Test commands
- Docker Compose startup
- Seeded admin behavior

### 10. CI and Automation

Add GitHub Actions after the main persistence and test work.

Recommended file:

```text
.github/workflows/ci.yml
```

CI should run:

- `gofmt` check
- `go test ./...`
- `go vet ./...`
- Docker build

Example local equivalent:

```bash
test -z "$(gofmt -l .)"
go test ./...
go vet ./...
docker build -t clicky-store:test .
```

### 11. Docker and Deployment Polish

Improve Docker Compose and runtime configuration after PostgreSQL is wired in.

Recommended Compose improvements:

- PostgreSQL healthcheck.
- API waits for database health.
- `DATABASE_URL` configured for the server.
- `AUTH_SECRET` configured through environment.
- Local dev defaults are documented.
- No secrets are committed.
- Optional `.env.example`.

Recommended files:

- `.env.example`
- `docs/deployment.md`

Deployment notes should mention:

- HTTPS/TLS should be used in real deployment.
- Reverse proxy can terminate TLS.
- Production secrets must be changed.
- Database volume must be backed up.
- Admin password must not use the local demo value.

## Backend Priorities

Immediate backend work should focus on:

1. PostgreSQL persistence for users, products, carts, and orders.
2. Transactional checkout.
3. Store contract tests.
4. Safer password hashing and token handling.
5. Payment simulation endpoint.
6. Request validation helpers.
7. Clearer domain errors.
8. API documentation.

## Frontend Priorities

Immediate frontend work should focus on:

1. Reusable API client helper.
2. Reusable template/render helpers.
3. Shared form handling.
4. Shared status badge rendering.
5. Shared loading/error/empty states.
6. Product detail UI.
7. Cart/order UX polish.
8. Admin filtering and safer admin forms.
9. Responsive layout review.

Frontend code must be treated as application code, not as a pile of one-off scripts. If a UI pattern appears more than once, extract it into a helper or template.

## Security Notes

The current auth implementation is for a project prototype. Before production-style usage:

- Replace custom password derivation with a vetted password hashing library.
- Replace or harden custom token handling.
- Rotate `AUTH_SECRET`.
- Require HTTPS/TLS in deployment.
- Review CORS behavior.
- Review CSRF behavior for the frontend host.
- Escape all frontend template output.
- Avoid storing secrets in source code.
- Avoid leaking internal errors in API responses.

## Definition of Done

A feature is not done until:

- It has clear backend behavior.
- It has validation and error handling.
- It has tests where practical.
- It does not break existing REST flows.
- It keeps storage details outside handlers.
- It keeps frontend duplication under control.
- It is documented if it changes setup, API behavior, or user-visible behavior.
- `go test ./...` passes when Go tooling is available.
- The app still starts with Docker Compose when Docker tooling is available.

## Recommended Final Project Checklist

Before final submission or presentation:

- PostgreSQL persistence works.
- Server restart does not erase users/products/carts/orders.
- Register/login works.
- Customer can browse products.
- Customer can view product details.
- Customer can manage cart.
- Customer can place order.
- Payment simulation works.
- Admin can manage products.
- Admin can manage orders.
- Admin can manage users.
- Responsive frontend works on mobile width.
- Tests pass.
- API documentation exists.
- README explains setup and usage.
- Docker Compose starts the full system.
- Security limitations are honestly documented.
