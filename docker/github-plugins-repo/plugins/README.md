# OpenMind Plugin Development Guide

Create plugins that add UI elements and functionality to OpenMind.

## Quick Start

1. Create a folder for your plugin: `plugins/my-plugin/`
2. Add these files:
   - `plugin.json` - Configuration
   - `my-plugin.js` - JavaScript logic
   - `my-plugin.css` - Styles (optional)

## plugin.json Structure

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What your plugin does",
  "author": "Your Name",
  
  "ui": {
    "buttons": [
      {
        "id": "my-button",
        "position": "chat-input",
        "icon": "mic",
        "tooltip": "Button tooltip",
        "holdToActivate": false
      }
    ]
  },
  
  "api": {
    "endpoint": "http://localhost:PORT",
    "myRoute": "/api/endpoint"
  }
}
```

### Button Positions
- `chat-input` - Next to the message input field

### Available Icons
- `mic` - Microphone

## JavaScript Plugin

```javascript
(function(OpenMindPlugin) {
  
  // Called when plugin loads
  OpenMindPlugin.onInit = function(config) {
    console.log('Plugin initialized!');
  };

  // Called when button is clicked
  OpenMindPlugin.onButtonClick = function(buttonId) {
    if (buttonId === 'my-button') {
      // Do something
    }
  };

  // For holdToActivate buttons:
  OpenMindPlugin.onButtonDown = function(buttonId) {
    // Button pressed
  };

  OpenMindPlugin.onButtonUp = function(buttonId) {
    // Button released
  };

})(window.OpenMindPlugin || {});
```

### Plugin API

Your plugin has access to:

```javascript
// Set text in chat input
OpenMindPlugin.setInputText("Hello world");

// Show status message near button
OpenMindPlugin.showStatus("Recording...", "recording");
OpenMindPlugin.showStatus("Processing...", "processing");
OpenMindPlugin.showStatus("Error!", "error");
OpenMindPlugin.showStatus("", "idle"); // Hide status

// Access your config
OpenMindPlugin.config.api.endpoint
```

## CSS Styling

```css
/* Style your button when active */
.plugin-btn-my-button.recording {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
```

## Example: Voice Input Plugin

See `whisper/` folder for a complete example.

## Adding to Registry

Add your plugin to `registry.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "image": "docker/image:tag",
  "containerName": "openmind-my-plugin",
  "ports": { "8080": "8080" },
  "ui": {
    "hasUI": true,
    "pluginUrl": "https://raw.githubusercontent.com/.../plugins/my-plugin/",
    "js": "my-plugin.js",
    "css": "my-plugin.css",
    "buttons": [...]
  }
}
```
