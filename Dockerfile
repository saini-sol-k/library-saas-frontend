# Next.js production image for the Library SaaS frontend.
#
# Build:  docker build -t library-saas-frontend:<tag> .
#
# Two stages so the runtime image carries no build cache and no dev toolchain.
# `output: "standalone"` is deliberately NOT used, so the runtime stage keeps the
# full node_modules and starts the app with `next start`, exactly as the
# repository's own scripts do.
#
# No configuration is baked in. BACKEND_API_URL is read at request time by
# src/lib/env.ts, on the server only, so the same image runs against any backend.

# ---------- build ----------
FROM node:22-alpine AS build

WORKDIR /app

# package-lock.json is committed, so `npm ci` resolves an identical tree on
# every build. Copying only the manifests first keeps this layer cached when
# just application source changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Next reads NODE_ENV=production from `next build` itself; nothing here needs a
# backend to be reachable, because no API call happens at build time.
RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run unprivileged. node:22-alpine already ships a `node` user (uid 1000); a
# dedicated uid keeps this explicit and matches the securityContext in
# k8s/deployment.yaml.
RUN addgroup --system --gid 1001 appuser \
 && adduser --system --uid 1001 --ingroup appuser appuser

# Only what `next start` needs: the build output, the public assets, the
# manifests and the resolved dependency tree.
COPY --from=build --chown=appuser:appuser /app/.next ./.next
COPY --from=build --chown=appuser:appuser /app/public ./public
COPY --from=build --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appuser /app/package.json ./package.json
COPY --from=build --chown=appuser:appuser /app/next.config.ts ./next.config.ts

USER appuser

EXPOSE 3000

# Container-level check for plain `docker run`. Kubernetes overrides this with
# its own readiness and liveness probes against the same path.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -q --spider "http://127.0.0.1:${PORT}/login" || exit 1

CMD ["npm", "run", "start"]
