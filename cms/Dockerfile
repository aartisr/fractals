# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.mjs file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:22.17.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# libc6-compat may be needed for some native modules
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Use pnpm only for deterministic, fast installs; cache store across builds
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store-cms,target=/root/.pnpm-store \
    npm i -g pnpm@10.18.3 \
 && pnpm config set store-dir /root/.pnpm-store \
 && pnpm i --frozen-lockfile


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
# Ensure pnpm is available in this stage as well
RUN npm i -g pnpm@10.18.3 \
 && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Disable telemetry during runtime as well
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Remove this line if you do not have this folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD HOSTNAME="0.0.0.0" node server.js

# Utility stage with full source and pnpm for running Payload CLI (migrations, etc.)
FROM deps AS cli
WORKDIR /app
COPY . .
ENTRYPOINT ["pnpm"]
