#!/bin/bash

# Sync Railway Variables from .env.staging
# This script reads your .env.staging file and sets them in Railway

echo "🚀 Syncing environment variables to Railway..."
echo "================================================"

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "OR set variables manually in Railway dashboard:"
    echo "  https://railway.app/project/YOUR_PROJECT_ID"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Navigate to server directory
cd "$(dirname "$0")/.."

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    echo "❌ .env.staging file not found!"
    exit 1
fi

echo "📝 Reading .env.staging..."
echo ""

# Read and set each variable
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^#.* ]] && continue

    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    # Skip empty values
    [[ -z "$value" ]] && continue

    echo "Setting: $key"
    railway variables set "$key=$value"
done < .env.staging

echo ""
echo "✅ All variables synced to Railway!"
echo ""
echo "🔄 Railway will now redeploy your app automatically"
echo "📋 Check deployment logs to verify connection"
