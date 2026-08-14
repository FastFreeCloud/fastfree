# ╔══════════════════════════════════════════════════════╗
# ║     FastFree — Multi-stage Production Dockerfile    ║
# ║                  (Official Next.js Style)            ║
# ╚══════════════════════════════════════════════════════╝

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ── Stage 1: Dependencies ─────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Builder ──────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compile Prisma seed to JS
RUN npx tsc prisma/seed.ts --target es2022 --module commonjs --allowSyntheticDefaultImports --esModuleInterop --moduleResolution node --outDir prisma-dist

# Build Next.js (standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Runner ───────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets
COPY --from=builder /app/public ./public

# Create .next cache directory
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + seed (needed for db push & seed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma-dist ./prisma-dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Copy bcrypt (needed for seed)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcrypt ./node_modules/bcrypt

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start Next.js standalone server directly (official way)
CMD ["node", "server.js"]
