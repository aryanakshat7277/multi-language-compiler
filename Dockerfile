# ==============================================================================
# CODEFORGE PRO — PRODUCTION MULTI-STAGE DOCKERFILE
# Builds frontend, compiles backend TypeScript, and bundles standard runtimes.
# ==============================================================================

# ─── STAGE 1: Frontend & Backend Builder ──────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/backend/prisma/dev.db"

# Install build tools & openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package manifests for optimal layer caching
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install all dependencies
RUN npm install

# Copy source trees
COPY . .

# Build arguments for frontend embedding (Firebase configuration)
ARG VITE_FIREBASE_API_KEY=AIzaSyB2NlX3Hy5BY18MYeqf2tPHmvFQOjrvxso
ARG VITE_FIREBASE_AUTH_DOMAIN=codeforge-a.firebaseapp.com
ARG VITE_FIREBASE_PROJECT_ID=codeforge-a
ARG VITE_FIREBASE_STORAGE_BUCKET=codeforge-a.firebasestorage.app
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=687684067787
ARG VITE_FIREBASE_APP_ID=1:687684067787:web:9166da51d8f9466914564e
ARG VITE_FIREBASE_MEASUREMENT_ID=G-YRCTE5YDQ3

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID

# Generate Prisma Client, build database schema and seed
RUN cd backend && npx prisma generate && npx prisma db push && npx prisma db seed
RUN npm run build:frontend
RUN npm run build:backend

# ─── STAGE 2: Production Container Runtime ────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="file:/app/backend/prisma/dev.db"

# Install standard compiler toolchains for local sandbox execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    python3 \
    python3-pip \
    php-cli \
    ruby \
    curl \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy root package manifest & install production dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install --omit=dev --workspace=compiler-backend

# Copy built frontend SPA assets (served by Express on single port 3001)
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy compiled backend output & Prisma artifacts (including baked SQLite dev.db)
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/compiler/health || exit 1

CMD ["node", "backend/dist/index.js"]
