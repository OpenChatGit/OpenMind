/**
 * OpenMind Plugin API System v2.0
 * 
 * Universelles Plugin-System das JEDE Art von Plugin unterstützt
 * ohne Code-Änderungen in der Haupt-App.
 * 
 * Plugin-Kategorien:
 * - voice: STT, TTS, Voice Cloning, Voice Effects
 * - ai: LLM, Embeddings, Reranking, Classification
 * - media: Image Gen, Video Gen, Audio Gen, OCR
 * - data: Vector DB, Graph DB, Cache, Search
 * - tools: Code Execution, Browser, File Conversion
 * - integration: APIs, Webhooks, Notifications
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// ============ PLUGIN TYPE DEFINITIONS ============
// Jeder Typ definiert seine Standard-Endpoints
// Neue Plugins müssen nur diese Specs implementieren

const PLUGIN_TYPES = {
  // ===== VOICE PLUGINS =====
  'stt-api': {
    name: 'Speech-to-Text',
    category: 'voice',
    actions: {
      transcribe: {
        method: 'POST',
        path: '/asr',
        contentType: 'multipart/form-data',
        bodyKey: 'audio_file',
        queryParams: ['output', 'language'],
        responseType: 'json',
        responseKey: 'text'
      }
    }
  },
  
  'tts-api': {
    name: 'Text-to-Speech',
    category: 'voice',
    actions: {
      synthesize: {
        method: 'GET',
        path: '/api/tts',
        queryParams: ['text', 'voice', 'speed'],
        responseType: 'binary',
        mimeType: 'audio/wav'
      },
      synthesizePost: {
        method: 'POST',
        path: '/api/tts',
        contentType: 'application/json',
        bodyFormat: 'json',
        responseType: 'binary',
        mimeType: 'audio/wav'
      },
      voices: {
        method: 'GET',
        path: '/voices',
        responseType: 'json'
      }
    }
  },
  
  'voice-clone-api': {
    name: 'Voice Cloning',
    category: 'voice',
    actions: {
      clone: {
        method: 'POST',
        path: '/api/clone',
        contentType: 'multipart/form-data',
        responseType: 'json'
      },
      synthesize: {
        method: 'POST',
        path: '/api/synthesize',
        contentType: 'application/json',
        responseType: 'binary'
      }
    }
  },

  // ===== AI/LLM PLUGINS =====
  'llm-api': {
    name: 'Large Language Model',
    category: 'ai',
    actions: {
      chat: {
        method: 'POST',
        path: '/api/chat',
        contentType: 'application/json',
        responseType: 'json',
        streaming: true
      },
      complete: {
        method: 'POST',
        path: '/api/generate',
        contentType: 'application/json',
        responseType: 'json',
        streaming: true
      },
      models: {
        method: 'GET',
        path: '/api/tags',
        responseType: 'json'
      },
      embeddings: {
        method: 'POST',
        path: '/api/embeddings',
        contentType: 'application/json',
        responseType: 'json'
      }
    }
  },
  
  'embedding-api': {
    name: 'Text Embeddings',
    category: 'ai',
    actions: {
      embed: {
        method: 'POST',
        path: '/api/embed',
        contentType: 'application/json',
        responseType: 'json'
      },
      embedBatch: {
        method: 'POST',
        path: '/api/embed/batch',
        contentType: 'application/json',
        responseType: 'json'
      }
    }
  },
  
  'rerank-api': {
    name: 'Reranking',
    category: 'ai',
    actions: {
      rerank: {
        method: 'POST',
        path: '/api/rerank',
        contentType: 'application/json',
        responseType: 'json'
      }
    }
  },

  // ===== MEDIA PLUGINS =====
  'image-gen-api': {
    name: 'Image Generation',
    category: 'media',
    actions: {
      generate: {
        method: 'POST',
        path: '/api/generate',
        contentType: 'application/json',
        responseType: 'binary',
        mimeType: 'image/png'
      },
      img2img: {
        method: 'POST',
        path: '/api/img2img',
        contentType: 'multipart/form-data',
        responseType: 'binary'
      },
      models: {
        method: 'GET',
        path: '/api/models',
        responseType: 'json'
      }
    }
  },
  
  'ocr-api': {
    name: 'OCR / Text Extraction',
    category: 'media',
    actions: {
      extract: {
        method: 'POST',
        path: '/api/ocr',
        contentType: 'multipart/form-data',
        bodyKey: 'image',
        responseType: 'json'
      }
    }
  },
  
  'video-gen-api': {
    name: 'Video Generation',
    category: 'media',
    actions: {
      generate: {
        method: 'POST',
        path: '/api/generate',
        contentType: 'application/json',
        responseType: 'binary'
      }
    }
  },

  // ===== DATA PLUGINS =====
  'search-api': {
    name: 'Web Search',
    category: 'data',
    actions: {
      search: {
        method: 'GET',
        path: '/search',
        queryParams: ['q', 'format', 'categories', 'language', 'pageno'],
        responseType: 'json'
      }
    }
  },
  
  'vector-db-api': {
    name: 'Vector Database',
    category: 'data',
    actions: {
      insert: {
        method: 'POST',
        path: '/api/insert',
        contentType: 'application/json',
        responseType: 'json'
      },
      search: {
        method: 'POST',
        path: '/api/search',
        contentType: 'application/json',
        responseType: 'json'
      },
      delete: {
        method: 'DELETE',
        path: '/api/delete',
        contentType: 'application/json',
        responseType: 'json'
      }
    }
  },
  
  'cache-api': {
    name: 'Cache / KV Store',
    category: 'data',
    actions: {
      get: { method: 'GET', path: '/api/get', responseType: 'json' },
      set: { method: 'POST', path: '/api/set', contentType: 'application/json', responseType: 'json' },
      delete: { method: 'DELETE', path: '/api/delete', responseType: 'json' }
    }
  },

  // ===== TOOL PLUGINS =====
  'code-exec-api': {
    name: 'Code Execution',
    category: 'tools',
    actions: {
      execute: {
        method: 'POST',
        path: '/api/execute',
        contentType: 'application/json',
        responseType: 'json'
      },
      languages: {
        method: 'GET',
        path: '/api/languages',
        responseType: 'json'
      }
    }
  },
  
  'browser-api': {
    name: 'Browser Automation',
    category: 'tools',
    actions: {
      screenshot: {
        method: 'POST',
        path: '/api/screenshot',
        contentType: 'application/json',
        responseType: 'binary'
      },
      scrape: {
        method: 'POST',
        path: '/api/scrape',
        contentType: 'application/json',
        responseType: 'json'
      },
      pdf: {
        method: 'POST',
        path: '/api/pdf',
        contentType: 'application/json',
        responseType: 'binary'
      }
    }
  },
  
  'converter-api': {
    name: 'File Converter',
    category: 'tools',
    actions: {
      convert: {
        method: 'POST',
        path: '/api/convert',
        contentType: 'multipart/form-data',
        responseType: 'binary'
      },
      formats: {
        method: 'GET',
        path: '/api/formats',
        responseType: 'json'
      }
    }
  },

  // ===== INTEGRATION PLUGINS =====
  'webhook-api': {
    name: 'Webhook Handler',
    category: 'integration',
    actions: {
      send: {
        method: 'POST',
        path: '/api/send',
        contentType: 'application/json',
        responseType: 'json'
      }
    }
  },
  
  'notification-api': {
    name: 'Notifications',
    category: 'integration',
    actions: {
      send: {
        method: 'POST',
        path: '/api/notify',
        contentType: 'application/json',
        responseType: 'json'
      }
    }
  },

  // ===== UI PLUGINS =====
  'ui-api': {
    name: 'UI Extension',
    category: 'ui',
    // UI plugins can inject elements at specific slots
    slots: [
      'chat-input-left',      // Left side of chat input (before text field)
      'chat-input-right',     // Right side of chat input (after send button)
      'chat-input-above',     // Above the chat input area
      'chat-toolbar',         // Main toolbar area
      'sidebar-top',          // Top of sidebar
      'sidebar-bottom',       // Bottom of sidebar
      'message-actions',      // Actions on message bubbles
      'settings-tab',         // Custom settings tab
      'model-selector',       // Model selection dropdown additions
    ],
    actions: {
      // UI plugins don't have HTTP actions - they inject React components
    }
  },

  // ===== CUSTOM/GENERIC =====
  'custom-api': {
    name: 'Custom API',
    category: 'custom',
    actions: {
      // Custom plugins define their own actions in registry
    }
  }
};

// ============ NATIVE PLUGIN SYSTEM ============
// Native plugins are JS/Python plugins that run locally without Docker

let nativePlugins = new Map(); // pluginId -> plugin instance
let uiSlots = new Map(); // slot -> [{ pluginId, component, priority }]

/**
 * UI Slot Registry - tracks what UI elements plugins want to inject
 */
