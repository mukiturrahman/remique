#!/bin/bash
set -e

echo "Building AWS Lambdas..."

mkdir -p dist/aws
rm -rf dist/aws/*

echo "1. Building remique-webhook..."
npx esbuild src/aws/webhook/index.ts --bundle --platform=node --target=node20 --outfile=dist/aws/webhook/index.js
cd dist/aws/webhook
zip -r ../remique-webhook.zip .
cd ../../..

echo "2. Building remique-worker..."
npx esbuild src/aws/worker/index.ts --bundle --platform=node --target=node20 --outfile=dist/aws/worker/index.js --external:@prisma/client

# Copy Prisma schema and generated clients
# Copy Prisma schema and generated clients
mkdir -p dist/aws/worker/prisma
mkdir -p dist/aws/worker/node_modules
cp prisma/schema.prisma dist/aws/worker/prisma/
cp -r node_modules/@prisma dist/aws/worker/node_modules/
cp -r node_modules/.prisma dist/aws/worker/node_modules/

# Remove unnecessary files to keep lambda size small (< 50MB)
rm -rf dist/aws/worker/node_modules/@prisma/engines
rm -f dist/aws/worker/node_modules/.prisma/client/*darwin*
rm -f dist/aws/worker/node_modules/.prisma/client/*windows*

cd dist/aws/worker
zip -qr ../remique-worker.zip .
cd ../../..

echo "🎉 Build complete! Upload the .zip files in dist/aws/ to your AWS Lambdas."
