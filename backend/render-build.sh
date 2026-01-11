#!/bin/bash
#Render build script for Playwright support

set -e  # Exit on error

echo "Installing npm dependencies..."
npm install

echo "Installing Playwright Chromium with system dependencies..."
npx playwright install --with-deps chromium

echo "Building application..."
npm run build

echo "Build complete!"
