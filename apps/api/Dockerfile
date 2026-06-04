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
RUN npm install -g pnpm && apk add --no-cache curl
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --no-frozen-lockfile
# pnpm stores Prisma client as a symlink under node_modules/.pnpm — copying
# /app/node_modules/.prisma from the builder yields a broken link. Generate
# fresh in this stage instead; needs the schema, hence prisma/ is copied first.
COPY prisma ./prisma
RUN pnpm db:generate
COPY --from=builder /app/dist ./dist
# Drop privileges — never run a public-facing Node process as root
RUN chown -R node:node /app
USER node
EXPOSE 3000
# Orchestrators (k8s, docker swarm, compose) use this to detect readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/docs > /dev/null || exit 1
CMD ["node", "dist/main"]
