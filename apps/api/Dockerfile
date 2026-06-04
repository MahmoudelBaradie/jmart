FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./

# ─── Development ─────────────────────────────────────────
FROM base AS development
RUN pnpm install
COPY . .
RUN pnpm db:generate
EXPOSE 3000
CMD ["pnpm", "dev"]

# ─── Builder ─────────────────────────────────────────────
FROM base AS builder
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm db:generate
RUN pnpm build

# ─── Production ──────────────────────────────────────────
FROM node:20-alpine AS production
# `prisma` CLI lives in devDependencies, which `pnpm install --prod` skips.
# Install it as a global binary here so we can `prisma generate` against
# @prisma/client (which IS in regular deps).
RUN npm install -g pnpm prisma@5.10.2 && apk add --no-cache curl
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --no-frozen-lockfile
# Generate fresh Prisma client in this stage — copying it from the builder
# fails because pnpm uses symlinks under node_modules/.pnpm.
COPY prisma ./prisma
RUN prisma generate
COPY --from=builder /app/dist ./dist
# Drop privileges — never run a public-facing Node process as root
RUN chown -R node:node /app
USER node
EXPOSE 3000
# Orchestrators (k8s, docker swarm, compose) use this to detect readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/docs > /dev/null || exit 1
CMD ["node", "dist/main"]
