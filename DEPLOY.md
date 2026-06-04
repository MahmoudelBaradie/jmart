# Jmart — Production Deployment Guide

This document is the **operator's checklist** for deploying Jmart to a real
environment. The code is ready; everything below requires *your* infrastructure
decisions (domains, secrets, registry).

---

## 1. Prerequisites

| Component | Minimum | Notes |
|---|---|---|
| Docker | 24+ | Compose v2 plugin required |
| Postgres | 16 + PostGIS 3.4 | Default image: `postgis/postgis:16-3.4-alpine` |
| Redis | 7.x | For queues + sessions |
| MinIO (or S3-compat) | latest | For uploads (KYC docs, quality photos) |
| Domain + TLS cert | — | Nginx terminates TLS on :443 |

---

## 2. Secrets you MUST replace

Edit `apps/api/.env.production`:

```env
# Generate with: openssl rand -hex 64  (run TWICE — different secrets)
JWT_ACCESS_SECRET=<paste 128-char hex>
JWT_REFRESH_SECRET=<paste 128-char hex>

# Replace with your real domains (comma-separated, no trailing slash)
CORS_ORIGINS=https://admin.yourdomain.com,https://farmer.yourdomain.com

# Replace with real DB credentials
DATABASE_URL=postgresql://<user>:<password>@postgres:5432/<dbname>?schema=public

# Replace Redis password (default is published in repo)
REDIS_PASSWORD=<strong-redis-password>

# Replace MinIO creds (default minioadmin/minioadmin is a known credential)
STORAGE_ACCESS_KEY=<min-12-chars>
STORAGE_SECRET_KEY=<min-24-chars>
```

Edit `apps/admin/.env.production` and `apps/farmer/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

> **Built-in safeguard:** the API will now refuse to boot in production if
> `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is missing or empty. It throws
> a fatal error rather than silently using the dev fallback string.

---

## 3. Database migrations

A baseline migration was generated at `apps/api/prisma/migrations/0_init/`
(2,226 SQL lines, 67 tables, 142 FKs — covers the entire current schema).

**First deploy** (empty DB):
```bash
cd apps/api
DATABASE_URL=<prod-url> npx prisma migrate deploy
DATABASE_URL=<prod-url> pnpm db:seed   # optional: seed admin + sample data
```

**Existing dev DB that was schema-pushed** (most likely your case):
```bash
cd apps/api
DATABASE_URL=<prod-url> npx prisma migrate resolve --applied 0_init
# Future schema changes: edit schema.prisma, then:
DATABASE_URL=<prod-url> npx prisma migrate dev --name <description>
```

Going forward, *never* use `db push` against production — always create a
named migration via `prisma migrate dev`.

---

## 4. Build & deploy with Docker Compose

```bash
# Build production images (uses the `production` target in each Dockerfile)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run migrations once before bringing up app containers
docker compose run --rm api npx prisma migrate deploy

# Start everything
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Tail logs
docker compose logs -f api admin farmer
```

All three app containers now:
- Run as non-root (UID `node`, applied via `chown` + `USER node`)
- Expose a `HEALTHCHECK` (api: `/api/docs`, admin: `/login`, farmer: `/login`)

---

## 5. Nginx + TLS

`nginx/Dockerfile` + `docker-compose.prod.yml` define an Nginx reverse proxy
on :80 and :443. Before going public:

1. Mount real TLS certs into the nginx container (Let's Encrypt via certbot,
   or your enterprise PKI).
2. Confirm nginx config routes `api.yourdomain.com → api:3000`,
   `admin.yourdomain.com → admin:3002`, `farmer.yourdomain.com → farmer:3003`.
3. Add HSTS, force-redirect 80→443.

---

## 6. Operational guarantees baked into the code

| Concern | What's in place |
|---|---|
| Rate limiting | Global `ThrottlerGuard` — 20/s, 100/10s, 300/min |
| Helmet headers | Enabled on all responses |
| gzip compression | Enabled |
| CORS allowlist | Driven from `CORS_ORIGINS` env, comma-separated |
| Refresh tokens | bcrypt-hashed in DB, rotated on each refresh, separate secret from access |
| Bcrypt rounds | 12 (≈250ms per hash) |
| Validation | Class-validator with `forbidNonWhitelisted: true` — unknown fields rejected |
| Exception leakage | Stack traces logged server-side only; response carries only `message` |
| Production logs | Restricted to `error` + `warn` (no debug/log noise) |
| Swagger docs | Disabled when `NODE_ENV=production` |

---

## 7. Pre-go-live checklist

- [ ] All 5 secrets in `apps/api/.env.production` replaced with real values
- [ ] CORS_ORIGINS contains only the live domains
- [ ] Postgres backup strategy in place
- [ ] MinIO bucket policy + lifecycle rules configured
- [ ] Nginx TLS cert installed and auto-renews
- [ ] DNS records: `api.`, `admin.`, `farmer.` → load balancer
- [ ] Monitoring: API health endpoint `/api/v1/dashboard/overview` (auth-required)
- [ ] Log shipping configured (current logger writes to stdout — friendly to k8s)
- [ ] CI workflow (`.github/workflows/ci.yml`) green on the deploy branch
- [ ] Smoke-test flow after deploy: login → marketplace → checkout → order visible

---

## 8. Rollback

Each deployment is a new image tag. To rollback:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  pull api:<previous-tag>
docker compose up -d api
```

Database migrations are forward-only by design — if a deploy includes a
breaking migration, roll back the image AND restore the pre-migration DB
snapshot. There is no automatic down-migration.
