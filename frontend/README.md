# Clicky-Store Frontend

React + Vite + TypeScript + Tailwind CSS source app for the Clicky-Store storefront and admin dashboard.

The Go backend still serves the legacy embedded frontend. This app is being added alongside it until the React customer and admin flows are complete.

## Scripts

```sh
npm run dev
npm run lint
npm run typecheck
npm run build
```

The Vite development server proxies `/api`, `/assets`, `/uploads`, and `/healthz` to the Go server on `http://localhost:8080`.
