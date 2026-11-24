# syntax=docker/dockerfile:1
# Contexte de build : la racine du dépôt (workspace pnpm).

FROM node:24-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate
WORKDIR /app

# --- Build : dépendances du workspace, schémas partagés puis API ---
FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/schemas/package.json packages/schemas/tsconfig.json packages/schemas/
COPY packages/schemas/src packages/schemas/src
COPY apps/api-core/package.json apps/api-core/
RUN pnpm install --frozen-lockfile --filter @eventhub/api-core...
COPY apps/api-core apps/api-core
RUN pnpm --filter @eventhub/api-core build

# --- Migrations : drizzle-kit est une dépendance de dev, on part du build ---
FROM build AS migrate
WORKDIR /app/apps/api-core
CMD ["pnpm", "db:migrate"]

# --- Runtime : l'API et ses dépendances de production, schémas inclus ---
FROM build AS deploy
RUN pnpm --filter @eventhub/api-core deploy --prod --legacy /prod/api-core

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deploy /prod/api-core/package.json package.json
COPY --from=deploy /prod/api-core/node_modules node_modules
COPY --from=build /app/apps/api-core/dist dist
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
