# 🚨 CrisisLink - Deployment Guide

## Overview

CrisisLink is a comprehensive emergency response system built with Node.js, React, PostgreSQL, and integrated with Google APIs, Firebase, and various emergency services.

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **PostgreSQL**: 12.0 or higher with PostGIS extension
- **Redis**: 6.0 or higher (for session management and caching)
- **SSL Certificate**: Required for production HTTPS

### API Keys Required

- **Google Maps JavaScript API Key**
- **Firebase Service Account Key**
- **OpenWeatherMap API Key**
- **Twilio Account SID and Auth Token**

## Environment Setup

### Backend Environment Variables

Create `.env` file in `/backend`:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crisislink
DB_USER=crisislink_user
DB_PASSWORD=your_secure_password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# API Keys
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
FIREBASE_SERVICE_ACCOUNT_KEY=path_to_firebase_service_account.json
OPENWEATHER_API_KEY=your_openweather_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Security
JWT_SECRET=your_very_secure_jwt_secret_key
SESSION_SECRET=your_session_secret_key

# External URLs
FRONTEND_URL=https://your-domain.com
ADMIN_EMAIL=admin@your-domain.com
```

### Frontend Environment Variables

Create `.env` file in `/frontend`:

```env
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_FIREBASE_CONFIG={"apiKey":"...","authDomain":"..."}
REACT_APP_ENVIRONMENT=production
```

## Database Setup

### 1. Create Database and User

```sql
-- Connect as postgres superuser
CREATE DATABASE crisislink;
CREATE USER crisislink_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE crisislink TO crisislink_user;

-- Enable PostGIS extension
\c crisislink
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### 2. Initialize Schema

```bash
cd backend
psql -h localhost -U crisislink_user -d crisislink -f database/schema.sql
```

### 3. Create Indexes for Performance

```sql
-- Location-based queries
CREATE INDEX idx_sos_alerts_location ON sos_alerts USING GIST (location);
CREATE INDEX idx_agents_location ON agents USING GIST (ST_Point(current_lng, current_lat));

-- Status and timestamp indexes
CREATE INDEX idx_sos_alerts_status_created ON sos_alerts (status, created_at);
CREATE INDEX idx_agents_status ON agents (status);
CREATE INDEX idx_sos_alerts_created_at ON sos_alerts (created_at DESC);
```

## Installation & Build

### 1. Install Dependencies

```bash
# Root project
npm run install:all

# Or manually
cd backend && npm install
cd ../frontend && npm install
```

### 2. Build Frontend

```bash
cd frontend
npm run build
```

### 3. Backend Production Setup

```bash
cd backend
npm install --production
```

## Deployment Options

### Option 1: Traditional VPS/Server Deployment

#### System Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL with PostGIS
sudo apt-get install -y postgresql postgresql-contrib postgis

# Install Redis
sudo apt-get install -y redis-server

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 for process management
sudo npm install -g pm2
```

#### Nginx Configuration

Create `/etc/nginx/sites-available/crisislink`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend static files
    location / {
        root /var/www/crisislink/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'crisislink-backend',
      script: './src/server.js',
      cwd: '/var/www/crisislink/backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
}
```

#### Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash

# CrisisLink Deployment Script
echo "🚨 Deploying CrisisLink Emergency Response System..."

# Set variables
PROJECT_DIR="/var/www/crisislink"
BACKUP_DIR="/var/backups/crisislink"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
echo "📦 Creating backup..."
mkdir -p $BACKUP_DIR
pg_dump crisislink > $BACKUP_DIR/db_backup_$DATE.sql

# Pull latest code
echo "📥 Pulling latest code..."
cd $PROJECT_DIR
git pull origin main

# Install dependencies
echo "📋 Installing dependencies..."
cd backend && npm install --production
cd ../frontend && npm install

# Build frontend
echo "🏗️ Building frontend..."
cd frontend && npm run build

# Restart services
echo "🔄 Restarting services..."
pm2 restart crisislink-backend
sudo systemctl reload nginx

# Run health check
echo "🏥 Running health check..."
sleep 5
curl -f http://localhost:5000/health || exit 1

echo "✅ Deployment completed successfully!"
```

### Option 2: Docker Deployment

#### Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgis/postgis:13-3.1
    environment:
      POSTGRES_DB: crisislink
      POSTGRES_USER: crisislink_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - '5432:5432'
    networks:
      - crisislink_network

  # Redis Cache
  redis:
    image: redis:6-alpine
    ports:
      - '6379:6379'
    networks:
      - crisislink_network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      REDIS_URL: redis://redis:6379
    ports:
      - '5000:5000'
    depends_on:
      - postgres
      - redis
    networks:
      - crisislink_network
    volumes:
      - ./backend/logs:/app/logs

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - '80:80'
      - '443:443'
    depends_on:
      - backend
    networks:
      - crisislink_network
    volumes:
      - ./ssl:/etc/nginx/ssl

volumes:
  postgres_data:

networks:
  crisislink_network:
    driver: bridge
```

#### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 5000

CMD ["node", "src/server.js"]
```

#### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### Option 3: Cloud Deployment (Azure/AWS)

#### Azure App Service Deployment

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login and create resource group
az login
az group create --name crisislink-rg --location "South Africa North"

# Create App Service Plan
az appservice plan create --name crisislink-plan --resource-group crisislink-rg --sku S1 --is-linux

# Create Web App
az webapp create --resource-group crisislink-rg --plan crisislink-plan --name crisislink-app --runtime "NODE|18-lts"

# Configure environment variables
az webapp config appsettings set --resource-group crisislink-rg --name crisislink-app --settings NODE_ENV=production

# Deploy from Git
az webapp deployment source config --resource-group crisislink-rg --name crisislink-app --repo-url https://github.com/your-username/crisislink --branch main
```

## Security Configuration

### 1. Firewall Setup

```bash
# UFW configuration
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. SSL Certificate (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3. Security Headers

Already configured in Nginx, but ensure:

- HTTPS only
- HSTS headers
- CSP headers
- XSS protection

## Monitoring & Logging

### 1. Application Monitoring

```bash
# Install monitoring tools
npm install -g pm2
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. System Monitoring

```bash
# Install system monitoring
sudo apt-get install htop iotop netstat

# Setup log monitoring
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM sos_alerts WHERE location && ST_DWithin(location, ST_Point(-26.2041, 28.0473), 10000);

-- Update table statistics
ANALYZE sos_alerts;
ANALYZE agents;
```

### 2. Application Caching

- Redis for session storage
- Nginx for static file caching
- CDN for global asset delivery

### 3. Image and Asset Optimization

```bash
# Optimize images
npm install -g imagemin-cli
imagemin src/assets/images/* --out-dir=build/static/media/

# Compress assets
gzip -k build/static/js/*.js
gzip -k build/static/css/*.css
```

## Backup Strategy

### 1. Database Backups

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U crisislink_user crisislink | gzip > /var/backups/crisislink/db_backup_$DATE.sql.gz

# Keep only last 7 days
find /var/backups/crisislink/ -type f -mtime +7 -delete
```

### 2. Code and Configuration Backups

```bash
# Backup application files
tar -czf /var/backups/crisislink/app_backup_$DATE.tar.gz /var/www/crisislink/

# Backup configuration
tar -czf /var/backups/crisislink/config_backup_$DATE.tar.gz /etc/nginx/sites-available/crisislink
```

### 3. Automated Backup Cron

```bash
# Add to crontab
0 2 * * * /var/www/crisislink/scripts/backup.sh
```

## Health Checks & Monitoring

### 1. Application Health Check

Create `healthcheck.js`:

```javascript
const axios = require('axios')

async function healthCheck() {
  try {
    const response = await axios.get('http://localhost:5000/health')
    if (response.status === 200) {
      console.log('✅ Application is healthy')
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message)
    process.exit(1)
  }
}

healthCheck()
```

### 2. System Monitoring Script

```bash
#!/bin/bash
# Check system resources
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.2f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"

# Check services
systemctl is-active --quiet postgresql && echo "PostgreSQL: Running" || echo "PostgreSQL: Stopped"
systemctl is-active --quiet redis && echo "Redis: Running" || echo "Redis: Stopped"
systemctl is-active --quiet nginx && echo "Nginx: Running" || echo "Nginx: Stopped"
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql

   # Check connections
   sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname='crisislink';"
   ```

2. **Memory Issues**

   ```bash
   # Check memory usage
   free -h

   # Restart Node.js processes
   pm2 restart all
   ```

3. **SSL Certificate Issues**

   ```bash
   # Renew certificates
   sudo certbot renew --dry-run
   ```

4. **API Rate Limiting**
   - Monitor Google API usage
   - Implement request caching
   - Use API quotas wisely

## Final Checklist

- [ ] Environment variables configured
- [ ] Database schema created and indexed
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Health checks working
- [ ] Load testing completed
- [ ] Emergency contact information updated
- [ ] Documentation completed

## Support & Maintenance

### Regular Maintenance Tasks

- Weekly: Check logs and system performance
- Monthly: Update dependencies and security patches
- Quarterly: Review and test backup/restore procedures
- Annually: Security audit and penetration testing

### Emergency Contacts

- System Administrator: admin@your-domain.com
- Database Administrator: dba@your-domain.com
- Emergency Response Team: emergency@your-domain.com

---

**CrisisLink Emergency Response System - Deployment Complete** 🚨✅
