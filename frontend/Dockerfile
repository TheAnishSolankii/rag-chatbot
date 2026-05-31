# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

# Inject the API URL at build time (override in docker-compose or CI)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config (mounted at runtime via docker-compose, or embedded here)
COPY nginx.frontend.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://localhost/health.txt || exit 1

CMD ["nginx", "-g", "daemon off;"]
