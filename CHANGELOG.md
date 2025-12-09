# Changelog

All notable changes to OpenMind will be documented in this file.

## [Unreleased]

### 🎨 Retro Synthwave Theme (Visual Flair)
- ✅ **80s Synthwave Animation** - Retro grid with perspective effect and animated sun
- ✅ **Audio-Reactive Visualizer** - Outer circle waves that react to the background music
- ✅ **Symmetrical Wave Effect** - Mirrored frequency visualization on both sides
- ✅ **Background Music Playlist** - Three synthwave tracks included:
  - "Technological Revolution" by Pecan Pie
  - "Arcade Ride" by Vens Adams
  - "Open Veil" by Lily
- ✅ **Volume Slider with Hover** - Slide-out volume control on hover
- ✅ **Music Credits** - Clickable artist links in the corner
- ⚠️ **Note:** This is purely visual flair - it doesn't affect any app functionality!

### Welcome & Notifications
- ✅ **Welcome Tab** - Beautiful welcome screen with quick actions and features overview
- ✅ **What's New** - Changelog viewer showing latest updates
- ✅ **Tips & Shortcuts** - Keyboard shortcuts and pro tips
- ✅ **Notification Bell** - Click the bell in status bar to open Welcome tab
- ✅ **First Launch Tutorial** - Auto-opens Welcome tab on first use
- ✅ **Update Indicator** - Blue dot on bell when new updates available

### Accessibility (Experimental)
- 🧪 **Colorblind Mode** - Support for different types of color vision deficiency:
  - Deuteranopia (Red-Green, most common)
  - Protanopia (Red-Green, red weak)
  - Tritanopia (Blue-Yellow)
  - Monochromacy (Complete color blindness)
- 🧪 **Accessible Colors** - Error, warning, and success colors adapt to selected mode
- 🧪 **File Icon Colors** - File and folder icons use colorblind-friendly colors
- ⚠️ **Note:** Colorblind mode is experimental and may not cover all UI elements yet

## [0.2.0] - Image Generation & UI

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
- 📊 Inference stats display
- 🔄 Response regeneration
- 📋 One-click copy responses
