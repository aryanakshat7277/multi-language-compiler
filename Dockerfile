# ═══════════════════════════════════════════════════════════════════
# CodeForge Pro — Production Multi-Language Platform Container
# Includes Node.js, Python 3, GCC/G++, OpenJDK, Go, Rust, TypeScript
# ═══════════════════════════════════════════════════════════════════
FROM ubuntu:22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV DATABASE_URL="file:./dev.db"
ENV PORT=3001

# 1. Install system tools, compilers and runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    gcc \
    g++ \
    python3 \
    python3-pip \
    openjdk-17-jdk-headless \
    golang-go \
    rustc \
    cargo \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest typescript tsx

# 3. Create app directory
WORKDIR /app

# 4. Copy package manifests
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY worker/package*.json ./worker/

# 5. Install dependencies
RUN npm install

# 6. Copy source code
COPY . .

# 7. Generate Prisma client & build backend and frontend
RUN cd backend && npx prisma generate && npm run build
RUN cd frontend && npm run build

# 8. Seed database
RUN cd backend && npx prisma db push && npx prisma db seed

# 9. Expose application port
EXPOSE 3001

# 10. Start unified production server
WORKDIR /app/backend
CMD ["node", "dist/index.js"]