const UI_SLOTS = {
  'chat-input-left': [],
  'chat-input-right': [],
  'chat-input-above': [],
  'chat-toolbar': [],
  'sidebar-top': [],
  'sidebar-bottom': [],
  'message-actions': [],
  'settings-tab': [],
  'model-selector': [],
};

/**
 * Register a UI element in a slot
 */
function registerUISlot(pluginId, slot, config) {
  if (!UI_SLOTS[slot]) {
    console.warn(`[PluginAPI] Unknown UI slot: ${slot}`);
    return false;
  }
  
  UI_SLOTS[slot].push({
    pluginId,
    ...config,
    priority: config.priority || 50, // 0-100, higher = more left/top
  });
  
  // Sort by priority (higher first)
  UI_SLOTS[slot].sort((a, b) => b.priority - a.priority);
  
  console.log(`[PluginAPI] Registered UI element in slot "${slot}" from plugin "${pluginId}"`);
  return true;
}

/**
 * Unregister all UI elements from a plugin
 */
function unregisterPluginUI(pluginId) {
  for (const slot of Object.keys(UI_SLOTS)) {
    UI_SLOTS[slot] = UI_SLOTS[slot].filter(item => item.pluginId !== pluginId);
  }
}

/**
 * Get all UI elements for a slot
 */
