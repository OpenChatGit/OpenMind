# OpenMindLabs Whisper ASR
# Based on onerahmet/openai-whisper-asr-webservice
FROM onerahmet/openai-whisper-asr-webservice:latest

# Labels
LABEL maintainer="OpenMindLabs"
LABEL org.opencontainers.image.title="OpenMindLabs Whisper"
LABEL org.opencontainers.image.description="Speech-to-text voice input for OpenMind"
LABEL com.openmind.plugin="true"

# Default environment variables
ENV ASR_MODEL=base
ENV ASR_ENGINE=openai_whisper

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:9000/ || exit 1
