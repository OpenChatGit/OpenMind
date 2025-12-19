# Piper TTS with REST API
# Lightweight, fast, high-quality text-to-speech
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    piper-tts \
    flask \
    flask-cors

# Download default English voice (Amy - high quality, ~100MB)
RUN mkdir -p /app/voices && \
    wget -q -O /app/voices/en_US-amy-medium.onnx \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx" && \
    wget -q -O /app/voices/en_US-amy-medium.onnx.json \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json"

# Copy the API server
COPY server.py /app/server.py

EXPOSE 5002

ENV PIPER_VOICE=/app/voices/en_US-amy-medium.onnx

CMD ["python", "server.py"]
