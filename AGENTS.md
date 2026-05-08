# AGENTS.md

Guidance for coding agents working on **Clicky-Store**.

This file is the source of truth for future AI/code-agent work in this repository. Keep it accurate when the project structure, stack, or implementation plan changes.

---

## Project Intent

Clicky-Store is an educational e-commerce web application for gaming and office mice.

The project should satisfy the expected online-shop requirements:

- Client-server web application.
- REST API.
- User registration and login.
- Product browsing.
- Dedicated product detail pages.
- Shopping cart.
- Order placement.
- Simulated payment flow.
- Admin product, order, and user management.
- PostgreSQL-backed persistence.
- Responsive UI.
- Basic security practices.
- Tests and documentation.
- Docker-based local/deployment workflow.

The backend is already more than a skeleton. Treat the current repository as a working MVP with persistence, auth, customer flows, admin flows, docs, CI, and an embedded static frontend.

The next major direction is to turn the UI into a real e-shop frontend using:

```text
React + Vite + TypeScript + Tailwind CSS
```

Do not continue the old Bootstrap-only plan unless the user explicitly reverses this decision.

---

## Current Verified State

The repository currently has:

- Go backend using `net/http`.
- REST API under `internal/adapters/http/v1`.
- Domain models under `internal/core/domains`.
- Store interfaces under `internal/core/ports`.
- Application logic under `internal/service`.
- PostgreSQL adapter under `internal/adapters/db/postgres`.
- In-memory store fallback when `DATABASE_URL` is empty.
- Embedded PostgreSQL migrations.
- Docker Compose with API and PostgreSQL services.
- `internal/config` for environment loading and production secret validation.
- Bcrypt password hashing through `golang.org/x/crypto`.
- `pgx` PostgreSQL driver.
- Public product listing and product details.
- Customer registration and login.
- HMAC-signed bearer-token style auth.
- Login failure rate limiting.
- Authenticated profile, cart, order, and payment simulation flows.
- Admin product, order, and user management.
- API, development, and deployment documentation.
- GitHub Actions CI for formatting, tests, vet, frontend lint/build, and Docker build.
- Embedded frontend served from `internal/frontend/static`.
- React + Vite + TypeScript + Tailwind CSS app in `frontend/`, with typed API helpers, auth state, backend-backed product listing/detail, cart, checkout, customer orders, and admin dashboard/product/order/user flows.
- React admin pages are backend-backed for dashboard metrics, product CRUD, order browsing/filtering, user browsing/filtering, and guarded role updates.
- Seed/demo product images currently stored as embedded SVG assets.

Important frontend limitation:

The production-served frontend is still an embedded single-page static UI with custom HTML/CSS/JavaScript. The React app now covers the main customer storefront, auth, cart, checkout, customer order flow, and backend-backed admin flows, but it does not yet have uploaded image handling or production serving from Go.

---

## Non-Negotiable Development Rules

- Keep commits small, focused, and meaningful.
- Prefer one feature branch per large work area.
- Do not mix database migrations, API changes, UI migration, docs, and Docker changes in one giant commit.
- Keep the repository buildable and testable after every meaningful step.
- Run `gofmt` on Go files before committing.
- Run `go test ./...` before finalizing backend changes.
- Run `go vet ./...` before finalizing backend changes when Go tooling is available.
- Run frontend build/type/lint checks once the React frontend exists.
- Do not commit `.env`, generated build output, secrets, `data/`, uploaded product images, database files, or files under `plan/`.
- Do not commit `frontend/dist/` unless the repository intentionally changes to committed static assets. Prefer Docker/CI builds.
- Keep handlers independent from PostgreSQL details.
- Keep service code dependent on interfaces from `internal/core/ports`.
- Preserve the existing REST API shape unless a deliberate versioned change is required.
- Return consistent JSON errors shaped as `{"error":"message"}`.
- Escape or safely render all user-controlled frontend content.
- Do not store uploaded files inside `internal/frontend/static/assets/products`; that directory is only for seed/demo embedded assets.
- New product images must be uploaded through the admin UI/API and stored in a runtime upload directory.
- Do not add Next.js. The backend is Go and the frontend should be a Vite SPA unless the user explicitly requests otherwise.
- Do not rewrite backend and frontend at the same time.
- Do not delete the old static frontend until the React frontend has working replacements for the customer and admin flows.

---

## Frontend Direction

