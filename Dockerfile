# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /build

# Copy root package.json + lockfile
COPY package.json pnpm-lock.yaml ./

# Install pnpm + ALL deps (need typescript to compile)
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy server source + tsconfig
COPY tsconfig.server.json server.ts ./

# Compile TypeScript → JavaScript (ESM)
RUN npx tsc -p tsconfig.server.json

# ── Stage 2: Run ────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Runtime env vars (all configurable)
ENV PORT=3000
ENV UPLOAD_DIR=/uploads
ENV NODE_ENV=production

# Copy package manifest and install ONLY production deps (smaller image)
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile && npm remove -g pnpm

# Copy compiled JS from build stage
COPY --from=build /build/dist-server/server.js ./

# Create upload directory
RUN mkdir -p /uploads && chown node:node /uploads

USER node

EXPOSE 3000

CMD ["node", "server.js"]
