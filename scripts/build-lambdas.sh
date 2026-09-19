#!/bin/bash
set -e

echo "Building AWS Lambdas..."

mkdir -p dist/aws
rm -rf dist/aws/*

echo "1. Building remique-webhook..."
npx esbuild src/aws/webhook/index.ts --bundle --platform=node --target=node20 --outfile=dist/aws/webhook/index.js
cd dist/aws/webhook
zip -qr ../remique-webhook.zip .
cd ../../..

echo "2. Building remique-worker..."
# Notice: no --external flag needed anymore since Drizzle bundles perfectly
npx esbuild src/aws/worker/index.ts --bundle --platform=node --target=node20 --outfile=dist/aws/worker/index.js

cd dist/aws/worker
zip -qr ../remique-worker.zip .
cd ../../..

echo "🎉 Build complete! Upload the .zip files in dist/aws/ to your AWS Lambdas."
