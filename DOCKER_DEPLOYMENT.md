# IntegrityHVAC CRM - Docker Deployment

## Quick Start with Docker

### Option 1: Docker Compose (Recommended)

1. **Build and start the container:**
```bash
docker-compose up -d --build
```

2. **Access the application:**
   - Open browser to: `http://localhost:8677`
   - The app serves both frontend and backend on port 8677

3. **View logs:**
```bash
docker-compose logs -f
```

4. **Stop the container:**
```bash
docker-compose down
```

### Option 2: Docker Only

1. **Build the image:**
```bash
docker build -t integrityhvac-crm .
```

2. **Run the container:**
```bash
docker run -d \
  --name integrityhvac-crm \
  -p 8677:8677 \
  -v $(pwd)/data:/app/data \
  integrityhvac-crm
```

3. **Access the application:**
   - Open browser to: `http://localhost:8677`

## Data Persistence

The `leads.json` file is stored in a volume mount at `./data`. This ensures your lead data persists even if the container is stopped or removed.

## Environment Variables

You can customize the following environment variables:

- `PORT`: Server port (default: 8677)
- `NODE_ENV`: Environment mode (default: production)

Example with custom variables:
```bash
docker run -d \
  --name integrityhvac-crm \
  -p 8677:8677 \
  -e PORT=8677 \
  -e NODE_ENV=production \
  -v $(pwd)/data:/app/data \
  integrityhvac-crm
```

## What Gets Deployed

The Docker container includes:
- Built React frontend (served as static files)
- Express.js backend API
- All dependencies
- Runs on a single port (8677)

## SIP/WebRTC Calling

The WebRTC calling feature requires HTTPS in production environments. When deploying behind a reverse proxy (nginx, Caddy, Traefik):

1. Enable HTTPS with SSL certificates
2. Configure WebSocket support
3. Update SIP settings in the app UI (Settings button)

## Troubleshooting

**Container won't start:**
```bash
docker logs integrityhvac-crm
```

**Check if container is running:**
```bash
docker ps
```

**Access container shell:**
```bash
docker exec -it integrityhvac-crm sh
```

**Rebuild after code changes:**
```bash
docker-compose down
docker-compose up -d --build
```

## Production Deployment

For production deployment with HTTPS:

1. Use a reverse proxy (nginx, Caddy, Traefik)
2. Configure SSL certificates (Let's Encrypt recommended)
3. Set up WebSocket support for SIP calling
4. Configure firewall rules for ports 8677, 80, 443

Example nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8677;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
