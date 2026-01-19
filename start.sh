#!/bin/bash

# Keep Clone startup script

echo "Starting Keep Clone..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js 18 or later"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Create data directory
mkdir -p data

# Start the server
echo "Keep Clone is starting on port 3000..."
node server.js