Use:

```text
React + Vite + TypeScript + Tailwind CSS
```

Recommended supporting frontend libraries:

```text
react-router-dom
lucide-react
clsx
```

Optional later libraries:

```text
react-hook-form
zod
zustand
```

Avoid adding optional libraries until they solve a real problem. Plain React state and typed API helpers are enough for the first migration phase.

### Why React Now

The project is already complex enough that plain JavaScript plus Bootstrap would still leave too much manual DOM/state management.

The frontend now needs:

- Dedicated product pages.
- Product image galleries.
- Admin image upload with drag-and-drop and previews.
- Auth state.
- Cart state.
- Checkout state.
- Payment simulation state.
- Admin product forms.
- Admin user/order tables.
- Loading/error/empty states.
- Route-based pages.
- Reusable layouts and UI parts.

Bootstrap mainly solves styling. React solves structure, state, routing, and reusable UI.

### Tailwind Usage Rules

Use Tailwind as the main styling layer.

Do:

- Use Tailwind utility classes for layout and components.
- Keep shared UI as React components.
- Use small helper functions for class composition where useful.
- Keep global CSS minimal.
- Use responsive utilities deliberately.

Do not:

- Recreate a huge handwritten CSS design system.
- Scatter repeated long class strings everywhere if a component would be cleaner.
- Use Bootstrap and Tailwind together as competing layout systems.
- Add a large component library unless the user asks.

---

## Target Architecture

Current backend should remain Go.

Target frontend should live outside `internal/frontend/static`:

```text
frontend/
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    api/
      client.ts
      auth.ts
      products.ts
      cart.ts
      orders.ts
      admin.ts
      uploads.ts
    components/
      layout/
        Header.tsx
        Footer.tsx
        PageShell.tsx
        ProtectedRoute.tsx
        AdminRoute.tsx
      ui/
        Button.tsx
        Card.tsx
        Badge.tsx
        Input.tsx
        Select.tsx
        Modal.tsx
        Toast.tsx
        EmptyState.tsx
        LoadingState.tsx
        ErrorState.tsx
      product/
        ProductCard.tsx
        ProductGrid.tsx
        ProductGallery.tsx
        ProductSpecs.tsx
        ProductPrice.tsx
        ProductStockBadge.tsx
      cart/
        CartLine.tsx
        CartSummary.tsx
      checkout/
        CheckoutSummary.tsx
      forms/
        FormField.tsx
        ImageUploader.tsx
      admin/
        AdminLayout.tsx
        ProductEditor.tsx
        ProductTable.tsx
        ProductImageManager.tsx
        OrderTable.tsx
        UserTable.tsx
    pages/
      HomePage.tsx
      ProductPage.tsx
      CartPage.tsx
      CheckoutPage.tsx
      OrdersPage.tsx
      LoginPage.tsx
      RegisterPage.tsx
      AdminDashboardPage.tsx
      AdminProductsPage.tsx
      AdminOrdersPage.tsx
      AdminUsersPage.tsx
      NotFoundPage.tsx
    state/
      authStore.tsx
      cartStore.tsx
    types/
      api.ts
      product.ts
      order.ts
      user.ts
    utils/
      money.ts
      dates.ts
      slugs.ts
      errors.ts
```

The Go server should eventually serve the React build output.

Recommended final static serving direction:

```text
frontend/dist/             generated by Vite
internal/frontend/dist/    optional copy target during Docker build
```

Do not keep long-term application code inside one giant `app.js`.

---

## Current Architecture

```text
cmd/server/                         Go HTTP server composition root
internal/config/                    Environment loading and validation
internal/core/domains/              Domain models, constants, validation, shared domain errors
internal/core/ports/                Store interfaces
internal/service/                   Application use cases, auth, password hashing
internal/adapters/db/               In-memory store and store contract tests
internal/adapters/db/postgres/      PostgreSQL store, helpers, migrations
internal/adapters/http/v1/          REST API v1 handlers, requests, auth middleware, rate limiting
internal/frontend/                  Embedded frontend handler and static files
internal/frontend/static/           Current legacy HTML/CSS/JS and embedded demo assets
frontend/                           React + Vite + TypeScript + Tailwind source app
internal/web/                       Shared HTTP JSON, CORS, logging, middleware helpers
docs/                               API, development, and deployment documentation
compose.yaml                        Local API and PostgreSQL services
Dockerfile                          Production-style Go API image
.github/workflows/ci.yml            CI checks
```

