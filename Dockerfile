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

# Copy server files
COPY server/package*.json ./
RUN npm install --production

COPY server/ ./

# Copy built client from previous stage
COPY --from=client-build /app/client/dist ./public

# Expose port 8677
EXPOSE 8677

# Start the server
CMD ["node", "server.js"]
