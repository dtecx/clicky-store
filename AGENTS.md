# AGENTS.md

Guidance for coding agents working on **Clicky-Store**.

This file is the source of truth for future AI/code-agent work in this repository. Keep it accurate when the project structure, stack, or implementation plan changes.

---

## Project Intent

Clicky-Store is an educational e-commerce web application for **gaming and office mice** (two categories only — see Phase 20).

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

The frontend stack is locked in:

```text
React + Vite + TypeScript + Tailwind CSS
```

Do not introduce a different framework (Next.js, Remix, Nuxt, etc.) unless the user explicitly reverses this decision.

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
- Public product listing and product details (by ID and slug).
- Customer registration and login.
- HMAC-signed bearer-token style auth.
- Login failure rate limiting.
- Authenticated profile, cart, order, and payment simulation flows.
- Admin product, order, and user management.
- API, development, and deployment documentation.
- GitHub Actions CI for formatting, tests, vet, frontend lint/build, and Docker build.
- Go frontend serving adapter that serves the React `frontend/dist` build via `FRONTEND_DIST_DIR` and returns a small text placeholder when that variable is unset. The legacy embedded HTML/CSS/JS frontend is gone; seed product SVGs live in `frontend/public/assets/products/`.
- Multi-stage Dockerfile that builds the React frontend and Go backend, then copies `frontend/dist` into the runtime image.
- React + Vite + TypeScript + Tailwind CSS app in `frontend/`, with typed API helpers, auth state, backend-backed product listing/detail, cart, checkout, customer orders, and admin dashboard/product/order/user flows.
- Product responses include an `images` gallery array backed by in-memory and PostgreSQL stores. `imageUrl` remains as the compatibility primary-image fallback.
- Runtime upload storage config, local filesystem serving, and admin product image upload/reorder/update/delete APIs exist.
- React admin product editing includes drag-and-drop/select image uploads, previews, primary-image updates, alt text editing, reordering, deletion, and max-count feedback.
- React storefront uses uploaded gallery images everywhere they apply (cards, product page gallery, cart lines, admin table, home hero).
- Phases 17 and 18 polish/documentation passes are complete.
- Phase 19 uses a curated demo catalog initializer (`init/init.json` + `init/img/{slug}/...`) instead of a live retailer scraper. Validation rejects malformed JSON and any non-decodable, oversized, or wrong-extension image; on any failure, the original four fallback products remain in place.

Important frontend limitation:

The production Docker image serves the React app through the Go server. Only the React build under `frontend/dist` is served in production. Seed product SVGs ship via `frontend/public/assets/products/`. Optional Phase 19 demo images are loaded from `init/img/` and copied into `UPLOAD_DIR` only when `init/init.json` and all referenced files validate. Uploaded-file cleanup policy on product/image deletion is still pending.

---

## Active Workstream

Phases 20 and 21 are complete on `main`. The catalog now has exactly two categories (`gaming`, `office`) and the customer + admin UI has been redesigned across two commits:

- `feat: drop travel category, rewrite AGENTS.md with redesign plan` — Phase 20.
- `refactor(frontend): redesign storefront for mobile fit, contrast, and modern look` + `refactor(frontend): finish phase 21 redesign — product page, cart/checkout/orders, auth, admin` — Phase 21 (sub-phases 21.1–21.18).

Next candidate workstreams (optional, not started):

- Remove the legacy `imageUrl` compatibility field once nothing on the wire reads it (see "Known Gaps and Technical Debt" item 1).
- Define the uploaded-file cleanup policy on product/image deletion (item 3).
- Expand product specs (sensor model, weight, switch type, polling rate, dimensions, accessories — item 4).

---

## Non-Negotiable Development Rules

- Keep commits small, focused, and meaningful.
- Prefer one feature branch per large work area.
- Do not mix database migrations, API changes, UI redesign, docs, and Docker changes in one giant commit.
- Keep the repository buildable and testable after every meaningful step.
- Run `gofmt` on Go files before committing.
- Run `go test ./...` before finalizing backend changes.
- Run `go vet ./...` before finalizing backend changes when Go tooling is available.
- Run `npm run lint` and `npm run build` (in `frontend/`) before finalizing frontend changes.
- Do not commit `.env`, generated build output, secrets, `data/`, uploaded product images, or database files.
- Do not commit local Phase 19 demo photos under `init/img/`; only commit `init/init.json`, docs, and placeholder files.
- Do not commit `frontend/dist/` unless the repository intentionally changes to committed static assets.
- Keep handlers independent from PostgreSQL details.
- Keep service code dependent on interfaces from `internal/core/ports`.
- Preserve the existing REST API shape unless a deliberate versioned change is required.
- Return consistent JSON errors shaped as `{"error":"message"}`.
- Escape or safely render all user-controlled frontend content.
- Seed product images live in `frontend/public/assets/products/`. Do not put runtime-uploaded files there.
- New product images must be uploaded through the admin UI/API and stored in a runtime upload directory.
- Do not add Next.js. The backend is Go and the frontend should be a Vite SPA unless the user explicitly requests otherwise.
- Do not rewrite backend and frontend at the same time.
- Do not reintroduce the legacy embedded HTML/CSS/JS frontend.
- **Do not reintroduce the "travel" category.** The catalog has exactly two categories: `gaming` and `office`.

