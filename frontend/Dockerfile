# Multi-stage hardened production Dockerfile for Campus Connect Web Dashboard
# Stage 1: Build static React bundle
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# Stage 2: Hardened Nginx runtime
FROM nginx:alpine AS runner

# Apply OS security patches
RUN apk update && apk upgrade --no-cache && apk add --no-cache curl

# Remove default nginx configurations
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy hardened nginx configuration with strict CSP and security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Set proper read-only permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

USER nginx

CMD ["nginx", "-g", "daemon off;"]
