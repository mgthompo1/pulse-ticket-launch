# 🚀 Self-Hosted Docker Deployment Guide

## 📋 Prerequisites

- Docker and Docker Compose installed on your server
- Domain name pointed to your server IP
- Basic Linux server management knowledge

## 🚀 Quick Deployment

### 1. **Set Up Environment Variables**

```bash
# Copy the example and fill in your values
cp env.prod.example .env.prod
nano .env.prod
```

Required variables in `.env.prod`:
```bash
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. **Deploy with One Command**

```bash
# Make script executable and run
chmod +x deploy.sh
./deploy.sh
```

That's it! Your app will be running at `http://your-server-ip:3000`

## 🔧 Advanced Setup Options

### Option A: Simple Docker (Port 3000)

```bash
# Just the app on port 3000
docker-compose -f docker-compose.prod.yml up -d
```

### Option B: With Nginx Reverse Proxy (Port 80/443)

```bash
# Edit nginx.conf to set your domain
nano nginx.conf

# Run with nginx profile
docker-compose -f docker-compose.prod.yml --profile with-nginx up -d
```

### Option C: Manual Docker Commands

```bash
# Build the image
docker build -t ticketflo-app .

# Run with environment variables
docker run -d \
  --name ticketflo-prod \
  -p 80:3000 \
  --env-file .env.prod \
  --restart unless-stopped \
  ticketflo-app
```

## Performance Features Enabled

✅ **Template Caching** - HTML templates cached in memory  
✅ **SSR Module Caching** - Render functions cached  
✅ **Meta Tag Caching** - Dynamic meta cached 5min per event  
✅ **Compression** - Gzip/Brotli enabled  
✅ **Health Checks** - `/health` endpoint  
✅ **Graceful Shutdown** - Proper signal handling  
✅ **Multi-stage Build** - Optimized Docker image  
✅ **Security** - Non-root user in container  

## Monitoring

- **Health Check**: `GET /health`
- **Logs**: Check container logs for performance metrics
- **Cache Status**: Logs show cache hits/misses

## 📊 Management Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart application
docker-compose -f docker-compose.prod.yml restart

# Stop application
docker-compose -f docker-compose.prod.yml down

# Update application (redeploy)
./deploy.sh

# Check container health
docker ps
curl http://localhost:3000/health
```

## 🔒 Security Setup (Optional)

### SSL Certificate with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to ssl directory
mkdir ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# Enable SSL in nginx.conf (uncomment SSL server block)
# Then restart with nginx
docker-compose -f docker-compose.prod.yml --profile with-nginx up -d
```

### Firewall Setup

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**: `sudo lsof -i :3000` to find what's using the port
2. **Permission denied**: Make sure deploy.sh is executable (`chmod +x deploy.sh`)
3. **Container won't start**: Check logs with `docker-compose logs ticketflo-app`
4. **Health check fails**: Verify environment variables in `.env.prod`
5. **Slow first requests**: Normal, cache is warming up

### Debug Commands

```bash
# Check container status
docker ps -a

# View detailed logs
docker-compose -f docker-compose.prod.yml logs --tail=100 ticketflo-app

# Execute commands inside container
docker exec -it ticketflo-prod sh

# Check environment variables
docker exec ticketflo-prod env
```

## 🎯 Performance Monitoring

- **Health Check**: `GET /health` returns server status
- **Cache Metrics**: Check logs for cache hit/miss ratios
- **Memory Usage**: `docker stats ticketflo-prod`
- **Response Times**: Monitor logs for SSR performance

## 🔄 Updates & Maintenance

### Updating Your App

```bash
# Pull latest code
git pull origin main

# Redeploy
./deploy.sh
```

### Database Migrations

Your Supabase migrations should run automatically, but if you need manual control:

```bash
# Run specific migration (if needed)
# This depends on your Supabase setup
```

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Verify environment variables are set correctly
3. Ensure your server has enough resources (512MB+ RAM recommended)
4. Test the health endpoint: `curl http://your-server/health`
