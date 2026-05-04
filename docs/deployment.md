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
- Legacy prototype password-hash verification for older local data.
- HMAC-signed bearer tokens.
- Admin-only endpoint checks.
- Basic in-process login rate limiting.
- Escaped frontend template output for user-controlled data.
- Consistent JSON error responses.

Still recommended before production use:

- Review token format and rotation strategy.
- Add edge/proxy-level request rate limits for broader abuse protection.
- Review CSRF assumptions if the frontend is served from a different origin.
- Review CORS policy for the final deployment origin.
- Add request-size limits at the reverse proxy.
- Add structured audit logging for admin actions.
