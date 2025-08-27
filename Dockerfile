# Use Node.js 18 LTS as base image
FROM node:18-slim

# Install system dependencies required for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Install Playwright and Chromium browser
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy application source code
COPY . .

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port (if needed for health checks or monitoring)
EXPOSE 3000
# Health check to ensure the scheduler is running
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "node scheduler.js" || exit 1

# Start the 24/7 scheduler
CMD ["node", "scheduler.js"]
