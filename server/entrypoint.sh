#!/bin/sh

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

# Switch to node user and start the Node.js server
exec su-exec node node server.js
