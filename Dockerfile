# ---- Build stage: install all deps (incl. esbuild) and build frontend bundles ----
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies (including devDependencies needed for the build)
COPY package*.json ./
RUN npm install

# Copy sources and build the fingerprinted bundles into public/dist
COPY . .
RUN npm run build

# Drop devDependencies so only production deps are carried to the runtime image
RUN npm prune --production

# ---- Runtime stage ----
FROM node:18-alpine

WORKDIR /app

# Carry over the pruned node_modules and the built application (incl. public/dist)
COPY --from=build /app /app

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
