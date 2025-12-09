# OpenMind

A modern AI chat application built with Electron, React, and local LLM support via Ollama with local image generation.

## Features

- 💬 **Chat with AI models** - Local inference via Ollama
- 🧠 **Reasoning support** - View model thinking process (DeepSeek-R1, Qwen-QwQ, etc.)
- 👁️ **Vision models** - Analyze images with llava, bakllava, moondream
- 🎨 **Image generation** - Local GGUF models with GPU acceleration (CUDA)
- 🖼️ **Fullscreen images** - Click generated images to view in fullscreen
- 📎 **Image attachments** - File picker or clipboard paste (Ctrl+V)
- 🔍 **DeepSearch** - Web search with tool use
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

## Ollama Setup

Run models locally on your machine. Requires [Ollama](https://ollama.ai) installed and running.

```bash
# Install Ollama, then pull a model
ollama pull llama3.2
ollama pull qwen3:4b  # With reasoning support
```

## Image Generation Setup

Image generation runs locally using GGUF models with `stable-diffusion-cpp-python`.

> ⚠️ **IMPORTANT: CUDA Support**
> 
> The default `pip install stable-diffusion-cpp-python` installs a **CPU-only** version which is very slow!
> For GPU acceleration, you need to build it with CUDA support (see below).

### 1. Python Dependencies

```bash
# Basic setup (CPU only - slow!)
npm run setup:python

# OR with CUDA support (recommended for NVIDIA GPUs)
npm run setup:python -- --cuda
```

### 2. CUDA Setup (NVIDIA GPU - Highly Recommended!)

For fast image generation, you need CUDA support. This requires building `stable-diffusion-cpp-python` from source.

**Prerequisites:**
- NVIDIA GPU with CUDA support
- [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads) installed (`nvcc` must be in PATH)
- [CMake](https://cmake.org/download/) installed
- Visual Studio Build Tools (Windows) or GCC (Linux)

**Option 1: Automatic (Recommended)**
```bash
node scripts/setup-python.js --cuda
```

**Option 2: Manual Installation**

Windows (CMD):
```cmd
set CMAKE_ARGS=-DSD_CUDA=ON
pip install stable-diffusion-cpp-python --force-reinstall --no-cache-dir
```

Windows (PowerShell):
```powershell
$env:CMAKE_ARGS="-DSD_CUDA=ON"
pip install stable-diffusion-cpp-python --force-reinstall --no-cache-dir
```

Linux/Mac:
```bash
CMAKE_ARGS="-DSD_CUDA=ON" pip install stable-diffusion-cpp-python --force-reinstall --no-cache-dir
```

> **Note:** Building takes 5-10 minutes. The build compiles CUDA kernels for your GPU.

### 3. Download a GGUF Model

Download a quantized Stable Diffusion model in GGUF format and place it in the `models/` folder.

**Recommended Models:**
- [stable-diffusion-v1-5-GGUF](https://huggingface.co/second-state/stable-diffusion-v1-5-GGUF) - Classic SD 1.5
- [stable-diffusion-2-1-GGUF](https://huggingface.co/second-state/stable-diffusion-2-1-GGUF) - SD 2.1
- Search for more: [GGUF Stable Diffusion models](https://huggingface.co/models?search=stable-diffusion+gguf)

**Download Example:**
```bash
cd models
# Create folder and download model
mkdir stable-diffusion-v1-5-GGUF
cd stable-diffusion-v1-5-GGUF
# Download the Q8_0 quantized version (best quality)
curl -LO https://huggingface.co/second-state/stable-diffusion-v1-5-GGUF/resolve/main/stable-diffusion-v1-5-Q8_0.gguf
```

**Supported Quantizations (in order of quality):**
- `Q8_0` - Best quality, larger file (~2GB)
- `Q5_1`, `Q5_0` - Good balance
- `Q4_1`, `Q4_0` - Smaller, slightly lower quality

### 4. Using Image Generation

1. Click the **🖼️ Generate** button in the chat input
2. Select your downloaded model from the dropdown
3. Type a description of the image you want
4. Press Enter
5. **Click on the generated image to view it in fullscreen!**

### Troubleshooting

**"CUDA not compiled" or slow generation:**
- You need to rebuild with CUDA: `node scripts/setup-python.js --cuda`
- Make sure `nvcc --version` works in your terminal

**Build fails:**
- Install CUDA Toolkit from NVIDIA
- Install Visual Studio Build Tools (Windows) with C++ workload
- Make sure CMake is installed

**Model not loading:**
- Check that the `.gguf` file is in a folder inside `models/`
- Try a different quantization (Q8_0 is most compatible)

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

The reasoning is shown in a collapsible "Reasoning" section above the response.

## 🎨 Retro Synthwave Theme

OpenMind includes an optional 80s Synthwave visual theme - purely for aesthetic flair!

> ⚠️ **Note:** This is just eye candy! It doesn't affect any app functionality but are not done yet.

### Features
- **Animated Grid** - Perspective grid moving towards you
- **Retro Sun** - Classic synthwave half-circle
- **Audio-Reactive Visualizer** - Outer circle with waves that react to the music
- **Background Music** - Three synthwave tracks included:
  - "Technological Revolution" by Pecan Pie
  - "Arcade Ride" by Vens Adams  
  - "Open Veil" by Lily
- **Volume Control** - Hover over the speaker icon to reveal the slider

Enable it in Settings → Animations → Retro Synthwave **not done yet**

## Tech Stack

- **Frontend:** React 19, Vite
- **Desktop:** Electron
- **AI:** Ollama
- **Image Gen:** Python, Diffusers, PyTorch

## Project Structure

```
├── electron/          # Electron main process
│   ├── main.js        # Main entry, IPC handlers
│   ├── deepSearch.js  # Web search tools
│   └── preload.js     # Context bridge
├── src/               # React frontend
│   ├── components/    # UI components
│   └── App.jsx        # Main app
├── python/            # Image generation
│   └── image_gen.py   # Diffusers script
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for recent updates and version history.

## License

MIT
