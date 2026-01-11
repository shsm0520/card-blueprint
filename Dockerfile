# Build stage (Debian-based to match Prisma glibc/openssl binaries)
FROM node:20-slim AS builder

WORKDIR /app

# Install build essentials
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (tolerate peer conflicts on CI)
# npm ci is preferred; fall back to npm install if needed
RUN npm ci --legacy-peer-deps --no-audit --progress=false || \
    npm install --legacy-peer-deps --no-audit --progress=false

# Copy application code
COPY . .

# Build Next.js application
RUN npm run build

# Prune dev dependencies to prepare production node_modules
RUN npm prune --production

# Runtime stage (Debian-based to keep libc/ssl in sync with builder)
FROM node:20-slim

WORKDIR /app

# Install dumb-init for signal handling
RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy package files, config, and prisma
COPY package*.json ./
COPY next.config.ts ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals, and run migrations before starting
# dumb-init -> sh -> migrate -> seed -> npm start
ENTRYPOINT ["/usr/bin/dumb-init", "sh", "-c", "npx prisma migrate deploy && (npx prisma db seed || true) && npm start"]
