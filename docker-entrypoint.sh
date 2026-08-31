#!/bin/sh
set -e

mkdir -p /app/data/uploads /app/data/qrcodes
chown -R nextjs:nodejs /app/data || true

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting CampaignDeck..."
exec su-exec nextjs node server.js