function getUISlot(slot) {
  return UI_SLOTS[slot] || [];
}

/**
 * Get all registered UI slots
 */
function getAllUISlots() {
  const result = {};
  for (const [slot, items] of Object.entries(UI_SLOTS)) {
    if (items.length > 0) {
      result[slot] = items;
    }
  }
  return result;
}

/**
 * Load a native plugin from a directory
 */
async function loadNativePlugin(pluginPath) {
  try {
    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`No manifest.json found in ${pluginPath}`);
    }
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Validate manifest
    if (!manifest.id || !manifest.name || !manifest.main) {
      throw new Error('Invalid manifest: missing id, name, or main');
    }
    
    // Check if already loaded
    if (nativePlugins.has(manifest.id)) {
      console.log(`[PluginAPI] Plugin "${manifest.id}" already loaded`);
      return { success: true, plugin: manifest, alreadyLoaded: true };
    }
    
    // Load the main module
    const mainPath = path.join(pluginPath, manifest.main);
    if (!fs.existsSync(mainPath)) {
      throw new Error(`Main file not found: ${manifest.main}`);
    }
    
    const plugin = require(mainPath);
    
    // Initialize plugin if it has an init function
    if (typeof plugin.init === 'function') {
      await plugin.init({
        registerUI: (slot, config) => registerUISlot(manifest.id, slot, config),
        pluginPath,
        manifest,
      });
    }
    
    // Register UI elements from manifest
    if (manifest.ui?.slots) {
      for (const [slot, config] of Object.entries(manifest.ui.slots)) {
        registerUISlot(manifest.id, slot, config);
      }
    }
    
    // Store plugin instance
    nativePlugins.set(manifest.id, {
      manifest,
      instance: plugin,
      path: pluginPath,
      enabled: true,
    });
    
    console.log(`[PluginAPI] Loaded native plugin: ${manifest.name} v${manifest.version}`);
    return { success: true, plugin: manifest };
    
  } catch (error) {
    console.error(`[PluginAPI] Failed to load plugin from ${pluginPath}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Unload a native plugin
 */
async function unloadNativePlugin(pluginId) {
  const plugin = nativePlugins.get(pluginId);
  if (!plugin) {
    return { success: false, error: 'Plugin not loaded' };
  }
  
  try {
    // Call cleanup if available
    if (typeof plugin.instance.cleanup === 'function') {
      await plugin.instance.cleanup();
    }
    
    // Unregister UI elements
    unregisterPluginUI(pluginId);
    
    // Remove from registry
    nativePlugins.delete(pluginId);
    
    console.log(`[PluginAPI] Unloaded plugin: ${pluginId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`[PluginAPI] Failed to unload plugin ${pluginId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all loaded native plugins
 */
function getNativePlugins() {
  return Array.from(nativePlugins.entries()).map(([id, plugin]) => ({
    id,
    ...plugin.manifest,
    enabled: plugin.enabled,
    path: plugin.path,
  }));
}

/**
 * Call a function on a native plugin
 */
async function callNativePlugin(pluginId, method, ...args) {
  const plugin = nativePlugins.get(pluginId);
  if (!plugin) {
    throw new Error(`Plugin not loaded: ${pluginId}`);
  }
  
  if (typeof plugin.instance[method] !== 'function') {
    throw new Error(`Plugin ${pluginId} has no method: ${method}`);
  }
  
  return await plugin.instance[method](...args);
}

/**
 * Scan plugins directory and load all valid plugins
 * Skips special folders like 'icons' and files like 'registry.json'
 */
async function scanAndLoadPlugins(pluginsDir) {
  const results = [];
  
  // Folders to skip (not plugins)
  const SKIP_FOLDERS = ['icons', 'native', 'node_modules', '.git'];
  
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
    return results;
  }
  
  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  
  for (const entry of entries) {
    // Only process directories that aren't in the skip list
    if (entry.isDirectory() && !SKIP_FOLDERS.includes(entry.name)) {
      const pluginPath = path.join(pluginsDir, entry.name);
      
      // Only load if it has a manifest.json (is a valid plugin)
      const manifestPath = path.join(pluginPath, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const result = await loadNativePlugin(pluginPath);
        results.push({ name: entry.name, ...result });
      }
    }
  }
  
  return results;
}

// ============ PLUGIN REGISTRY ============

let pluginRegistry = null;
let registryLastFetch = 0;
const REGISTRY_CACHE_MS = 60000; // 1 minute cache

/**
 * Load plugin registry (with caching)
 */
async function loadPluginRegistry(forceRefresh = false) {
  const now = Date.now();
  if (pluginRegistry && !forceRefresh && (now - registryLastFetch) < REGISTRY_CACHE_MS) {
    return pluginRegistry;
  }
  
  // Try online first
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/OpenChatGit/OpenMindLabs-Plugins/main/registry.json',
      { timeout: 5000 }
    );
    if (response.ok) {
      pluginRegistry = await response.json();
      registryLastFetch = now;
      console.log('[PluginAPI] Loaded online registry:', pluginRegistry.plugins?.length, 'plugins');
      return pluginRegistry;
    }
  } catch (e) {
    console.log('[PluginAPI] Online registry unavailable');
  }
  
  // Fallback to local
  try {
    const localPath = path.join(__dirname, '../plugins/registry.json');
    if (fs.existsSync(localPath)) {
      pluginRegistry = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      registryLastFetch = now;
      console.log('[PluginAPI] Loaded local registry:', pluginRegistry.plugins?.length, 'plugins');
      return pluginRegistry;
    }
  } catch (e) {
    console.error('[PluginAPI] Failed to load local registry:', e);
  }
  
  return { plugins: [], categories: [] };
}

/**
 * Get plugin by ID
 */
async function getPlugin(pluginId) {
  const registry = await loadPluginRegistry();
  return registry.plugins?.find(p => p.id === pluginId);
}

/**
 * Get all plugins that provide a specific API type
 */
async function getPluginsByType(apiType) {
  const registry = await loadPluginRegistry();
  return registry.plugins?.filter(p => p.provides?.includes(apiType)) || [];
}

/**
 * Get all plugins in a category
 */
async function getPluginsByCategory(category) {
  const registry = await loadPluginRegistry();
  return registry.plugins?.filter(p => p.category === category) || [];
}

/**
 * Get running plugins (needs container list from Docker)
 */
async function getRunningPlugins(containers = []) {
  const registry = await loadPluginRegistry();
  return registry.plugins?.filter(p => {
    return containers.some(c => 
      c.name?.includes(p.containerName) && c.state === 'running'
    );
  }) || [];
}

/**
 * Get first running plugin of a type
 */
async function getActivePluginOfType(apiType, containers = []) {
  const plugins = await getPluginsByType(apiType);
  return plugins.find(p => 
    containers.some(c => c.name?.includes(p.containerName) && c.state === 'running')
  );
}

// ============ API CALLER ============

/**
 * Universal API caller - works with ANY plugin
 * 
 * @param {string} pluginId - Plugin ID or null to auto-detect
 * @param {string} apiType - API type (e.g., 'tts-api', 'stt-api')
 * @param {string} action - Action name from PLUGIN_TYPES
 * @param {object} params - Parameters for the action
 * @param {object} options - Additional options
 */
async function callAPI(pluginId, apiType, action, params = {}, options = {}) {
  // Get plugin config
  let plugin;
  if (pluginId) {
    plugin = await getPlugin(pluginId);
  } else if (apiType && options.containers) {
    plugin = await getActivePluginOfType(apiType, options.containers);
  }
  
  if (!plugin) {
    throw new Error(`No plugin found for ${pluginId || apiType}`);
  }
  
  // Get API type spec
  const typeSpec = PLUGIN_TYPES[apiType];
  if (!typeSpec) {
    throw new Error(`Unknown API type: ${apiType}`);
  }
  
  // Get action spec (from type or plugin custom)
  let actionSpec = typeSpec.actions[action];
  if (!actionSpec && plugin.apiSpec?.[action]) {
    actionSpec = plugin.apiSpec[action];
  }
  if (!actionSpec) {
    throw new Error(`Unknown action: ${action} for ${apiType}`);
  }
  
  // Build URL
  const baseUrl = options.endpoint || plugin.integration?.endpoint;
  if (!baseUrl) {
    throw new Error(`No endpoint for plugin ${plugin.id}`);
  }
  
  let url = `${baseUrl}${actionSpec.path}`;
  
  // Add query params
  if (actionSpec.queryParams && (actionSpec.method === 'GET' || params._query)) {
    const queryParts = [];
    const querySource = params._query || params;
    for (const param of actionSpec.queryParams) {
      if (querySource[param] !== undefined) {
        queryParts.push(`${param}=${encodeURIComponent(querySource[param])}`);
      }
    }
    if (queryParts.length > 0) {
      url += (url.includes('?') ? '&' : '?') + queryParts.join('&');
    }
  }
  
  // Build fetch options
  const fetchOptions = {
    method: actionSpec.method,
    headers: {},
    timeout: options.timeout || 30000
  };
  
  // Handle body
  if (actionSpec.method !== 'GET') {
    if (actionSpec.contentType === 'multipart/form-data') {
      const form = new FormData();
      for (const [key, value] of Object.entries(params)) {
        if (key.startsWith('_')) continue;
        if (Buffer.isBuffer(value)) {
          form.append(actionSpec.bodyKey || key, value, {
            filename: params._filename || 'file',
            contentType: params._contentType || 'application/octet-stream'
          });
        } else {
          form.append(key, value);
        }
      }
      fetchOptions.body = form;
      fetchOptions.headers = { ...fetchOptions.headers, ...form.getHeaders() };
    } else if (actionSpec.contentType === 'application/json') {
      fetchOptions.headers['Content-Type'] = 'application/json';
      const bodyParams = { ...params };
      delete bodyParams._query;
      delete bodyParams._filename;
      delete bodyParams._contentType;
      fetchOptions.body = JSON.stringify(bodyParams);
    }
  }
  
  console.log(`[PluginAPI] ${actionSpec.method} ${url}`);
  
  // Make request
  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API error ${response.status}: ${errorText}`);
  }
  
  // Handle response
  if (actionSpec.responseType === 'binary') {
    const buffer = await response.buffer();
    return {
      success: true,
      data: buffer.toString('base64'),
      mimeType: actionSpec.mimeType || response.headers.get('content-type') || 'application/octet-stream',
      size: buffer.length
    };
  } else {
    const data = await response.json();
    // Extract specific key if defined
    if (actionSpec.responseKey && data[actionSpec.responseKey] !== undefined) {
      return { success: true, data: data[actionSpec.responseKey], raw: data };
    }
    return { success: true, data };
  }
}

