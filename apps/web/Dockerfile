# syntax=docker/dockerfile:1
# Contexte de build : la racine du dépôt (workspace pnpm).

FROM node:24-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/schemas/package.json packages/schemas/tsconfig.json packages/schemas/
COPY packages/schemas/src packages/schemas/src
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @eventhub/web...
COPY apps/web apps/web

# Adresse de l'API vue depuis le conteneur du front, utilisée par les rewrites
# de next.config.ts (/auth/*, /me). Passée au build et à l'exécution.
ARG API_URL=http://api:3001
ENV API_URL=${API_URL}
RUN pnpm --filter @eventhub/web... build

FROM build AS runtime
ENV NODE_ENV=production
RUN chown -R node:node /app/apps/web/.next
WORKDIR /app/apps/web
USER node
EXPOSE 3000
CMD ["./node_modules/.bin/next", "start", "--port", "3000"]
