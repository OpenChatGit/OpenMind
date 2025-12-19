# Piper TTS Docker Image

Lightweight, fast text-to-speech using [Piper](https://github.com/rhasspy/piper).

## Features
- Fast CPU inference (~10x realtime)
- High-quality neural voices
- Simple REST API
- Small image size (~500MB)

## Build

```bash
docker build -t teamaiko/openmindlabs-tts .
```

## Run

```bash
docker run -d -p 5002:5002 --name openmind-tts teamaiko/openmindlabs-tts
```

## API

### Health Check
```
GET /
```

### Text-to-Speech
```
GET /api/tts?text=Hello%20world
POST /api/tts
Content-Type: application/json
{"text": "Hello world"}
```

Returns: WAV audio file

### List Voices
```
GET /voices
```

## Default Voice

The image includes `en_US-amy-medium` - a high-quality female English voice.

## Adding More Voices

Download voices from [Piper Voices](https://huggingface.co/rhasspy/piper-voices) and mount them:

```bash
docker run -d -p 5002:5002 \
  -v /path/to/voices:/app/voices \
  -e PIPER_VOICE=/app/voices/your-voice.onnx \
  teamaiko/openmindlabs-tts
```

## Available Languages

Piper supports many languages including:
- English (US, UK)
- German
- French
- Spanish
- Italian
- And many more!
