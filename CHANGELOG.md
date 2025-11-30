# Changelog

All notable changes to OpenMind will be documented in this file.

## [Unreleased]

### File Icons
- ✅ **Seti UI Icons** - VS Code-style file icons from the official Seti UI theme
- ✅ **100+ file type icons** - JavaScript, TypeScript, React, Python, and many more
- ✅ **Proper icon alignment** - Icons are consistently sized and aligned
- ✅ **Folder styling** - Clean folder display without icons (VS Code style)

## [0.2.0] - IDE Mode

### IDE Mode (NEW!)
- ✅ **Built-in IDE** - VS Code-style code editor integrated into the app
- ✅ **File Explorer** - Full file system navigation with context menus
- ✅ **Syntax Highlighting** - Support for 30+ programming languages
- ✅ **Integrated Terminal** - Full terminal with PowerShell/Bash support
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

## [0.1.0] - Initial Release

### Core Features
- 💬 Chat with AI models (Local via Ollama or Cloud via HuggingFace)
- 🧠 Reasoning support for DeepSeek-R1, Qwen-QwQ models
- 👁️ Vision models support (llava, bakllava, moondream)
- 🎨 Local image generation with GGUF models
- 📎 Image attachments via file picker or clipboard
- 🔍 DeepSearch web search integration
- 🔌 MCP Tools support
- 📊 Inference stats display
- 🔄 Response regeneration
- 📋 One-click copy responses
