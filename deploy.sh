#!/bin/bash

# TicketFlo Production Deployment Script
set -e

echo "🚀 Starting TicketFlo Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo -e "${RED}❌ .env.prod file not found!${NC}"
    echo "Please create .env.prod with your production environment variables."
    echo "See .env.prod.example for reference."
    exit 1
fi

# Load environment variables
export $(cat .env.prod | xargs)

# Check required environment variables
required_vars=("SUPABASE_URL" "SUPABASE_ANON_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Missing required environment variable: $var${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables loaded${NC}"

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down || true

# Remove old images (optional, uncomment to save disk space)
# echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
# docker image prune -f

# Build and start the application
echo -e "${YELLOW}🔨 Building application...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}🚀 Starting application...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for health check
echo -e "${YELLOW}⏳ Waiting for application to be healthy...${NC}"
sleep 10

# Check if the application is running
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is running and healthy!${NC}"
    echo -e "${GREEN}🌐 Your app is available at: http://your-domain.com${NC}"
    echo -e "${GREEN}🔍 Health check: http://your-domain.com/health${NC}"
else
    echo -e "${RED}❌ Application health check failed${NC}"
    echo "Checking logs..."
    docker-compose -f docker-compose.prod.yml logs --tail=50 ticketflo-app
    exit 1
fi

# Show running containers
echo -e "${YELLOW}📊 Running containers:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop app:  docker-compose -f docker-compose.prod.yml down"
echo "  Restart:   ./deploy.sh"
