# Use Node.js 18 LTS as base image
FROM node:18-slim

# Install system dependencies required for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user with home directory
RUN groupadd -r appuser && useradd -r -g appuser -m -d /home/appuser appuser

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies as root first
RUN npm ci

# Install Playwright and Chromium browser as root
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy application source code
COPY . .

# Set proper ownership of all files
RUN chown -R appuser:appuser /app /home/appuser

# Switch to non-root user
USER appuser

# Expose port (if needed for health checks or monitoring)
EXPOSE 3000
# Health check to ensure the scheduler is running
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "node scheduler.js" || exit 1

# Start the 24/7 scheduler
CMD ["node", "scheduler.js"]
