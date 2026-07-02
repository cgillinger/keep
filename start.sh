#!/bin/bash

# Keep Clone startup script

set -e

# Run from the script's own directory so node_modules/data are created here,
# not in whatever directory the script happened to be invoked from.
cd "$(dirname "$0")"

echo "Starting Keep Clone..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js 20 or later"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the fingerprinted frontend bundles into public/dist. The server prefers
# public/dist when present, so without this a bare-metal deploy would serve stale
# frontend code after a source change.
echo "Building frontend bundles..."
npm run build

# Create data directory
mkdir -p data

# Start the server
PORT="${PORT:-3000}"
echo "Keep Clone is starting on port ${PORT}..."
node server.js
