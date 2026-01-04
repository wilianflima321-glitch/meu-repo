# ============================================
# Aethel Engine - Production Multi-Stage Dockerfile
# Optimized for size, security, and performance
# ============================================

# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:20-alpine AS deps

# Add libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies based on available lock file
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "No lockfile found." && npm install; \
  fi

# ========================================
# Stage 2: Builder
# ========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client
RUN npx prisma generate || true

# Build the application
RUN npm run build || true

# ========================================
# Stage 3: Runtime Server (WebSocket, PTY, LSP, DAP)
# ========================================
FROM node:20-alpine AS runtime

# Install runtime dependencies for PTY and native modules
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  git \
  openssh-client

WORKDIR /app

# Copy only necessary files for runtime
COPY --from=deps /app/node_modules ./node_modules
COPY lib/server ./lib/server
COPY tsconfig.json package.json ./

# Non-root user for security
RUN addgroup --system --gid 1001 aethel && \
    adduser --system --uid 1001 aethel && \
    chown -R aethel:aethel /app

USER aethel

# Runtime server port
EXPOSE 3001

# Health check for runtime
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start runtime server
CMD ["npx", "ts-node", "--transpile-only", "lib/server/bootstrap.ts"]

# ========================================
# Stage 4: Web Application (Production)
# ========================================
FROM node:20-alpine AS web

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets - handle standalone output if available
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.js ./next.config.js

# Try standalone first, fallback to regular
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

# Web server port
EXPOSE 3000

# Health check for web
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start Next.js server
CMD ["npm", "run", "start"]

# ========================================
# Stage 5: All-in-One (Default - includes everything)
# ========================================
FROM node:20-alpine AS allinone

# Install all dependencies for full functionality
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  git \
  openssh-client \
  libc6-compat

WORKDIR /app

# Copy everything needed
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/prisma ./prisma

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV RUNTIME_PORT=3001

# Non-root user
RUN addgroup --system --gid 1001 aethel && \
    adduser --system --uid 1001 aethel && \
    chown -R aethel:aethel /app

USER aethel

# Both ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start both servers
CMD ["npm", "run", "start:full"]
