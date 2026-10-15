# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma
# Build-only placeholders. No database is contacted or migrated during build.
RUN DATABASE_URL=mysql://build:build@127.0.0.1:9/build \
    SHADOW_DATABASE_URL=mysql://build:build@127.0.0.1:9/build_shadow \
    pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN mkdir -p public
RUN DATABASE_URL=mysql://build:build@127.0.0.1:9/build \
    APP_URL=https://build.invalid NODE_ENV=production pnpm build

FROM base AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
# Keep the installed CLI toolchain for explicit migrate/seed commands.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json /app/tsconfig.json /app/next.config.js ./
USER node
EXPOSE 3000
CMD ["node", "scripts/runtime.mjs", "web"]
