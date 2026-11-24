# Multi-stage hardened production Dockerfile for Campus Connect Backend
# Stage 1: Build & compile TypeScript
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for compiling native modules (if any)
RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Stage 2: Minimal hardened runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Install security update packages & dumb-init for graceful signal termination
RUN apk update && apk upgrade --no-cache && apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=4000

# Create dedicated non-root user and group
USER node

# Copy compiled assets and production dependencies from builder
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node src/database/migrations ./dist/database/migrations

EXPOSE 4000

# Health check to monitor container health and trigger auto-healing
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Execute through dumb-init to handle SIGTERM/SIGINT signals securely
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
