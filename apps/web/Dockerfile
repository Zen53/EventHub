# syntax=docker/dockerfile:1
# Contexte de build : la racine du dépôt (le front dépend de packages/schemas).

FROM node:24-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS build
COPY packages/schemas/package.json packages/schemas/pnpm-lock.yaml packages/schemas/tsconfig.json packages/schemas/
COPY packages/schemas/src packages/schemas/src
RUN cd packages/schemas && pnpm install --frozen-lockfile && pnpm build

COPY apps/web/package.json apps/web/pnpm-lock.yaml apps/web/pnpm-workspace.yaml apps/web/
RUN cd apps/web && pnpm install --frozen-lockfile
COPY apps/web apps/web

# Adresse de l'API vue depuis le conteneur du front, utilisée par les rewrites
# de next.config.ts (/auth/*, /me). Passée au build et à l'exécution.
ARG API_URL=http://api:3001
ENV API_URL=${API_URL}
RUN cd apps/web && pnpm build

FROM build AS runtime
ENV NODE_ENV=production
RUN chown -R node:node /app/apps/web/.next
WORKDIR /app/apps/web
USER node
EXPOSE 3000
CMD ["./node_modules/.bin/next", "start", "--port", "3000"]
