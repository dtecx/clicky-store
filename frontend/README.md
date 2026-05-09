# Clicky-Store Frontend

React + Vite + TypeScript + Tailwind CSS source app for the Clicky-Store storefront and admin dashboard.

This is the only frontend the Go server ships. Production builds are served from `frontend/dist` via the `FRONTEND_DIST_DIR` environment variable; for local UI development run `npm run dev` and let Vite proxy API/assets/uploads to the Go server.

Seed product SVGs live in `frontend/public/assets/products/` so they ship with the Vite build and resolve at `/assets/products/<file>.svg` in both dev (Vite serves `public/`) and production (Vite copies `public/` into `dist/`).

## Scripts

```sh
npm run dev
npm run lint
npm run typecheck
npm run build
```

The Vite development server proxies `/api`, `/assets`, `/uploads`, and `/healthz` to the Go server on `http://localhost:8080`.