Target architecture after React migration:

```text
frontend/                           React + Vite + TypeScript + Tailwind source app
internal/frontend/                  Go static frontend serving adapter
internal/frontend/static/           Temporary legacy frontend until removed
internal/frontend/dist/             Optional copied React build output
```

---

## Current Implemented Feature Baseline

Customer-facing features:

- Browse products.
- Filter/search products.
- View basic product details.
- Register and log in.
- View current profile/session.
- Manage cart.
- Place order from cart.
- Simulate order payment success or failure.
- View own orders.

Admin-facing features:

- Create, update, and delete products.
- List orders.
- List users.
- Inspect and update user roles.
- Use seeded local admin account in development.

Backend/platform features:

- PostgreSQL persistence for users, products, carts, and orders when `DATABASE_URL` is configured.
- In-memory fallback for lightweight development/tests.
- Transactional checkout behavior in store implementations.
- Store contract tests.
- Bcrypt password hashing.
- Config validation for non-development secrets.
- Login rate limiting.
- Docker Compose local environment.
- CI for Go formatting, tests, vet, and Docker image build.

---

## Known Gaps and Technical Debt

Address these before adding unrelated features:

1. Product media is still based around a single `imageUrl` field.
2. Demo product images are embedded SVG files under static assets.
3. There is no admin drag-and-drop/select image upload flow.
4. There is no runtime upload directory or uploaded file serving.
5. There is no product image gallery model.
6. There is no limit of up to 10 images per product.
7. Go production serving still needs to serve React product routes on direct reload.
8. Admin product/order/user pages are backend-backed in React, but image management is still pending.
9. Product detail pages need richer gallery/spec/related-product polish once product images exist.
10. Product specs are too limited for a real mouse shop.
11. Documentation must be updated whenever API, environment, upload storage, Docker workflow, or frontend workflow changes.

---

## Target E-Shop UX

The storefront should feel like an actual online shop, not only an API demo.

Required customer UI areas:

- Header/navbar with logo, search, cart badge, account/login state, and admin link for admins.
- Home/store page with hero section.
- Product category/filter/sorting controls.
- Product grid with cards.
- Product cards with main image, price, stock badge, short specs, and quick add-to-cart.
- Dedicated product detail page for every mouse.
- Product gallery with main image and thumbnails.
- Product description and specs table.
- Add-to-cart controls with disabled/out-of-stock behavior.
- Cart page with image thumbnails, quantity controls, totals, and checkout action.
- Checkout page with order summary.
- Orders page with order cards and payment simulation action for pending orders.
- Responsive mobile/tablet/desktop layout.
- Loading, empty, and error states for every page.

Required admin UI areas:

- Admin layout/sidebar or clearly separated admin dashboard.
- Product table/cards with search/filter.
- Product create/edit form.
- Drag-and-drop/select image uploader for product images.
- Product image preview gallery with delete/reorder/primary-image behavior.
- Orders table with status badges and filtering.
- Users table with role filtering and safe role updates.
- Clear destructive action confirmations.

---

## Dedicated Product Page Requirements

Every mouse must have its own dedicated product page.

Preferred frontend route:

```text
/products/:slug
```

Implementation notes:

- Use `react-router-dom`.
- Update the Go frontend handler so product routes can reload and still serve the React `index.html`.
- Keep `/api/v1/...`, `/healthz`, `/assets/...`, and `/uploads/...` separate from frontend route fallback.
- Add product lookup by slug or ensure the frontend can load product detail directly without downloading all products first.
- Keep product ID stable for API mutations.
- Use slug for customer-facing URLs.

Minimum product page content:

- Breadcrumbs: Home / Category / Product name.
- Image gallery: main image plus thumbnails.
- Product title.
- Price and currency.
- Stock status.
- Add-to-cart button.
- Quantity selector.
- Short selling points.
- Full description.
- Specs table.
- Similar/related products if practical.
- Admin edit shortcut for admin users.

---

## Product Image Upload Requirements

Build an admin-only image upload feature so the user does not need to manually copy mouse image files into `assets`.

Functional rules:

- Admin can drag and drop images.
- Admin can also use a normal file picker.
- Accept only JPEG and PNG.
- Reject SVG, WebP, GIF, PDF, executable files, and unknown MIME types for uploaded product media.
- Maximum 10 images per product.
- Recommended max file size: 4 MiB per image.
- Recommended max multipart request size: 48 MiB.
- Use both extension checks and MIME/content sniffing.
- Decode image headers/config server-side to confirm the file is a real image.
- Generate server-side filenames.
- Never trust original filenames.
- Store only safe metadata in the database.
- Store files outside embedded frontend assets, for example `./data/uploads/products`.
- Serve uploaded files under a public URL prefix, for example `/uploads/products/...`.
- Do not allow path traversal.
- Do not expose local filesystem paths in API responses.
- Make upload validation errors clear in the UI.
- Keep old images unless explicitly deleted.
- Deleting a product should either delete its image metadata and files or clearly document orphan cleanup behavior.

Suggested environment variables:

```text
UPLOAD_DIR=./data/uploads
UPLOAD_URL_PREFIX=/uploads
MAX_PRODUCT_IMAGES=10
MAX_PRODUCT_IMAGE_BYTES=4194304
MAX_PRODUCT_UPLOAD_BYTES=50331648
```

Suggested Docker/Compose volume:

```yaml
${UPLOAD_DATA_PATH:-./data/uploads}:/app/data/uploads
```

The server should create the upload directory on startup if it does not exist.

---

## Product Image Data Model

Add product image support without breaking existing products.

Suggested Go domain model:

```go
type ProductImage struct {
    ID        string    `json:"id"`
    ProductID string    `json:"productId"`
    URL       string    `json:"url"`
    AltText   string    `json:"altText"`
    SortOrder int       `json:"sortOrder"`
    IsPrimary bool      `json:"isPrimary"`
    CreatedAt time.Time `json:"createdAt"`
}
```

Suggested product model direction:

```go
type Product struct {
    ID          string         `json:"id"`
    Name        string         `json:"name"`
    Slug        string         `json:"slug"`
    Description string         `json:"description"`
    Category    string         `json:"category"`
    PriceCents  int            `json:"priceCents"`
    Currency    string         `json:"currency"`
    DPI         int            `json:"dpi"`
    Wireless    bool           `json:"wireless"`
    Ergonomic   bool           `json:"ergonomic"`
    Stock       int            `json:"stock"`
    ImageURL    string         `json:"imageUrl"` // temporary compatibility fallback
    Images      []ProductImage `json:"images"`
    CreatedAt   time.Time      `json:"createdAt"`
    UpdatedAt   time.Time      `json:"updatedAt"`
}
```

Keep `ImageURL` temporarily as a compatibility/fallback field. Prefer `Images` for new React UI code. Remove `ImageURL` only after UI, API docs, tests, and seed data no longer depend on it.

Suggested migration:

```text
internal/adapters/db/postgres/migrations/000002_product_images.up.sql
internal/adapters/db/postgres/migrations/000002_product_images.down.sql
```

Suggested table shape:

```sql
CREATE TABLE product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX product_images_product_id_sort_idx
    ON product_images (product_id, sort_order, created_at);
```

Optional migration behavior:

- Convert existing `products.image_url` into one `product_images` row per product.
- Keep `products.image_url` synced to the primary image until compatibility cleanup is done.

---

## Suggested API Additions

Keep existing API endpoints stable.

Add these endpoints:

```text
GET    /api/v1/products/slug/{slug}
POST   /api/v1/admin/products/{productId}/images
PATCH  /api/v1/admin/products/{productId}/images/order
PATCH  /api/v1/admin/products/{productId}/images/{imageId}
DELETE /api/v1/admin/products/{productId}/images/{imageId}
```

Upload endpoint:

```text
POST /api/v1/admin/products/{productId}/images
Content-Type: multipart/form-data
field name: images
```

Recommended response:

```json
{
  "images": [
    {
      "id": "img_...",
      "productId": "prod_...",
      "url": "/uploads/products/...",
      "altText": "Viper X1 Gaming Mouse",
      "sortOrder": 0,
      "isPrimary": true,
      "createdAt": "..."
    }
  ]
}
```

Validation rules:

- Non-admin users receive `403`.
- Unauthenticated users receive `401`.
- Unknown product receives `404`.
- More than 10 total product images receives `400`.
- Invalid file type receives `400`.
- Oversized file receives `400`.
- Internal storage/database failure receives `500` with a safe error message.

---

## React Frontend Implementation Rules

