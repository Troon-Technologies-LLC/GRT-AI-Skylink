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
RUN npm ci

# Install Playwright and Chromium browser
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy application source code
COPY . .

# Expose port (if needed for health checks or monitoring)
EXPOSE 3000

# Health check to ensure the tests are running
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "npx playwright test" || exit 1

# Start Playwright tests
CMD npx playwright test tests/main.spec.js --project=chromium