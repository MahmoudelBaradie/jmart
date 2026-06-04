# Jmart — Setup Guide

## Prerequisites
- Docker Desktop installed and running
- Node.js 20+
- pnpm 8+

## Quick Start

### 1. Environment Setup
```bash
cp .env.example apps/api/.env
# Edit apps/api/.env if needed (defaults work for local Docker)
```

### 2. Start Infrastructure (Docker)
```bash
docker-compose up -d postgres redis minio mailhog
```

Services started:
| Service  | URL                        | Credentials          |
|----------|----------------------------|----------------------|
| PostgreSQL | localhost:5432           | jmart_user/jmart_pass |
| Redis    | localhost:6379             | password: jmart_redis_pass |
| MinIO    | http://localhost:9001      | minioadmin/minioadmin |
| MailHog  | http://localhost:8025      | (no auth)            |

### 3. Install Dependencies
```bash
cd apps/api
pnpm install --ignore-scripts
```

### 4. Database Setup
```bash
# Run migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate

# Seed initial data
pnpm db:seed
```

### 5. Start API
```bash
pnpm dev
```

API running at: http://localhost:3000/api/v1
Swagger docs:   http://localhost:3000/api/docs

## Default Credentials (after seed)

| Role          | Email            | Password          |
|---------------|------------------|-------------------|
| Super Admin   | admin@jmart.sa   | Admin@Jmart2026!  |
| Ops Manager   | ops@jmart.sa     | Ops@Jmart2026!    |

## Project Structure

```
C:\Jmart\
├── apps/
│   └── api/                    ← NestJS Backend
│       ├── prisma/
│       │   ├── schema.prisma   ← Full DB schema (68 tables)
│       │   └── seed.ts         ← Initial data seed
│       └── src/
│           ├── common/         ← Guards, Filters, Decorators, DTOs
│           ├── config/         ← App, Auth, Redis, Storage configs
│           ├── prisma/         ← PrismaService
│           └── modules/        ← 17 Feature modules
│               ├── auth/
│               ├── users/
│               ├── farmers/
│               ├── buyers/
│               ├── drivers/
│               ├── geo-zones/
│               ├── inventory/
│               ├── orders/
│               ├── contracts/
│               ├── logistics/
│               ├── warehouses/
│               ├── quality/
│               ├── financial/
│               ├── disputes/
│               ├── workflow/
│               ├── notifications/
│               ├── audit/
│               └── dashboard/
├── docker/
│   └── postgres/init.sql       ← PostGIS + extensions init
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Database Commands

```bash
# Create new migration
pnpm db:migrate

# Deploy migrations (production)
pnpm db:migrate:prod

# Open Prisma Studio (DB GUI)
pnpm db:studio

# Reset database (dev only!)
pnpm db:reset
```
