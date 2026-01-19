#!/bin/sh

# Debug: Print environment variables (helpful for Railway debugging)
echo "🔍 Entrypoint Environment Check:"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "SUPABASE_URL: ${SUPABASE_URL:0:30}... (${#SUPABASE_URL} chars)"
echo "SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY:0:20}... (${#SUPABASE_SERVICE_KEY} chars)"
echo "JWT_SECRET: ${JWT_SECRET:0:10}... (${#JWT_SECRET} chars)"
echo "PORT: ${PORT:-not set}"
echo ""

# Create data directory if it doesn't exist
mkdir -p /app/data

# Initialize users.json if it doesn't exist
if [ ! -f /app/data/users.json ]; then
    echo "[]" > /app/data/users.json
fi

# Initialize leads.json if it doesn't exist
if [ ! -f /app/data/leads.json ]; then
    echo "[]" > /app/data/leads.json
fi

# Set ownership to node user
chown -R node:node /app/data

# Start the Node.js server directly (Railway runs in isolated container, no need for user switching)
exec node server.js