---

## Phase 20 — Remove "travel" Category

### Goal

Eliminate every reference to the `travel` category from the frontend (and any stray docs / demo data) so the product catalog is exclusively `gaming` and `office`. The backend `internal/initcatalog` already restricts allowed categories to those two; this phase brings the rest of the project in line.

### Findings (audit before edits)

| Area | File | What to change |
|------|------|----------------|
| Storefront filter | `frontend/src/pages/HomePage.tsx` | Drop the `Travel` entry from the `categories` array. |
| Admin form | `frontend/src/pages/AdminProductsPage.tsx` | Drop the `Travel` entry from `categoryOptions`. |
| Footer nav | `frontend/src/components/layout/Footer.tsx` | Remove the `Travel picks` link from `shopLinks`. |
| Demo data | `frontend/src/pages/demoProducts.ts` | Remove the `TravelClick Mini` entry. (File appears unused — delete it if no imports remain.) |
| Backend fallback (existing seed) | `internal/adapters/db/memory.go` and `internal/adapters/db/postgres/migrations/000001_init.up.sql` | The product `prod-office-travel` ("TravelClick Compact") is already categorized as `office` and is fine to keep. Do not touch its ID, slug, or category — that would break existing PostgreSQL data and the `internal/initcatalog` fallback ID map. |
| Catalog mapping | `internal/initcatalog/catalog.go` | The fallback ID-to-slug map references `prod-office-travel` → `travelclick-compact`. Leave it alone for the same reason. |
| README | `README.md` | Already says "gaming and office mice" — no change required, but re-read to be sure no stray "travel" wording is reintroduced. |
| OpenAPI / docs | `docs/openapi.yaml`, `docs/api-examples.md`, `docs/development.md`, `docs/deployment.md` | Grep for `travel` (case-insensitive); update any user-facing copy. The legacy product description containing the word "travel" can stay (it describes a portable office mouse), but no UI category called "travel" should remain in docs. |

### Verification gates

- `grep -ri "travel" frontend/src` returns zero matches **outside** of test fixtures (and even those should be removed).
- `grep -ri --include="*.{md,yaml,yml,json}" "category.*travel\|'travel'\|\"travel\"" .` returns zero hits in customer/admin user copy.
- `npm run lint` and `npm run build` succeed with no new warnings.
- `go test ./...` and `go vet ./...` still pass (these should be unaffected).

### Suggested commit

```sh
git add frontend AGENTS.md docs README.md
git commit -m "feat: drop travel category, keep gaming and office only"
```

---

## Phase 21 — UI Redesign

### Goal

Make the storefront and admin look and feel like a polished, modern, accessible 2026-era e-shop. Fix every reported defect:

1. **Overflow on small screens** — header, sticky filter bar, product cards, admin tables clip or wrap awkwardly below ~380 px.
2. **Poor contrast** — secondary/tertiary text (e.g. stone-300 over stone-100, emerald hints on white, hero subhead) is hard to read.
3. **Dead buttons** — Footer support/account links (`Shipping & returns`, `Warranty`, `Contact`, `FAQ`) all link to `/`. Either give them real targets or remove them.
4. **Inconsistent spacing/radii/typography** — the current design mixes 2xl/lg radii, mixed font weights, and uneven section padding.
5. **Generic look** — gradient hero is OK but lacks rhythm; product cards lack a clear visual hierarchy; admin tables look like vanilla bootstrap.

### Design system (lock in before redesigning components)

Create a single source of truth in `frontend/src/styles/` (or directly in `tailwind.config.{ts,js}` if simpler) so colors and radii are consistent.

#### Color tokens (light theme, WCAG AA compliant)

