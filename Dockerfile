# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

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

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init and OpenSSL 1.1 compatibility (needed by Prisma engines on Alpine)
RUN apk add --no-cache dumb-init openssl1.1-compat

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy package files and prisma (optional for runtime tooling)
COPY package*.json ./
COPY prisma ./prisma/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals (alpine installs it to /usr/bin)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["npm", "start"]
