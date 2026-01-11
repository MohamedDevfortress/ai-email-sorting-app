#!/usr/bin/env bash
# Render build script for Playwright support
set -o errexit

echo "Installing npm dependencies..."
npm install

echo "Building NestJS application..."
npm run build

echo "Installing Playwright Chromium (without system dependencies)..."
# Skip system dependencies to avoid permission issues on Render
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 npx playwright install chromium

echo "Build complete!"
