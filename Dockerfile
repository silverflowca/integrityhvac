# Multi-stage build for IntegrityHVAC CRM
FROM node:20-alpine AS client-build

# Build the React client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install build dependencies for bcrypt and su-exec for user switching
RUN apk add --no-cache python3 make g++ su-exec

# Copy server files
COPY server/package*.json ./
RUN npm install --production

COPY server/ ./

# Copy built client from previous stage
COPY --from=client-build /app/client/dist ./public

# Create data directory and set ownership to node user
RUN mkdir -p /app/data && \
    chown -R node:node /app && \
    chmod -R 755 /app/data && \
    chmod +x /app/entrypoint.sh

# Expose port (Railway will override with its own PORT)
EXPOSE 8677

# Debug: Show what's in the container at build time
RUN echo "📦 Docker build complete" && ls -la /app

# Use entrypoint script to initialize data files and start server
ENTRYPOINT ["/app/entrypoint.sh"]