// ============ CONVENIENCE FUNCTIONS ============

/**
 * Text-to-Speech - works with any TTS plugin
 */
async function speak(text, options = {}) {
  try {
    // Try GET first (most common)
    return await callAPI(options.pluginId, 'tts-api', 'synthesize', 
      { text, voice: options.voice, speed: options.speed },
      options
    );
  } catch (e) {
    // Fallback to POST
    return await callAPI(options.pluginId, 'tts-api', 'synthesizePost',
      { text, voice: options.voice, speed: options.speed },
      options
    );
  }
}

/**
 * Speech-to-Text - works with any STT plugin
 */
async function transcribe(audioBuffer, options = {}) {
  return await callAPI(options.pluginId, 'stt-api', 'transcribe', {
    audio_file: audioBuffer,
    _filename: options.filename || 'audio.wav',
    _contentType: options.mimeType || 'audio/wav',
    output: 'json',
    language: options.language
  }, options);
}

/**
 * Web Search - works with any search plugin
 */
async function search(query, options = {}) {
  return await callAPI(options.pluginId, 'search-api', 'search', {
    q: query,
    format: 'json',
    categories: options.categories,
    language: options.language
  }, options);
}

/**
 * Image Generation - works with any image gen plugin
 */
async function generateImage(prompt, options = {}) {
  return await callAPI(options.pluginId, 'image-gen-api', 'generate', {
    prompt,
    width: options.width || 512,
    height: options.height || 512,
    steps: options.steps,
    seed: options.seed
  }, options);
}

