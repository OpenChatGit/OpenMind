# OpenMind SearXNG Plugin

Privacy-respecting metasearch engine optimized for [OpenMind](https://github.com/teamaiko/openmind) Deep Search feature.

## Quick Start

```bash
docker run -d -p 8888:8080 --name openmind-searxng teamaiko/openmindlabs-searxng:latest
```

Access the web interface at: http://localhost:8888

## About

This is an official OpenMind plugin that provides web search capabilities for the Deep Search feature. It's based on [SearXNG](https://github.com/searxng/searxng) with optimized settings for AI research and development.

## Features

- 🔒 **Privacy-First** - No tracking, no ads, no data collection
- 🔍 **Multi-Engine Search** - Aggregates results from Google, DuckDuckGo, Bing, Brave, and more
- 📚 **Academic Sources** - Includes arXiv, Google Scholar for research
- 💻 **Developer Friendly** - GitHub, Stack Overflow integration
- 📰 **News Search** - Google News for current events
- 🤖 **AI Optimized** - Pre-configured for OpenMind Deep Search

## Included Search Engines

| Category | Engines |
|----------|---------|
| Web | Google, DuckDuckGo, Bing, Brave |
| Knowledge | Wikipedia, Wikidata |
| Code | GitHub, Stack Overflow |
| Academic | arXiv, Google Scholar |
| News | Google News |

## Usage with OpenMind

This plugin is automatically detected by OpenMind when installed via the Plugin Store. Once running, the Deep Search feature will use this instance for web searches.

### Manual Installation

1. Pull and run the container:
```bash
docker run -d \
  -p 8888:8080 \
  --name openmind-searxng \
  --restart unless-stopped \
  teamaiko/openmindlabs-searxng:latest
```

2. Open OpenMind and enable Deep Search
3. The app will automatically detect the running SearXNG instance

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SEARXNG_SECRET` | auto-generated | Secret key for the instance |
| `SEARXNG_BASE_URL` | http://localhost:8080 | Base URL for the instance |

### Custom Settings

To use custom settings, mount your own `settings.yml`:

```bash
docker run -d \
  -p 8888:8080 \
  -v /path/to/settings.yml:/etc/searxng/settings.yml \
  --name openmind-searxng \
  teamaiko/openmindlabs-searxng:latest
```

## Ports

| Port | Description |
|------|-------------|
| 8080 | SearXNG web interface (internal) |
| 8888 | Recommended external port |

## Labels

This image includes OpenMind plugin labels for automatic detection:

```
com.openmind.plugin=true
com.openmind.plugin.id=searxng
com.openmind.plugin.name=SearXNG
com.openmind.plugin.version=1.0.0
```

## Health Check

The container includes a health check that verifies the service is running:

```bash
docker inspect --format='{{.State.Health.Status}}' openmind-searxng
```

## Support

- **OpenMind Issues**: [GitHub Issues](https://github.com/teamaiko/openmind/issues)
- **SearXNG Documentation**: [docs.searxng.org](https://docs.searxng.org)

## License

This image is based on SearXNG which is licensed under AGPL-3.0.

---

Made with ❤️ by [TeamAiko](https://github.com/teamaiko) for the OpenMind community.
