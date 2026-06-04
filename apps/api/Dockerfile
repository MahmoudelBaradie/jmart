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
# OpenSSL + curl: prisma client needs openssl at runtime, curl for healthcheck.
RUN apk add --no-cache curl openssl
WORKDIR /app
# Copy the already-installed node_modules + generated Prisma client from the
# builder stage. This avoids re-running `pnpm install --prod` (which would
# strip out the `prisma` CLI) and `prisma generate` (which needs the local
# @prisma/client install pnpm produced — global prisma can't find it).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY prisma ./prisma
# Drop privileges — never run a public-facing Node process as root
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/docs > /dev/null || exit 1
CMD ["node", "dist/src/main.js"]