```text
surface-base       = stone-50    (#FAFAF9)   page background
surface-raised     = white       (#FFFFFF)   cards, sticky bars
surface-sunken     = stone-100   (#F5F5F4)   hover backdrops, table headers
border-subtle      = stone-200   (#E7E5E4)
border-strong     = stone-300   (#D6D3D1)
text-primary       = slate-950   (#020617)   body and headings
text-secondary    = slate-600   (#475569)   captions, helper text  (≥4.5:1 on white)
text-muted         = slate-500   (#64748B)   only on white/stone-50
accent             = emerald-600 (#059669)   primary action, in-stock
accent-hover       = emerald-700 (#047857)
accent-soft-bg    = emerald-50  (#ECFDF5)
accent-soft-text  = emerald-800 (#065F46)   ≥7:1 on emerald-50
danger             = red-600     (#DC2626)
danger-soft-bg    = red-50      (#FEF2F2)
danger-soft-text  = red-700     (#B91C1C)
warning            = amber-500   (#F59E0B)
warning-soft-bg   = amber-50    (#FFFBEB)
warning-soft-text = amber-800   (#92400E)
focus-ring         = emerald-500/40
```

Hard rule: **no `text-stone-300` or `text-slate-400` on white or stone-50 surfaces** for anything except decorative icons (must have `aria-hidden="true"`). Helper text uses `text-slate-600` minimum. Disabled text uses `text-slate-400` only when paired with `bg-stone-100` or darker.

#### Spacing scale