/**
 * Text Embeddings - works with any embedding plugin
 */
async function embed(text, options = {}) {
  return await callAPI(options.pluginId, 'embedding-api', 'embed', {
    text: Array.isArray(text) ? text : [text],
    model: options.model
  }, options);
}

/**
 * Code Execution - works with any code exec plugin
 */
async function executeCode(code, language, options = {}) {
  return await callAPI(options.pluginId, 'code-exec-api', 'execute', {
    code,
    language,
    timeout: options.timeout
  }, options);
}

// ============ PLUGIN INFO ============

/**
 * Get all supported plugin types
 */
function getPluginTypes() {
  return Object.entries(PLUGIN_TYPES).map(([id, spec]) => ({
    id,
    name: spec.name,
    category: spec.category,
    actions: Object.keys(spec.actions)
  }));
}

/**
 * Get actions for a plugin type
 */
function getTypeActions(apiType) {
  return PLUGIN_TYPES[apiType]?.actions || {};
}

/**
 * Check if a plugin type is supported
 */
function isTypeSupported(apiType) {
  return !!PLUGIN_TYPES[apiType];
}

// ============ EXPORTS ============

module.exports = {
  // Core
  PLUGIN_TYPES,
  loadPluginRegistry,
  getPlugin,
  getPluginsByType,
  getPluginsByCategory,
  getRunningPlugins,
  getActivePluginOfType,
  
  // API Caller
  callAPI,
  
  // Convenience functions
  speak,
  transcribe,
  search,
  generateImage,
  embed,
  executeCode,
  
  // Info
  getPluginTypes,
  getTypeActions,
  isTypeSupported,
  
  // Native Plugin System
  loadNativePlugin,
  unloadNativePlugin,
  getNativePlugins,
  callNativePlugin,
  scanAndLoadPlugins,
  
  // UI Slot System
  registerUISlot,
  unregisterPluginUI,
  getUISlot,
  getAllUISlots,
  UI_SLOTS,
};
