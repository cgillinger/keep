# ---- Build stage: install all deps (incl. esbuild) and build frontend bundles ----
FROM node:22-alpine AS build

WORKDIR /app

# Toolchain for compiling native modules (sqlite3, sharp) from source when no
# musl/node-22 prebuilt binary is available. Installed only in the build stage;
# the runtime image carries the compiled binaries, not the compilers.
RUN apk add --no-cache python3 make g++

# Install dependencies (including devDependencies needed for the build).
# npm ci installs exactly what package-lock.json pins, so image builds are
# reproducible instead of resolving fresh ^-ranged versions each time.
COPY package*.json ./
RUN npm ci

# Copy sources and build the fingerprinted bundles into public/dist
COPY . .
RUN npm run build

# Drop devDependencies so only production deps are carried to the runtime image
RUN npm prune --production

# ---- Runtime stage ----
FROM node:22-alpine

WORKDIR /app

# su-exec lets the entrypoint drop from root to the node user after fixing the
# ownership of the bind-mounted data/log directories.
RUN apk add --no-cache su-exec

# Carry over the pruned node_modules and the built application (incl. public/dist)
COPY --from=build /app /app

# Entrypoint fixes mount ownership (as root) then execs the app as the node user.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/data /app/logs \
    && chown -R node:node /app

# Expose port
EXPOSE 3000

# Container health: hit the app root; unhealthy if it errors or 5xx's.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
