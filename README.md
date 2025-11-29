# OpenMind

A modern AI chat application built with Electron, React, and local LLM support via Ollama, with HuggingFace cloud inference and local image generation.

## Features

- 💬 **Chat with AI models** - Local (Ollama) or Cloud (HuggingFace)
- 🧠 **Reasoning support** - View model thinking process (DeepSeek-R1, Qwen-QwQ, etc.)
- 👁️ **Vision models** - Analyze images with llava, bakllava, moondream
- 🎨 **Image generation** - Local GGUF models with GPU acceleration (CUDA)
- 🖼️ **Fullscreen images** - Click generated images to view in fullscreen
- 📎 **Image attachments** - File picker or clipboard paste (Ctrl+V)
- 🔍 **DeepSearch** - Web search with tool use
- 🔌 **MCP Tools** - Model Context Protocol support
- 🤗 **HuggingFace** - Cloud inference with HF Pro subscription (Optional)
- 📊 **Inference Stats** - Token counts, speed, duration (like Ollama verbose)
- 🔄 **Regenerate** - Re-run any AI response
- 📋 **Copy** - One-click copy AI responses
- 🛠️ **IDE Mode** - Built-in code editor with VS Code-style interface (v1 - Beta)

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

## IDE Mode (v1 - Beta)

OpenMind includes a built-in IDE mode for coding directly within the app. Click the **Code** button in the sidebar to switch to IDE mode.

> ⚠️ **Note:** IDE Mode is currently in v1 (Beta). Some features may be incomplete or have bugs. We're actively improving it!

### IDE Features

- 📁 **File Explorer** - Browse, create, rename, and delete files/folders
- 📝 **Code Editor** - Syntax highlighting for 30+ languages (JS, TS, Python, etc.)
- 🗂️ **Tab Management** - Multiple open files with unsaved changes indicator
- 🔍 **Search in Files** - VS Code-style search with regex support
- 💬 **Integrated AI Chat** - Ask questions about your code in the sidebar
- ⌨️ **Keyboard Shortcuts** - Ctrl+S (save), Ctrl+W (close tab), etc.
- 📄 **Markdown Preview** - Preview .md files with syntax highlighting
- 🎨 **VS Code Icons** - Familiar file/folder icons
- 🔄 **Project Management** - Create new projects or open existing folders

### IDE Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file |
| `Ctrl+W` | Close current tab |
| `Ctrl+Shift+F` | Focus search |
| `Ctrl+Shift+C` | Toggle AI chat |
| `Ctrl+B` | Toggle sidebar |

### Known Limitations (v1)

- Git integration is read-only (shows branch name only)
- No terminal integration yet
- Extensions panel is placeholder
- Debug panel is placeholder

## Recent Changes

### IDE Mode (NEW!)
- ✅ **Built-in IDE** - VS Code-style code editor integrated into the app
- ✅ **File Explorer** - Full file system navigation with context menus
- ✅ **Syntax Highlighting** - Support for 30+ programming languages
- ✅ **AI Chat Sidebar** - Ask questions about your code while editing
- ✅ **Search in Files** - Find text across your entire project
- ✅ **Tab Management** - Multiple files with unsaved changes tracking
- ✅ **Markdown Preview** - Preview markdown files with styling
- ✅ **Performance Optimized** - Memoized components to prevent unnecessary re-renders

### Image Generation Improvements
- ✅ **CUDA/GPU Support** - Fast image generation with NVIDIA GPUs
- ✅ **Automatic CUDA setup** - `node scripts/setup-python.js --cuda`
- ✅ **Fullscreen image viewer** - Click generated images to view fullscreen (ESC to close)
- ✅ **Better CUDA detection** - UI now correctly shows GPU status
- ✅ **GGUF model support** - Use quantized models for smaller file sizes

### UI Improvements
- ✅ **Hover effects on images** - Visual feedback when hovering over generated images
- ✅ **ESC key support** - Close fullscreen with keyboard

## License

MIT
