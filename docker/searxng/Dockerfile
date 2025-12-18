# OpenMind SearXNG Plugin
# Image: teamaiko/openmindlabs-searxng:latest
# 
# Build: docker build -t teamaiko/openmindlabs-searxng:latest .
# Push:  docker push teamaiko/openmindlabs-searxng:latest

FROM searxng/searxng:latest

# OpenMind Plugin Labels - REQUIRED for plugin detection
LABEL com.openmind.plugin="true"
LABEL com.openmind.plugin.id="searxng"
LABEL com.openmind.plugin.name="SearXNG"
LABEL com.openmind.plugin.version="1.0.0"
LABEL com.openmind.plugin.author="TeamAiko"
LABEL com.openmind.plugin.category="search"
LABEL com.openmind.plugin.description="Privacy-respecting metasearch engine for Deep Search"

# Standard OCI labels
LABEL org.opencontainers.image.title="OpenMind SearXNG"
LABEL org.opencontainers.image.description="Privacy-respecting metasearch engine for OpenMind Deep Search"
LABEL org.opencontainers.image.vendor="TeamAiko"
LABEL org.opencontainers.image.source="https://github.com/teamaiko/openmind"

# Copy custom settings optimized for AI research
COPY settings.yml /etc/searxng/settings.yml

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1
