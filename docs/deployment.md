# Deployment Notes

Clicky-Store is an educational project, but deployment should still follow basic production hygiene.

## Required Configuration

Set these values outside development:

```txt
APP_ENV=production
DATABASE_URL=<production-postgres-url>
AUTH_SECRET=<long-random-secret>
ADMIN_NAME=<initial-admin-name>
ADMIN_EMAIL=<initial-admin-email>
ADMIN_PASSWORD=<initial-admin-password>
FRONTEND_ORIGIN=<public-origin>
FRONTEND_DIST_DIR=/app/frontend/dist
UPLOAD_DIR=/app/data/uploads
UPLOAD_URL_PREFIX=/uploads
MAX_PRODUCT_IMAGES=10
MAX_PRODUCT_IMAGE_BYTES=4194304
MAX_PRODUCT_UPLOAD_BYTES=50331648
INIT_CATALOG_PATH=/app/init/init.json
```

The server refuses to start outside development when `AUTH_SECRET` is missing or still uses the development demo value.

Admin seeding runs only when `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are all set. After first login, change the initial password if the deployment process exposed it to operators.

## Database

- Use PostgreSQL.
- Back up the database volume.
- Run migrations through application startup.
- Keep `DATABASE_URL` out of source control.
- Use `sslmode=require` or stronger where the hosting provider supports it.

## HTTPS And Proxying

Run the app behind HTTPS in real deployments. A reverse proxy such as Caddy, Nginx, Traefik, or a platform load balancer can terminate TLS and forward traffic to the Go server.

Set `FRONTEND_ORIGIN` to the deployed origin so browser requests are scoped to the expected host.

## Frontend Build

The production Docker image builds the Vite React app in a Node stage, builds the Go server in a Go stage, and copies `frontend/dist` into the runtime image at `/app/frontend/dist`.

`FRONTEND_DIST_DIR` tells the Go server where to find that build. In Docker/Compose it defaults to `/app/frontend/dist`. When the variable points at a valid Vite build directory, Go serves the React app and falls back to `index.html` for direct reloads of frontend routes such as `/products/:slug`, `/cart`, `/orders`, and `/admin/products`.

The legacy embedded HTML/CSS/JS frontend has been removed. Seed product SVGs now live in `frontend/public/assets/products/` and are shipped by the Vite build, so they continue to resolve at `/assets/products/<file>.svg` once `FRONTEND_DIST_DIR` is configured. If the variable is unset the Go server returns a small text placeholder pointing operators at the build step instead of a stale legacy SPA.

## Uploaded Product Files

Uploaded product files are stored outside the embedded frontend. In Docker/Compose, mount a persistent volume at `UPLOAD_DIR`; the provided Compose file maps `${UPLOAD_DATA_PATH:-./data/uploads}` to `/app/data/uploads`.

The server creates the upload directory on startup and serves files under `UPLOAD_URL_PREFIX`, defaulting to `/uploads`. Do not expose the local filesystem path in API responses; store and return only public URLs such as `/uploads/products/<product-id>/<generated-file>.jpg`.

Current server-side image validation accepts JPEG and PNG only, checks file extension, MIME/content sniffing, decoded image headers, and maximum size. Keep request-size limits aligned at the reverse proxy with `MAX_PRODUCT_UPLOAD_BYTES`.

Back up upload storage together with PostgreSQL, because product gallery metadata and files are stored separately. Deleting a product image currently removes database metadata; a deliberate disk cleanup/orphan-retention policy is still pending, so production-like deployments should monitor upload volume growth.

## Demo Catalog Init

The production image includes `init/init.json`. Compose also mounts `${INIT_DATA_PATH:-./init}` to `/app/init` so operators can provide local demo photos without rebuilding.

On startup, the server validates the configured JSON catalog and all referenced JPG/PNG files under `init/img/{slug}/`. If the catalog is valid and the database still contains the exact fallback products, it copies those source images into `UPLOAD_DIR`, stores gallery metadata, and removes the fallback products. If validation fails or the product catalog is already customized, the server keeps the existing catalog.

Validate demo assets before starting a fresh deployment:

```sh
go run ./cmd/initcatalog -path init/init.json
```

## Secrets

Do not reuse development values:

```txt
AUTH_SECRET=change-me-for-local-development
ADMIN_PASSWORD=admin12345
POSTGRES_PASSWORD=clicky_dev_password
```

Rotate secrets if they were committed, logged, or shared.

## Security Limitations

Implemented:

- Bcrypt password hashing for new accounts.
- HMAC-signed bearer tokens.
- Admin-only endpoint checks.
- Basic in-process login rate limiting.
- React rendering for user-controlled frontend content.
- Consistent JSON error responses.

Still recommended before production use:

- Review token format and rotation strategy.
- Add edge/proxy-level request rate limits for broader abuse protection.
- Review CSRF assumptions if the frontend is served from a different origin.
- Review CORS policy for the final deployment origin.
- Add or align request-size limits at the reverse proxy.
- Add structured audit logging for admin actions.
