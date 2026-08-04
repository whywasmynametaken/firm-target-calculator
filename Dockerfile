FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV WRANGLER_WRITE_LOGS=false
ENV WRANGLER_LOG_PATH=/data/wrangler.log
ENV MINIFLARE_REGISTRY_PATH=/data/registry

EXPOSE 3000
VOLUME ["/data"]

CMD ["./node_modules/.bin/wrangler", "dev", "dist/server/index.js", "--config", "dist/server/wrangler.json", "--ip", "0.0.0.0", "--port", "3000", "--local", "--persist-to", "/data/wrangler-state", "--inspector-port", "0", "--log-level", "warn", "--show-interactive-dev-session=false"]
