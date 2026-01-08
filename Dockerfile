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

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++

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

# Switch to node user for security
USER node

# Expose port 8677
EXPOSE 8677

# Use entrypoint script to initialize data files
ENTRYPOINT ["/app/entrypoint.sh"]
