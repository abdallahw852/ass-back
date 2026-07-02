# ── base: Node + pnpm ─────────────────────────────
FROM node:22-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app

# ── dev: deps only (used by docker-compose.dev.yml) ─
FROM base AS dev
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
RUN mkdir -p /app/uploads

# ── build: compile TypeScript → dist/ ─────────────
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:prod
# Fail fast if the expected entrypoint is missing
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found after build" && ls -R dist && exit 1)

# ── migrator: run DB migrations during deploys ─────
FROM base AS migrator
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY src/ ./src/
COPY tsconfig.json tsconfig.migration.json ./
COPY scripts/ ./scripts/
CMD ["pnpm", "migration:run"]

# ── runner: lean production image ─────────────────
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN npm install -g pnpm@10
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/pnpm-workspace.yaml ./
# Install production deps only
RUN pnpm install --frozen-lockfile --prod
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
