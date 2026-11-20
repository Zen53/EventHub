# syntax=docker/dockerfile:1
# Contexte de build : la racine du dépôt (l'API dépend de packages/schemas).

FROM node:24-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

# --- Build : dépendances complètes, schémas partagés puis API ---
FROM base AS build
COPY packages/schemas/package.json packages/schemas/pnpm-lock.yaml packages/schemas/tsconfig.json packages/schemas/
COPY packages/schemas/src packages/schemas/src
RUN cd packages/schemas && pnpm install --frozen-lockfile && pnpm build

COPY apps/api-core/package.json apps/api-core/pnpm-lock.yaml apps/api-core/pnpm-workspace.yaml apps/api-core/
RUN cd apps/api-core && pnpm install --frozen-lockfile
COPY apps/api-core apps/api-core
RUN cd apps/api-core && pnpm build

# --- Migrations : drizzle-kit est une dépendance de dev, on part du build ---
FROM build AS migrate
WORKDIR /app/apps/api-core
CMD ["pnpm", "db:migrate"]

# --- Runtime : uniquement les dépendances de production ---
FROM build AS prune
RUN cd apps/api-core && pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Les schémas sont liés par un lien symbolique (link:../../packages/schemas) ;
# leur node_modules fournit zod quand Node résout les imports depuis dist/.
COPY --from=prune /app/packages/schemas/package.json packages/schemas/package.json
COPY --from=prune /app/packages/schemas/dist packages/schemas/dist
COPY --from=prune /app/packages/schemas/node_modules packages/schemas/node_modules
COPY --from=prune /app/apps/api-core/package.json apps/api-core/package.json
COPY --from=prune /app/apps/api-core/node_modules apps/api-core/node_modules
COPY --from=prune /app/apps/api-core/dist apps/api-core/dist
WORKDIR /app/apps/api-core
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
