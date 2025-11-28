# OpenMind

A modern AI chat application built with Electron, React, and local LLM support via Ollama, with HuggingFace cloud inference and local image generation.

## Features

- 💬 **Chat with AI models** - Local (Ollama) or Cloud (HuggingFace)
- 🧠 **Reasoning support** - View model thinking process (DeepSeek-R1, Qwen-QwQ, etc.)
- 👁️ **Vision models** - Analyze images with llava, bakllava, moondream
- 🎨 **Image generation** - Local Image-Generation with Diffusers **(Not yet perfect though)**
- 📎 **Image attachments** - File picker or clipboard paste (Ctrl+V)
- 🔍 **DeepSearch** - Web search with tool use **(Custom could be not perfect)**
- 🔌 **MCP Tools** - Model Context Protocol support **(Not Really Working now well kinda i gues)**
- 🤗 **HuggingFace** - Cloud inference with HF Pro subscription **(Optional)**
- 📊 **Inference Stats** - Token counts, speed, duration (like Ollama verbose)
- 🔄 **Regenerate** - Re-run any AI response
- 📋 **Copy** - One-click copy AI responses

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm run electron

# Build for production
npm run electron:build
```

## Inference Providers

### Local (Ollama)
Run models locally on your machine. Requires [Ollama](https://ollama.ai) installed and running.

```bash
# Install Ollama, then pull a model
ollama pull llama3.2
ollama pull qwen3:4b  # With reasoning support
```

### HuggingFace (Cloud)
Use HuggingFace Inference API for cloud-based models. Requires HF Pro subscription for best models.

1. Get API key from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Open Settings → Inference → Select "Hugging Face"
3. Enter your API key

Supported models include Llama, Mistral, Qwen, Phi, and more.

## Image Generation Setup

Image generation runs locally using HuggingFace Diffusers with Python.

### 1. Python Dependencies

```bash
# Option 1: Automatic setup (recommended)
npm run setup:python

# Option 2: Manual install
pip install torch diffusers transformers accelerate safetensors

# Option 3: With CUDA support (NVIDIA GPU - much faster)
pip install torch --index-url https://download.pytorch.org/whl/cu121
pip install diffusers transformers accelerate safetensors
```

### 2. Download a Model

You need to download an image generation model and place it in the `models/` folder.

**Recommended: SDXL-Turbo (fast, good quality)**

1. Go to [huggingface.co/stabilityai/sdxl-turbo](https://huggingface.co/stabilityai/sdxl-turbo)
2. Click "Files and versions"
3. Download the entire folder (or use `git lfs`):
   ```bash
   # Using git (requires git-lfs installed)
   cd models
   git lfs install
   git clone https://huggingface.co/stabilityai/sdxl-turbo
   ```
4. Or download manually: Download all files and put them in `models/sdxl-turbo/`

**Alternative Models:**
- [stable-diffusion-v1-5](https://huggingface.co/runwayml/stable-diffusion-v1-5) - Classic SD 1.5
- [stable-diffusion-2-1](https://huggingface.co/stabilityai/stable-diffusion-2-1) - SD 2.1
- [GGUF quantized models](https://huggingface.co/models?search=stable-diffusion+gguf) - Smaller file size

**Supported formats:**
- **Diffusers** - HuggingFace format (folders with `model_index.json`)
- **GGUF** - Quantized models (requires `pip install stable-diffusion-cpp-python`)
- **Safetensors** - Single file models

### 3. Using Image Generation

1. Click the **🖼️ Generate** button in the chat input
2. Select your downloaded model from the dropdown
3. Type a description of the image you want
4. Press Enter

### GPU Acceleration (CUDA)

For NVIDIA GPUs, install PyTorch with CUDA for much faster generation:

```bash
# Windows/Linux
pip install torch --index-url https://download.pytorch.org/whl/cu121

# For GGUF models with GPU:
# Windows (requires Visual Studio Build Tools):
set CMAKE_ARGS=-DSD_CUBLAS=ON
pip install stable-diffusion-cpp-python --force-reinstall --no-cache-dir

# Linux/Mac:
CMAKE_ARGS="-DSD_CUBLAS=ON" pip install stable-diffusion-cpp-python --force-reinstall --no-cache-dir
```

## Message Actions

Hover over any AI response to see action buttons:

- **📋 Copy** - Copy message to clipboard
- **ℹ️ Info** - View inference stats (tokens, speed, duration)
- **🔄 Regenerate** - Generate a new response for the same prompt

## Reasoning Models

OpenMind supports reasoning/thinking models that show their thought process:

**Ollama:**
- `qwen3:4b`, `qwen3:8b` - Use `/think` or `/no_think` in prompt
- `deepseek-r1:7b`, `deepseek-r1:14b`

**HuggingFace:**
- Models with `<think>` tags or `reasoning_content` field
- DeepSeek-R1, Qwen-QwQ variants

The reasoning is shown in a collapsible "Reasoning" section above the response.

## Tech Stack

- **Frontend:** React 19, Vite
- **Desktop:** Electron
- **AI:** Ollama, HuggingFace Inference API
- **Image Gen:** Python, Diffusers, PyTorch
- **Tools:** MCP SDK

## Project Structure

```
├── electron/          # Electron main process
│   ├── main.js        # Main entry, IPC handlers
│   ├── huggingface.js # HF API integration
│   ├── deepSearch.js  # Web search tools
│   └── preload.js     # Context bridge
├── src/               # React frontend
│   ├── components/    # UI components
│   └── App.jsx        # Main app
├── python/            # Image generation
│   └── image_gen.py   # Diffusers script
└── mcp-tools/         # MCP tool servers
```

## License

MIT
