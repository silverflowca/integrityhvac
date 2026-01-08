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

# Start the Node.js server
exec node server.js
