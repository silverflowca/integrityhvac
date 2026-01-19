#!/bin/bash

# Push local database schema to staging
# This script uses Supabase CLI to apply migrations to the staging environment

echo "🚀 Pushing database migrations to staging..."
echo "=============================================="

# Set the staging project reference
PROJECT_REF="mladgojbfyofgauiylxw"
STAGING_URL="https://mladgojbfyofgauiylxw.supabase.co"

# Navigate to project root
cd "$(dirname "$0")/../../.."

echo "📍 Current directory: $(pwd)"
echo "📍 Target: $STAGING_URL"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Link to staging project
echo "🔗 Linking to staging project..."
supabase link --project-ref $PROJECT_REF

if [ $? -ne 0 ]; then
    echo "❌ Failed to link to staging project"
    echo "Make sure SUPABASE_ACCESS_TOKEN is set in your environment"
    exit 1
fi

echo "✅ Linked to staging project"
echo ""

# Push migrations
echo "📤 Pushing migrations to staging..."
supabase db push --linked

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations pushed successfully!"
    echo ""
    echo "🎉 Your staging database is now up to date!"
else
    echo ""
    echo "❌ Failed to push migrations"
    echo "Check the errors above for details"
    exit 1
fi