- Use TypeScript.
- Define API response types in `frontend/src/types`.
- Keep one small API client wrapper in `frontend/src/api/client.ts`.
- Keep auth token handling in one place.
- Use React Router for pages.
- Use reusable layout components.
- Use reusable UI components.
- Use feature-specific components for product/cart/order/admin areas.
- Avoid repeated API fetch logic across pages.
- Avoid repeated product card/order row/cart line markup.
- Keep forms readable and typed.
- Show loading, error, and empty states explicitly.
- Do not put business rules only in the frontend; backend remains authoritative.
- Keep frontend validation user-friendly but duplicate critical checks on the backend.
- Do not use `dangerouslySetInnerHTML` unless there is a very strong reason.
- Use Tailwind for layout and styling.
- Keep `src/index.css` small and mostly for Tailwind directives/global defaults.

Suggested initial frontend commands:

```sh
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom lucide-react clsx
npm install -D tailwindcss @tailwindcss/vite
```

Use the current Tailwind/Vite setup recommended by the installed Tailwind version. Do not copy outdated Tailwind configuration blindly.

---

## React Frontend Environment

Recommended frontend environment variable:

```text
VITE_API_BASE_URL=/api/v1
```

For local dev with Vite proxy, configure `frontend/vite.config.ts` so API calls can proxy to the Go server.

Suggested dev flow:

```text
Terminal 1: docker compose up db
Terminal 2: go run ./cmd/server
Terminal 3: cd frontend && npm run dev
```

Suggested final production flow:

```text
Docker builds React frontend.
Docker builds Go backend.
React dist is copied into the final Go image.
Go serves the React app and API from one container.
```

---

## Dockerfile Direction

Current Dockerfile should be converted into a multi-stage build when React is added.

Recommended stages:

```text
frontend-build:
  node:22-alpine
  workdir /src/frontend
  npm ci
  npm run build

backend-build:
  golang image
  go test optional only in CI, not necessarily in Docker build
  go build ./cmd/server

runtime:
  copy Go binary
  copy frontend dist to a path served by internal/frontend
```

Do not rely on a globally installed Node or Vite inside the Go image.

---

## Implementation Roadmap

### Phase 0: Sanity Check Current Repo

Goal: verify baseline before rewriting UI or adding image uploads.

Run:

```sh
git status --short
go test ./...
go vet ./...
docker compose config
```

Commit only if files change.

---

### Phase 1: Rewrite `AGENTS.md`

Goal: document the React direction and remove the old Bootstrap-first plan.

Suggested commit:

```sh
git add AGENTS.md
git commit -m "docs: switch frontend roadmap to react"
```

---

### Phase 2: Add React App Skeleton

Goal: add Vite React TypeScript app without replacing the old frontend yet.

Suggested changes:

- Add `frontend/`.
- Add React + TypeScript + Vite.
- Add Tailwind.
- Add React Router.
- Add basic app shell.
- Add placeholder pages.
- Add `npm` scripts.
- Update `.gitignore`.
- Update CI to build frontend.
- Do not remove `internal/frontend/static` yet.

Suggested commit:

```sh
git add frontend .gitignore .github/workflows/ci.yml
git commit -m "feat: add react frontend skeleton"
```

---

### Phase 3: Add Typed API Client

Goal: connect React to existing API without changing backend behavior.

Suggested changes:

- Add `frontend/src/api/client.ts`.
- Add typed auth/products/cart/orders/admin API modules.
- Add shared error normalization.
- Add API response types.
- Use `VITE_API_BASE_URL`.
- Add loading/error helpers.

Suggested commit:

```sh
git add frontend/src
git commit -m "feat: add typed frontend api client"
```

---

### Phase 4: Rebuild Auth and Layout

Goal: make login/register/session state work in React.

Suggested changes:

- Add `AuthProvider`.
- Add login page.
- Add register page.
- Add logout.
- Add protected route helper.
- Add admin route helper.
- Add header/navbar with account/cart/admin state.

Suggested commit:

```sh
git add frontend/src
git commit -m "feat: rebuild auth flow in react"
```

---

### Phase 5: Rebuild Product Listing

Goal: replace product browsing UI in React.

Suggested changes:

- Add home/store page.
- Add product grid.
- Add reusable product cards.
- Add search/filter/sort UI.
- Add stock and price badges.
- Add quick add-to-cart.
- Add loading/empty/error states.

