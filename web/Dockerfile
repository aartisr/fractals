ARG NODE_VERSION=22.12.0

# Use Debian-based image to ensure sharp prebuilt binaries work (glibc)
FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /usr/src/app

FROM base AS deps
# Install dependencies from package.json only to avoid stale lockfile bringing unwanted deps
COPY package.json ./package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    npm i -g pnpm@10.18.3 \
 && pnpm config set store-dir /root/.pnpm-store \
 && pnpm i --no-lockfile

FROM deps AS build

# Accept build arguments from docker-compose
ARG CMS_URL
ARG CMS_API_KEY
ARG AUTH_BASE
ARG AUTH_CLIENT_ID
ARG AUTH_CLIENT_SECRET
ARG AUTH_REDIRECT_URI
ARG AUTH_ERROR_URL
ARG MEDIA_BASE_URL
ARG ORIGIN

# Make them available as environment variables during build
ENV CMS_URL=${CMS_URL}
ENV CMS_API_KEY=${CMS_API_KEY}
ENV AUTH_BASE=${AUTH_BASE}
ENV AUTH_CLIENT_ID=${AUTH_CLIENT_ID}
ENV AUTH_CLIENT_SECRET=${AUTH_CLIENT_SECRET}
ENV AUTH_REDIRECT_URI=${AUTH_REDIRECT_URI}
ENV AUTH_ERROR_URL=${AUTH_ERROR_URL}
ENV MEDIA_BASE_URL=${MEDIA_BASE_URL}
ENV ORIGIN=${ORIGIN}

COPY . .
# Build client and server for the Express adapter
RUN pnpm run build && pnpm run build.server

# Produce production-only node_modules
FROM deps AS prod-deps
RUN pnpm prune --prod

FROM node:${NODE_VERSION}-bookworm-slim AS final
ENV NODE_ENV=production
WORKDIR /usr/src/app

# app runtime files
COPY package.json ./package.json
# Copy pruned production dependencies only
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
USER node
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/server ./server

EXPOSE 3000
CMD ["node", "server/entry.express"]