Tailwind defaults are fine. Stick to multiples of 4 (Tailwind's `*-1` through `*-12`). Page sections use `py-12` (mobile) / `py-16` (desktop). Cards use `p-4` (mobile) / `p-6` (desktop). Avoid arbitrary `py-7`/`px-5` mixes — pick `4`/`6`/`8`.

#### Radius scale

```text
radius-sm = rounded-md   (6px)   — chips, tiny badges
radius-md = rounded-lg   (8px)   — inputs, buttons
radius-lg = rounded-xl   (12px)  — small cards, list rows
radius-xl = rounded-2xl  (16px)  — hero cards, product cards, admin panels
radius-pill = rounded-full        — avatars, status dots
```

Pick **one** radius per surface type and stick with it. Today the codebase mixes `rounded-2xl` and `rounded-xl` on the same kind of element.

#### Typography

```text
font-sans = Inter, system-ui (Tailwind default stack is fine; consider adding Inter Variable via @fontsource/inter)
display   = text-4xl/5xl/6xl, font-bold, tracking-tight  (hero only)
h1        = text-3xl  font-bold tracking-tight
h2        = text-2xl  font-bold tracking-tight
h3        = text-lg   font-semibold
body      = text-sm   leading-6
caption   = text-xs   leading-5  uppercase tracking-[0.14em]
```

Drop `font-bold` from body copy. The current cards use bold for both title and price — keep bold on price only, use `font-semibold` on title.

#### Responsive breakpoints

```text
< 380 px : single column, horizontal scroll only inside admin tables (with `-mx-4 overflow-x-auto`)
sm  640 : two-column product grid
md  768 : sticky filter goes inline
lg  1024: three-column product grid; admin sidebar permanent
xl  1280: four-column product grid
2xl 1536: cap at max-w-7xl
```

Hard rule: **no element may overflow the viewport at 360 px width**. Test in DevTools with the iPhone SE preset before merging.

### Component-level redesign tasks

Each item is a single PR-sized change. Do them in this order so context flows naturally and the app stays runnable.

#### 21.1 — Tailwind config and base styles

- Add a `theme.extend.colors` block that aliases the tokens above (`surface`, `accent`, `danger`, `warning`).
- Add `theme.extend.fontFamily.sans = ['Inter Variable', 'system-ui', ...]`.
- Install `@fontsource-variable/inter` and import it once in `src/main.tsx`.
- Trim `src/index.css` to: `@tailwind base; @tailwind components; @tailwind utilities;` plus a global `:focus-visible` ring helper.
- Add a `body { @apply bg-surface-base text-text-primary antialiased; }` rule.

#### 21.2 — UI primitives audit

`frontend/src/components/ui/` already has Button, Card, Badge, EmptyState, ErrorState, LoadingState, LinkButton, Skeleton.

- **Button**: ensure `variant` covers `primary | secondary | ghost | danger | outline`; `size` covers `sm | md | lg`; primary uses `bg-emerald-600 hover:bg-emerald-700 text-white`; ghost has visible hover state on white (`hover:bg-stone-100`); disabled gets `opacity-60 cursor-not-allowed`. All variants reach 4.5:1 contrast.
- **Card**: standardize on `rounded-2xl border border-stone-200 bg-white shadow-sm`. Remove ad-hoc shadows in pages.
- **Badge**: lock variants to the soft-bg + soft-text token pairs above.
- Add a new `Container` component (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) and use it on every page so horizontal padding is consistent.

#### 21.3 — Header / mobile navigation

Current header overflows below 480 px (logo + search + cart badge + login link).

- Below `md`, hide the inline search input and replace it with an icon button that toggles a full-width drawer.
- Replace the multi-link account block with a single avatar/menu button on mobile.
- Cart badge becomes an icon-only button on mobile (count as superscript).
- Ensure the header stays sticky with `backdrop-blur` and a subtle `border-b` once scrolled (it already does this — verify after refactor).
- Admin shortcut link only renders for admin users (already does — keep).
- Make the entire header keyboard-navigable (`tab` cycle, `aria-current="page"` on active link).

#### 21.4 — Footer

Currently has 4 columns of links, several pointing at `/`.

- Cut **Support** column entirely (Shipping/Warranty/Contact/FAQ are placeholders going nowhere — leaving dead links is worse than not showing them).
- Replace with a 3-column layout: Brand + tagline | Shop | Account.
- All remaining links must resolve. Keep `?category=gaming` and `?category=office` deep-links (no `?category=travel`).
- Stack columns vertically on mobile (`grid grid-cols-1 sm:grid-cols-3`).

#### 21.5 — Home / storefront hero + value props

- Replace the radial-gradient hero with a cleaner two-column layout: copy left, single product image right, on a slate-950 background. Keep the gradient text accent on the second h1 line but tone down opacity.
- Hero subhead must be `text-stone-100` (not `stone-200`) — verifies AA contrast on slate-950.
- Reduce hero vertical padding on mobile (`py-12` instead of `py-16`).
- Value props strip: keep four icons but switch to a tighter `flex` row on `md+` and a 2x2 grid on mobile.

#### 21.6 — Category row

- After Phase 20 there are exactly three options: All / Gaming / Office. A 4-up grid no longer makes sense — switch to a horizontal pill bar (`flex gap-2`) that scrolls on small screens.
- Active state: solid slate-950 background, white text.
- Inactive: white background, slate-700 text, hover lifts to stone-50.

#### 21.7 — Sticky filter bar

- Currently sits at `top-[68px]`; hard-coding the offset breaks when the header height changes. Use `top-16` (matches a 64 px header) and standardize the header to `h-16`.
- On mobile (`< sm`), search and sort each get a full row instead of side-by-side.
- Make sure the bar's background contrasts against the page (`bg-white/85` over `bg-stone-50` page works; the current `bg-stone-100/85` over `bg-stone-50` is too low contrast).

#### 21.8 — Product grid + product card

- Card: `rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition`. Image area uses `aspect-square` (not fixed height) so it never clips.
- Title: 1–2 line clamp (`line-clamp-2`), `font-semibold text-base`.
- Price block: `font-bold text-lg text-slate-950` and stock badge to its right.
- "Add to cart" button is full width on mobile, auto on desktop.
- Quick-add must show a loading spinner (re-use `Spinner` from Skeleton family) and a success toast.

#### 21.9 — Product detail page

- Two-column layout `lg:grid-cols-[1fr_360px]`. Right rail (price + buy box) becomes a sticky `top-24` card.
- On mobile, buy box becomes a fixed bottom bar (`fixed inset-x-0 bottom-0 bg-white border-t shadow-lg p-4`) with price + Add-to-cart. Add `pb-28` to the page on mobile so content isn't hidden behind it.
- Specs table: real `<dl>` semantic markup, two columns on mobile (key / value), zebra rows.
- Related products strip stays but limit to 4 items and reuse the new product card.

#### 21.10 — Cart, Checkout, Orders

- Cart line: image (16x16 mobile, 20x20 desktop), name, qty stepper (`-` / number / `+`), unit price, line total, remove icon. On mobile collapse into two rows.
- Cart summary: sticky on `lg+`, full-width below.
- Checkout: collapse into one column on mobile, two columns on desktop. Add a clear "Place order" CTA bar that's always visible.
- Orders page: card layout (already exists) — tighten spacing, make status badge prominent, payment-simulation buttons become a button group with loading states.

#### 21.11 — Auth pages (Login / Register)

- Centered card, `max-w-md`, `p-6 sm:p-8`.
- Inputs have explicit `<label>` (currently using `sr-only` in some places — fine, but make sure errors are announced via `aria-describedby`).
- Show server error inline with red soft tokens.

#### 21.12 — Admin shell

- Sidebar (`AdminLayout`) collapses to a top tab bar below `lg` so it doesn't eat the screen.
- Sidebar items use icons + labels with active state (`bg-slate-950 text-white rounded-lg`).
- Admin dashboard stat cards: switch to 4 equal cards with the metric, label, and a tiny sparkline placeholder (no chart yet — just visual rhythm).

#### 21.13 — Admin tables (products / orders / users)

- Wrap every `<table>` in `-mx-4 sm:mx-0 overflow-x-auto` so horizontal scroll works on mobile.
- Sticky header row inside the scroll container (`thead.sticky.top-0.bg-stone-50`).
- Replace the "Edit | View | Delete" three-button row with a single overflow menu (`MoreHorizontal` icon -> dropdown) on mobile; keep inline buttons on `lg+`.
- Add zebra striping (`even:bg-stone-50/40`) and increase row padding to `py-3`.

#### 21.14 — Forms (admin product editor)

- Group fields into sections: Identity (name, slug), Catalog (category, price, currency), Specs (DPI, wireless, ergonomic, stock), Media (image manager).
- Use `<fieldset>` + `<legend>` semantically; visually render legend as `caption` token text.
- Make the form scrollable inside its card (`max-h-[80vh] overflow-y-auto`) on small screens, so the action footer never escapes the viewport.
- Replace the free-text Category input with a `<select>` bound to the same two-option list (gaming / office) used by the filter — this prevents typos that bypass the backend whitelist.

#### 21.15 — Empty / loading / error states

- All three states already exist as components; audit every page and make sure they are rendered (some pages currently show a blank flash before data arrives).
- Skeletons use `bg-stone-200` (current `stone-100` is too faint on `stone-50`).

#### 21.16 — Accessibility pass

- All interactive elements must have a `:focus-visible` ring (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2`).
- All images must have meaningful or empty `alt` (decorative `alt=""` is fine).
- All icon-only buttons must have `aria-label`.
- Color is never the only indicator (stock state pairs color with text + icon).
- Run Lighthouse a11y audit; target ≥95.

#### 21.17 — Responsive QA pass

Test these widths in DevTools and on real devices when possible:

```text
360  (small Android)
390  (iPhone 14)
640  (small tablet portrait)
768  (iPad portrait)
1024 (laptop)
1440 (desktop)
```

Verify on every page:

- No horizontal scroll on the page itself.
- Sticky elements don't overlap content.
- Tap targets ≥ 40 px tall.
- Text remains legible (≥14 px body, ≥12 px caption).

#### 21.18 — Build + lint + tests

Final gate before declaring Phase 21 done:

```sh
cd frontend
npm ci
npm run lint
npm run build

cd ..
gofmt -l .
go test ./...
go vet ./...
docker compose config
docker build -t clicky-store:test .
```

### Phase 21 commit plan

Use one commit per numbered subsection above so reviews stay small:

```text
21.1  refactor(frontend): introduce tailwind design tokens
21.2  refactor(frontend): tighten ui primitives
21.3  refactor(frontend): redesign header with mobile drawer
21.4  refactor(frontend): trim footer dead links
21.5  refactor(frontend): redesign hero and value props
21.6  refactor(frontend): redesign category row as pill bar
21.7  refactor(frontend): fix sticky filter offset and contrast
21.8  refactor(frontend): redesign product card and grid
21.9  refactor(frontend): redesign product detail page
21.10 refactor(frontend): redesign cart, checkout, orders
21.11 refactor(frontend): redesign auth pages
21.12 refactor(frontend): redesign admin shell and dashboard
21.13 refactor(frontend): make admin tables responsive
21.14 refactor(frontend): restructure admin product editor
21.15 refactor(frontend): unify empty/loading/error states
21.16 refactor(frontend): a11y pass on focus, labels, contrast
21.17 chore(frontend): responsive QA fixes
21.18 chore: docs and final checks for ui redesign
```

---

## Frontend Direction

Use:

```text
React + Vite + TypeScript + Tailwind CSS
```

Recommended supporting frontend libraries (already installed):

```text
react-router-dom
lucide-react
clsx
```

New dependencies allowed for Phase 21:

```text
@fontsource-variable/inter   (one-line import in main.tsx)
```

Optional later libraries (do **not** add until they solve a real, observed problem):

```text
react-hook-form
zod
zustand
@radix-ui/react-dropdown-menu  (only if 21.13 overflow menu becomes painful with raw button + popover)
```

### Tailwind Usage Rules

Use Tailwind as the main styling layer.

Do:

- Use Tailwind utility classes for layout and components.
- Keep shared UI as React components.
- Use small helper functions for class composition (`cn()` from `utils/cn.ts`).
- Keep global CSS minimal.
- Use responsive utilities deliberately.
- Use the design tokens from Phase 21.1 — do not invent new colors per page.

Do not:

- Recreate a huge handwritten CSS design system.
- Scatter repeated long class strings everywhere if a component would be cleaner.
- Use Bootstrap and Tailwind together as competing layout systems.
- Add a large component library unless the user asks.
- Use `text-stone-300`, `text-slate-300`, or `text-slate-400` for body text on light surfaces.

---

## Target Architecture

Current backend should remain Go.

The React frontend lives under `frontend/`:

```text
frontend/
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    index.css
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
        Container.tsx           ← new in 21.2
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
        Skeleton.tsx
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
      cn.ts
      productImages.ts
```

The Go server serves the React build output; this is already wired up.

---

## Current Architecture

```text
cmd/server/                         Go HTTP server composition root
cmd/initcatalog/                    Manual validator for init/init.json
internal/config/                    Environment loading and validation
internal/core/domains/              Domain models, constants, validation, shared domain errors
internal/core/ports/                Store interfaces
internal/service/                   Application use cases, auth, password hashing
internal/adapters/db/               In-memory store and store contract tests
internal/adapters/db/postgres/      PostgreSQL store, helpers, migrations
internal/adapters/http/v1/          REST API v1 handlers, requests, auth middleware, rate limiting
internal/adapters/uploads/          Local product image upload storage
internal/initcatalog/               Optional validated demo catalog loader/seeder
internal/frontend/                  Frontend serving adapter (FRONTEND_DIST_DIR aware)
internal/web/                       Shared HTTP JSON, CORS, logging, middleware helpers
frontend/                           React + Vite + TypeScript + Tailwind source app
frontend/public/assets/products/    Seed product SVGs shipped with the Vite build
init/                               Phase 19 demo catalog JSON and ignored local image source folder
docs/                               API, development, and deployment documentation
compose.yaml                        Local API and PostgreSQL services
Dockerfile                          Multi-stage React + Go production image
.github/workflows/ci.yml            CI checks
```

---

## Current Implemented Feature Baseline

Customer-facing features:

- Browse products (gaming + office only after Phase 20).
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
- Product image gallery persistence in memory and PostgreSQL.
- In-memory fallback for lightweight development/tests.
- Transactional checkout behavior in store implementations.
- Store contract tests.
- Bcrypt password hashing.
- Config validation for non-development secrets.
- Login rate limiting.
- Docker Compose local environment.
- Runtime upload directory creation and uploaded-file serving under `/uploads`.
- CI for Go formatting, tests, vet, and Docker image build.

---

## Known Gaps and Technical Debt

Address these before adding unrelated features:

1. Product media persistence supports galleries, but the legacy `imageUrl` field still remains as a compatibility fallback. Plan its removal once Phase 21 ships and all UI paths use `images[]`.
2. Phase 19 demo catalog JSON exists, but richer product art still depends on manually adding valid JPG/PNG files under `init/img/{slug}/` for the referenced paths.
3. Uploaded-file cleanup on product/image deletion still needs a deliberate policy.
4. Product specs are too limited for a real mouse shop (sensor model, weight, switch type, polling rate, dimensions, included accessories are all missing fields). Consider tackling alongside Phase 21.14 form restructuring.
5. Documentation must be updated whenever API, environment, upload storage, Docker workflow, or frontend workflow changes.
6. The frontend has no automated tests yet; consider adding lightweight Vitest coverage for the design tokens / button variants once Phase 21.1 lands.

---

## Target E-Shop UX

The storefront should feel like an actual online shop, not only an API demo.

Required customer UI areas:

- Header/navbar with logo, search (drawer on mobile), cart badge, account/login state, and admin link for admins.
- Home/store page with hero section.
- Two-category filter (gaming + office) plus an "All" option.
- Sorting controls.
- Product grid with cards.
- Product cards with main image, price, stock badge, short specs, and quick add-to-cart.
- Dedicated product detail page for every mouse.
- Product gallery with main image and thumbnails.
- Product description and specs table.
- Add-to-cart controls with disabled/out-of-stock behavior.
- Cart page with image thumbnails, quantity controls, totals, and checkout action.
- Checkout page with order summary.
- Orders page with order cards and payment simulation action for pending orders.
- Responsive mobile/tablet/desktop layout (no horizontal page scroll at 360 px).
- Loading, empty, and error states for every page.

Required admin UI areas:

- Admin layout with sidebar (collapses to top tab bar on mobile).
- Product table/cards with search/filter.
- Product create/edit form with sectioned layout.
- Drag-and-drop/select image uploader for product images.
- Product image preview gallery with delete/reorder/primary-image behavior.
- Orders table with status badges and filtering.
- Users table with role filtering and safe role updates.
- Clear destructive action confirmations.

---

## Dedicated Product Page Requirements

Every mouse must have its own dedicated product page.

Frontend route:

```text
/products/:slug
```

Implementation notes:

- `react-router-dom` is already wired up.
- The Go frontend handler already serves `index.html` for unknown frontend routes.
- `/api/v1/...`, `/healthz`, `/assets/...`, and `/uploads/...` are kept separate from the frontend route fallback.
- Backend lookup by slug is implemented (`GET /api/v1/products/slug/{slug}`).
- Product ID stays stable for API mutations; slug is the customer-facing identifier.

Minimum product page content:

- Breadcrumbs: Home / Category / Product name.
- Image gallery: main image plus thumbnails.
- Product title.
- Price and currency.
- Stock status.
- Add-to-cart button (sticky bottom on mobile, sticky right rail on desktop).
- Quantity selector.
- Short selling points.
- Full description.
- Specs table.
- Similar/related products (max 4).
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

Environment variables (already in use):

```text
UPLOAD_DIR=./data/uploads
UPLOAD_URL_PREFIX=/uploads
MAX_PRODUCT_IMAGES=10
MAX_PRODUCT_IMAGE_BYTES=4194304
MAX_PRODUCT_UPLOAD_BYTES=50331648
```

Compose volume:

```yaml
${UPLOAD_DATA_PATH:-./data/uploads}:/app/data/uploads
```

The server creates the upload directory on startup if it does not exist.

---

## Product Image Data Model

Already implemented:

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

type Product struct {
    ID          string         `json:"id"`
    Name        string         `json:"name"`
    Slug        string         `json:"slug"`
    Description string         `json:"description"`
    Category    string         `json:"category"`     // "gaming" | "office"
    PriceCents  int            `json:"priceCents"`
    Currency    string         `json:"currency"`
    DPI         int            `json:"dpi"`
    Wireless    bool           `json:"wireless"`
    Ergonomic   bool           `json:"ergonomic"`
    Stock       int            `json:"stock"`
    ImageURL    string         `json:"imageUrl"` // compatibility fallback only
    Images      []ProductImage `json:"images"`
    CreatedAt   time.Time      `json:"createdAt"`
    UpdatedAt   time.Time      `json:"updatedAt"`
}
```

`ImageURL` stays for compatibility. Removal of `ImageURL` is tracked under "Known Gaps and Technical Debt".

Migration files live under `internal/adapters/db/postgres/migrations/`.

---

## API Surface

Public:

```text
GET  /healthz
GET  /api/v1/products
GET  /api/v1/products/{productId}
GET  /api/v1/products/slug/{slug}
POST /api/v1/auth/register
POST /api/v1/auth/login
```

Customer (Bearer token required):

```text
GET    /api/v1/me
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/{productId}
DELETE /api/v1/cart/items/{productId}
GET    /api/v1/orders
POST   /api/v1/orders
POST   /api/v1/orders/{orderId}/payment/simulate
```

Admin (admin role required):

```text
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

Validation rules:

- Non-admin users receive `403`.
- Unauthenticated users receive `401`.
- Unknown product receives `404`.
- More than 10 total product images receives `400`.
- Invalid file type receives `400`.
- Oversized file receives `400`.
- Internal storage/database failure receives `500` with a safe error message.
- Product `category` field is restricted to `gaming` or `office`. Backend rejects anything else.

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
- Use Tailwind for layout and styling — with the Phase 21 design tokens.
- Keep `src/index.css` small and mostly for Tailwind directives/global defaults.

---

## React Frontend Environment

Frontend environment variable:

```text
VITE_API_BASE_URL=/api/v1
```

For local dev with Vite proxy, `frontend/vite.config.ts` proxies `/api/v1`, `/uploads`, and `/healthz` to the Go server.

Suggested dev flow:

```text
Terminal 1: docker compose up db
Terminal 2: go run ./cmd/server
Terminal 3: cd frontend && npm run dev
```

Production flow:

```text
Docker builds React frontend.
Docker builds Go backend.
React dist is copied into the final Go image.
Go serves the React app and API from one container.
```

---

## Dockerfile Direction

Current Dockerfile is a multi-stage build that builds React with Node, builds the Go backend, and copies `frontend/dist` into the runtime image.

Stages:

```text
frontend-build:
  node:22-alpine
  workdir /src/frontend
  npm ci
  npm run build

backend-build:
  golang image
  go build ./cmd/server

runtime:
  copy Go binary
  copy frontend dist to a path served by internal/frontend
  copy init/ for optional demo catalog seeding
```

Do not rely on a globally installed Node or Vite inside the Go image.

---

## Implementation Roadmap

Phases 0–19 are **completed**. Their summaries are kept brief; expand only if reverting work or re-running them.

| Phase | Title | Status |
|------:|-------|--------|
| 0  | Sanity check current repo                                  | ✅ done |
| 1  | Rewrite AGENTS.md with React direction                     | ✅ done |
| 2  | Add React app skeleton                                     | ✅ done |
| 3  | Add typed API client                                       | ✅ done |
| 4  | Rebuild auth + layout                                      | ✅ done |
| 5  | Rebuild product listing                                    | ✅ done |
| 6  | Add product slug routes                                    | ✅ done |
| 7  | Build product detail page                                  | ✅ done |
| 8  | Rebuild cart, checkout, orders                             | ✅ done |
| 9  | Rebuild admin UI                                           | ✅ done |
| 10 | Serve React build from Go                                  | ✅ done |
| 11 | Product image persistence (memory + PostgreSQL)            | ✅ done |
| 12 | Upload storage service                                     | ✅ done |
| 13 | Admin image upload API                                     | ✅ done |
| 14 | React drag-and-drop image uploader                         | ✅ done |
| 15 | Use galleries across storefront                            | ✅ done |
| 16 | Remove legacy static frontend                              | ✅ done |
| 17 | E-shop layout polish                                       | ✅ done |
| 18 | Documentation and final checks                             | ✅ done |
| 19 | Validated demo catalog init (init.json + init/img)         | ✅ done |
| 20 | Remove travel category                                     | ✅ done |
| 21 | UI redesign (modern, responsive, accessible)               | ✅ done |

---

## Backend Testing Priorities

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
- Category validation rejects values outside `gaming|office`.

---

## Frontend Testing Priorities

Once the redesign settles, add lightweight checks.

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
- Product card rendering with all stock states.
- Product detail route rendering.
- Cart state/actions.
- Admin image uploader validation.
- API error rendering.
- Protected/admin route behavior.
- Button/Badge variants render with the right tokens (snapshot or jest-axe).

---

## Frontend Manual Test Checklist

Before calling the React UI done, manually verify at 360 / 768 / 1440 widths:

- Store page loads on every width with no horizontal scroll.
- Product search/filter/sort works.
- Product card links open dedicated product pages.
- Direct reload of `/products/{slug}` works.
- Product page image gallery works.
- Add-to-cart works from product card and product page.
- Mobile sticky bottom buy bar appears and dismisses correctly.
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
- Tab order is logical on every page; focus rings are visible.
- No `travel` category appears anywhere in the UI.
- Footer has no dead links.

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
- Tailwind tokens are used instead of ad-hoc colors.
- Documentation is updated when setup/API/user-visible behavior changes.
- `go test ./...` passes.
- `go vet ./...` passes when available.
- `npm run lint` passes.
- `npm run build` passes.
- Docker Compose config remains valid.
- The app still starts with Docker Compose.
- The change is verified at 360 px and 1440 px widths.

---

## Recommended Next Branch

```sh
git switch main
git pull --ff-only origin main
git switch -c feature/ui-redesign
```

Land Phase 20 first as a small commit, then iterate Phase 21 sub-commits on the same branch.

---

## Recommended Final Project Checklist

Before final submission or presentation:

- PostgreSQL persistence works.
- Server restart does not erase users, products, carts, orders, or product image metadata.
- Uploaded image files persist through container restart when the upload volume is mounted.
- Register/login works.
- Customer can browse products in two categories (gaming + office).
- Customer can open dedicated product pages.
- Customer can manage cart.
- Customer can place an order.
- Payment simulation works.
- Admin can manage products.
- Admin can upload up to 10 JPG/PNG images per product.
- Admin can manage orders.
- Admin can manage users.
- UI is responsive at 360, 768, and 1440 px.
- UI passes a Lighthouse a11y audit ≥ 95.
- All footer links resolve to a real page.
- Tests pass.
- README and docs explain setup and usage.
- Docker Compose starts the full system.
- Security limitations are honestly documented.