Suggested commit:

```sh
git add frontend/src
git commit -m "feat: rebuild product listing in react"
```

---

### Phase 6: Add Product Slug Routes

Goal: every mouse gets a dedicated reloadable page.

Current status: backend slug lookup and the React `/products/:slug` route exist. Go production serving for direct React route reloads still belongs to Phase 10.

Suggested backend changes:

- Add slug field if missing.
- Add slug generation/validation.
- Add store lookup by slug or API support for lookup by slug.
- Add `GET /api/v1/products/slug/{slug}`.
- Add tests for slug lookup and not-found behavior.
- Update frontend fallback so direct reload of `/products/{slug}` serves React `index.html`.

Suggested frontend changes:

- Add `/products/:slug` route.
- Link product cards to product pages.
- Add product detail page shell.

Suggested commit:

```sh
git add internal frontend docs
git commit -m "feat: add product slug routes"
```

---

### Phase 7: Build Product Detail Page

Goal: make product pages look like actual e-shop pages.

Current status: initial React product detail page exists with slug fetch, fallback image, price, stock, quantity, add-to-cart, specs, and admin shortcut. Gallery/related-product polish should wait for product image support.

Suggested changes:

- Product gallery area with fallback image.
- Product title, price, stock, quantity, add-to-cart.
- Specs table.
- Description section.
- Related products if practical.
- Admin edit shortcut for admin users.
- Responsive layout.

Suggested commit:

```sh
git add frontend/src
git commit -m "feat: build react product detail page"
```

---

### Phase 8: Rebuild Cart, Checkout, and Orders

Goal: make the full customer purchase flow work in React.

Current status: initial React cart provider, cart page, checkout page, order creation, customer orders page, and payment simulation controls exist.

Suggested changes:

- Cart page.
- Quantity update controls.
- Remove item control.
- Cart summary.
- Checkout page.
- Order creation flow.
- Orders page.
- Payment simulation button for pending orders.
- Status badges.

Suggested commit:

```sh
git add frontend/src
git commit -m "feat: rebuild cart checkout and orders in react"
```

---

### Phase 9: Rebuild Admin UI

Goal: rebuild current admin functionality before adding image features.

Current status: React admin dashboard, product CRUD, order browsing/filtering, user browsing/filtering, and guarded role updates are backend-backed. Product image upload/management still belongs to later image phases.

Suggested changes:

- Admin dashboard shell.
- Admin products page.
- Product create/edit form.
- Product delete confirmation.
- Admin orders page.
- Admin users page.
- Role update controls.
- Table/card responsive layouts.
- Search/filter controls.
- Status badges.

Suggested commit:

```sh
git add frontend/src
git commit -m "feat: rebuild admin dashboard in react"
```

---

### Phase 10: Serve React Build from Go

Goal: make production use the new React frontend.

Suggested changes:

- Update Go frontend serving adapter.
- Serve React `index.html` for frontend routes.
- Keep `/api/v1`, `/healthz`, `/assets`, and `/uploads` separate.
- Update Dockerfile to build frontend and copy `dist`.
- Update compose if needed.
- Keep old static frontend temporarily or remove only after React coverage is complete.

Suggested commit:

```sh
git add Dockerfile internal/frontend compose.yaml docs
git commit -m "chore: serve react frontend from go"
```

---

### Phase 11: Add Product Image Persistence Model

Goal: support multiple images per product in memory and PostgreSQL.

Suggested changes:

- Add `ProductImage` domain model.
- Add `Images []ProductImage` to `Product`.
- Add product image methods to store interface.
- Add memory store image support.
- Add PostgreSQL migration/table.
- Add PostgreSQL image methods.
- Keep existing `ImageURL` compatibility fallback.
- Add contract tests.

Suggested commit:

```sh
git add internal
git commit -m "feat: persist product image galleries"
```

---

### Phase 12: Add Upload Storage Service

Goal: validate and store admin-uploaded JPG/PNG images safely.

Suggested changes:

- Add upload config to `internal/config`.
- Add upload storage package, for example `internal/adapters/uploads`.
- Create upload directory on startup.
- Generate safe filenames.
- Validate file size, extension, MIME, and image header.
- Serve uploaded files under `/uploads/`.
- Add upload volume to Compose.
- Add `.env.example` entries.

Suggested commit:

```sh
git add internal compose.yaml .env.example docs
git commit -m "feat: add product image upload storage"
```

