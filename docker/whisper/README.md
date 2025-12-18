# OpenMindLabs Whisper

Speech-to-text voice input plugin for OpenMind using OpenAI Whisper.

## Features

- 🎤 Voice input - Hold microphone button to speak
- 🔄 Real-time transcription
- 🌍 Multi-language support
- 🔒 Privacy - runs locally, no data sent to cloud

## Docker Hub

```
docker pull teamaiko/openmindlabs-whisper:latest
```

## Manual Run

```bash
docker run -d \
  --name openmind-whisper \
  -p 9000:9000 \
  -e ASR_MODEL=base \
  teamaiko/openmindlabs-whisper:latest
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| ASR_MODEL | base | Whisper model size: tiny, base, small, medium, large |
| ASR_ENGINE | openai_whisper | ASR engine to use |

## Model Sizes

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | ~75MB | Fastest | Basic |
| base | ~150MB | Fast | Good |
| small | ~500MB | Medium | Better |
| medium | ~1.5GB | Slow | Great |
| large | ~3GB | Slowest | Best |

## API Endpoints

- `POST /asr` - Transcribe audio file
  - Query params: `output=json` or `output=txt`
  - Body: multipart/form-data with `audio_file`

## Build

```bash
docker build -t teamaiko/openmindlabs-whisper:latest .
docker push teamaiko/openmindlabs-whisper:latest
```
