# Use Node.js 20 LTS Alpine for smaller image size
FROM node:20-alpine

# Install OpenSSL for Apple Wallet signing
RUN apk add --no-cache openssl openssl-dev

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Clean npm cache and install dependencies (including dev dependencies for build)
RUN npm cache clean --force && npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build:ssr

# Remove dev dependencies to reduce image size (keep node-forge for Apple Wallet signing)
RUN npm prune --production
RUN npm install node-forge --save

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server.js"]