---

### Phase 13: Add Admin Image Upload API

Goal: admin can upload, delete, reorder, and mark product images.

Suggested changes:

- Add multipart upload handler.
- Add delete image handler.
- Add reorder image handler.
- Add primary image handler.
- Add tests for auth, validation, invalid MIME, max count, oversized files, and success.

Suggested commit:

```sh
git add internal docs
git commit -m "feat: add admin product image api"
```

---

### Phase 14: Add React Drag-and-Drop Image UI

Goal: admin can manage product images from the browser.

Suggested changes:

- Add reusable `ImageUploader` component.
- Drag-and-drop zone.
- File input fallback.
- Preview selected images before upload.
- Show uploaded image gallery.
- Delete/reorder/primary controls.
- Clear errors for rejected file types/sizes.
- Enforce max 10 images in UI.
- Keep backend as final authority.

Suggested commit:

```sh
git add frontend/src
git commit -m "feat: add react product image uploader"
```

---

### Phase 15: Use Galleries Across Storefront

Goal: customer UI uses uploaded product images everywhere.

Suggested changes:

- Product cards use primary image.
- Product page uses gallery.
- Cart lines use primary image.
- Admin product list uses primary image.
- Fallback to `ImageURL` or generic asset when no uploaded image exists.

Suggested commit:

```sh
git add frontend/src internal docs
git commit -m "feat: display product image galleries"
```

---

### Phase 16: Remove Legacy Static Frontend

Goal: remove old custom HTML/CSS/JS only after React fully replaces it.

Requirements before deletion:

- Login/register works in React.
- Product listing works in React.
- Product detail pages work in React.
- Cart works in React.
- Checkout works in React.
- Orders/payment simulation work in React.
- Admin products/users/orders work in React.
- React build is served by Go.
- Docker build works.
- CI frontend checks pass.

Suggested commit:

```sh
git rm -r internal/frontend/static
git add internal/frontend Dockerfile docs
git commit -m "chore: remove legacy static frontend"
```

If Go needs an embedded directory, replace legacy static files with copied/generated React dist handling rather than deleting the whole serving adapter.

---

### Phase 17: Full E-Shop Layout Polish

Goal: make the UI match a real shop.

Suggested changes:

- Home hero.
- Category/filter sidebar.
- Sorting controls.
- Better product cards.
- Better product page spacing.
- Cart and checkout polish.
- Orders and account polish.
- Admin dashboard polish.
- Responsive review at mobile/tablet/desktop widths.
- Better empty/loading/error states.
- Consistent status colors.
- Consistent buttons and forms.

Suggested commit:

```sh
git add frontend/src
git commit -m "refactor: polish react storefront experience"
```

---

### Phase 18: Documentation and Final Checks

Goal: update docs and verify everything.

Suggested changes:

- Update README current status.
- Update `docs/development.md`.
- Update `docs/deployment.md`.
- Update `docs/openapi.yaml`.
- Document frontend dev workflow.
- Document React build workflow.
- Document upload env vars and storage volume.
- Document image validation rules.
- Document product page behavior.
- Update `AGENTS.md` progress if phases are completed.

Suggested checks:

```sh
gofmt -w .
go test ./...
go vet ./...
docker compose config
docker build -t clicky-store:test .
cd frontend && npm ci && npm run build
```

Suggested commit:

```sh
git add README.md docs .env.example compose.yaml Dockerfile AGENTS.md frontend
git commit -m "docs: document react storefront and image uploads"
```

---

## Backend Testing Priorities

Add or update tests for:

- Product slug lookup.
- Product image model validation.
- Memory store product image behavior.
- PostgreSQL product image behavior.
- Migration application.
- Product images returned with product list/detail.
- Upload endpoint requires admin.
- Upload endpoint rejects unauthenticated users.
- Upload endpoint rejects non-admin users.
- Upload endpoint rejects non-JPG/PNG files.
- Upload endpoint rejects oversized files.
- Upload endpoint rejects more than 10 images per product.
- Upload endpoint creates safe URL metadata.
- Delete image removes metadata and, if implemented, file.
- Reorder images persists sort order.
- Primary image behavior.
- Product delete cascades image metadata.
- Existing cart/order/payment/admin tests still pass.

---

## Frontend Testing Priorities

Once React exists, add at least lightweight checks.

Recommended minimum:

