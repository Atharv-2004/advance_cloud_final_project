# ─────────────────────────────────────────────────────────────
# Service Status Dashboard – Dockerfile
#
# This uses a single-stage build because we have ZERO external
# npm dependencies (only Node.js built-ins). A multi-stage build
# would be used if we had a "build" step (e.g., TypeScript compile
# or bundling). Keeping it simple is a valid architectural choice.
# ─────────────────────────────────────────────────────────────

FROM node:24-alpine

# Labels follow OCI image spec (good for tooling and auditing)
LABEL org.opencontainers.image.title="Service Status Dashboard"
LABEL org.opencontainers.image.description="Simple DevOps demo – Node.js status dashboard"
LABEL org.opencontainers.image.source="https://github.com/Atharv-2004/advance_cloud_final_project"

# Security: create a non-root user and group.
# Running as root inside a container is a security risk.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set the working directory inside the container
WORKDIR /app

# Copy package.json first (Docker caches this layer separately)
COPY package.json ./

# Copy application source code
COPY src/ ./src/

# Switch to non-root user before the app starts
USER appuser

# Expose the port our app listens on
# (documentation only; actual port mapping is done with -p at runtime)
EXPOSE 3000

# Health check: Docker will call this every 30s
# If it fails 3 times in a row, the container is marked unhealthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "src/server.js"]
