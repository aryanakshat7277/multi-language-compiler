# 🚀 CodeForge Pro — Production Deployment Guide
## Architecture & Real-World Hosting for 1,000+ Concurrent Users

This document outlines the step-by-step instructions to take CodeForge from local development to a live, public, high-concurrency production server with custom domain and HTTPS.

---

## 🖥️ Recommended Server Hardware (1,000 Concurrent Users)
- **CPU**: 4 to 8 vCPUs (e.g., AWS c6i.xlarge / c6i.2xlarge, DigitalOcean 4 vCPU Droplet, or Hetzner CPX31)
- **RAM**: 8 GB to 16 GB
- **Disk**: 50 GB NVMe / SSD
- **Operating System**: Ubuntu 22.04 LTS or Debian 12

---

## 🐳 OPTION 1: Docker Container Deployment (Fastest & Easiest)

The platform includes a root multi-stage Dockerfile pre-configured with all 8 compilers and runtimes (Python 3, Node.js, TypeScript, GCC/G++, OpenJDK 17, Go, Rust).

### 1. Clone repository on your server:
`ash
git clone https://github.com/your-username/multi-language-compiler.git /var/www/codeforge
cd /var/www/codeforge
`

### 2. Launch with Docker Compose:
`ash
docker compose -f docker-compose.prod.yml up -d --build
`

### 3. Check logs and health status:
`ash
docker compose -f docker-compose.prod.yml logs -f
curl http://localhost:3001/api/health/telemetry
`

Your unified platform (React frontend + Express API + WebSocket) is now running live on port 3001!

---

## 🌐 OPTION 2: Ubuntu Linux VPS (PM2 + Nginx Reverse Proxy + SSL)

If deploying directly on a Linux VPS (DigitalOcean Droplet, AWS EC2, Linode, or Hetzner):

### 1. Install System Compilers & Node.js 20
`ash
sudo apt update && sudo apt install -y curl build-essential gcc g++ python3 python3-pip openjdk-17-jdk-headless golang-go rustc cargo nginx certbot python3-certbot-nginx

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2 typescript tsx
`

### 2. Build the Application
`ash
cd /var/www/codeforge
npm install
npm run build:frontend
npm run build:backend
cd backend && npx prisma db push && npx prisma db seed
`

### 3. Start Backend with PM2 (Multi-Core Cluster)
`ash
cd /var/www/codeforge/backend
pm2 start dist/index.js -i max --name codeforge-pro
pm2 save
pm2 startup
`

### 4. Configure Nginx Reverse Proxy
Create /etc/nginx/sites-available/codeforge:
`
ginx
server {
    listen 80;
    server_name codeforge.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade ;
        proxy_set_header Connection  upgrade;
        proxy_set_header Host System.Management.Automation.Internal.Host.InternalHost;
        proxy_set_header X-Real-IP ;
        proxy_set_header X-Forwarded-For ;
        proxy_set_header X-Forwarded-Proto ;
        proxy_read_timeout 86400;
    }
}
`

Enable site & reload Nginx:
`ash
sudo ln -s /etc/nginx/sites-available/codeforge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
`

### 5. Enable HTTPS with Free Let''s Encrypt SSL
`ash
sudo certbot --nginx -d codeforge.yourdomain.com
`

---

## ☁️ OPTION 3: One-Click Cloud PaaS (Railway / Render / Fly.io)

1. Push your repository to **GitHub**.
2. Log in to **[Railway.app](https://railway.app)** or **[Render.com](https://render.com)**.
3. Click **New Project** → **Deploy from GitHub repo**.
4. Railway/Render automatically detects the root Dockerfile.
5. Set Environment Variables:
   - PORT: 3001
   - NODE_ENV: production
   - JWT_SECRET: your_random_production_secret_key
6. Click **Deploy**. Your live HTTPS URL (e.g. https://codeforge-production.up.railway.app) is generated automatically.

---

## 🛡️ Key Production Features Active
- **Unified Single-Port Delivery**: Frontend static SPA and API routes both serve from port 3001 (zero CORS issues).
- **Concurrency Semaphore**: Max 24 concurrent compiler executions with 500-slot FIFO queue.
- **SQLite WAL Mode**: PRAGMA journal_mode = WAL with 10s busy timeout for concurrent transactions.
- **Rate Limiting**: Multi-tier limits on compilation (30 runs/min), auth (20 attempts/15min), and analysis (60 req/min).
- **Process Shielding**: Strips server secrets from user-submitted child execution processes.