```text
npm run build
npm run typecheck
npm run lint
```

Optional later:

```text
vitest
@testing-library/react
playwright
```

High-value frontend test areas:

- Auth state.
- Product card rendering.
- Product detail route rendering.
- Cart state/actions.
- Admin image uploader validation.
- API error rendering.
- Protected/admin route behavior.

Do not overbuild frontend tests before the UI stabilizes.

---

## Frontend Manual Test Checklist

Before calling the React UI done, manually verify:

- Store page loads on desktop and mobile widths.
- Product search/filter/sort works.
- Product card links open dedicated product pages.
- Direct reload of `/products/{slug}` works.
- Product page image gallery works.
- Add-to-cart works from product card and product page.
- Cart quantity controls work.
- Checkout creates pending order.
- Payment simulation works.
- Login/logout state updates correctly.
- Register works.
- Admin product create/edit/delete works.
- Admin drag-and-drop upload accepts JPG/PNG.
- Admin file picker accepts JPG/PNG.
- Invalid file type shows a clear error.
- More than 10 images is blocked.
- Uploaded images appear on product card, product page, cart, and admin list.
- Admin orders page works.
- Admin users page works.
- No user-controlled text is inserted unsafely.

---

## Security Notes

Current auth and storage are acceptable for an educational project, but keep these rules:

- Keep bcrypt password hashing.
- Keep production `AUTH_SECRET` validation.
- Do not log passwords or bearer tokens.
- Do not expose internal errors to API users.
- Use HTTPS/TLS in any real deployment.
- Review CORS before deployment.
- Review CSRF assumptions if cookies are introduced later.
- Uploaded files must be validated and stored with generated names.
- Never serve arbitrary filesystem paths.
- Never allow upload paths from request data.
- Keep upload limits strict.
- Do not allow SVG uploads as product images because SVG can contain script-like content.
- Do not trust browser-provided MIME types alone.
- Keep admin upload endpoints protected server-side.
- Keep frontend route protection as UX only; backend auth remains authoritative.

---

## Definition of Done

A feature is done only when:

- It is implemented incrementally with focused commits.
- Backend behavior is clear.
- API errors are consistent.
- Data validation exists.
- Storage behavior works in memory and PostgreSQL where relevant.
- Tests are added or updated where practical.
- React components are reused instead of duplicating page markup.
- Frontend output safely renders user-controlled data.
- Tailwind is used instead of large custom boilerplate CSS.
- Documentation is updated when setup/API/user-visible behavior changes.
- `go test ./...` passes.
- `go vet ./...` passes when available.
- `npm run build` passes once React exists.
- Docker Compose config remains valid.
- The app still starts with Docker Compose.

---

## Recommended Next Branch

Use:

```sh
git switch main
git pull --ff-only origin main
git switch -c feature/react-storefront
```

Then start with the `AGENTS.md` update and continue through the phases above.

---

## Recommended Immediate Commit Sequence

Use this sequence to avoid one giant rewrite:

```text
1. docs: switch frontend roadmap to react
2. feat: add react frontend skeleton
3. feat: add typed frontend api client
4. feat: rebuild auth flow in react
5. feat: rebuild product listing in react
6. feat: add product slug routes
7. feat: build react product detail page
8. feat: rebuild cart checkout and orders in react
9. feat: rebuild admin dashboard in react
10. chore: serve react frontend from go
11. feat: persist product image galleries
12. feat: add product image upload storage
13. feat: add admin product image api
14. feat: add react product image uploader
15. feat: display product image galleries
16. chore: remove legacy static frontend
17. refactor: polish react storefront experience
18. docs: document react storefront and image uploads
```

---

## Recommended Final Project Checklist

Before final submission or presentation:

- PostgreSQL persistence works.
- Server restart does not erase users, products, carts, orders, or product image metadata.
- Uploaded image files persist through container restart when the upload volume is mounted.
- Register/login works.
- Customer can browse products.
- Customer can open dedicated product pages.
- Customer can manage cart.
- Customer can place an order.
- Payment simulation works.
- Admin can manage products.
- Admin can upload up to 10 JPG/PNG images per product.
- Admin can manage orders.
- Admin can manage users.
- Responsive frontend works on mobile width.
- UI looks like an actual e-shop.
- Tests pass.
- README and docs explain setup and usage.
- Docker Compose starts the full system.
- Security limitations are honestly documented.
