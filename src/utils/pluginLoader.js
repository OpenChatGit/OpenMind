/**
 * OpenMind Plugin Loader
 * 
 * Loads and manages UI plugins from Docker containers and native plugins
 * Plugins can add buttons, styles, and functionality to the app
 * 
 * v2.0 - Now integrates with pluginUIRegistry for dynamic UI
 */

import { 
  createPluginContext, 
  registerSlotElement, 
  unregisterPluginElements,
  initPluginUISystem,
  emitPluginEvent,
} from './pluginUIRegistry';

// Store loaded plugins
const loadedPlugins = new Map();
const pluginStyles = new Map();

// Initialize the UI system
let uiSystemInitialized = false;

/**
 * Initialize the plugin system
 */
export function initPluginSystem() {
  if (uiSystemInitialized) return;
  initPluginUISystem();
  uiSystemInitialized = true;
  console.log('[PluginLoader] System initialized');
}

// Plugin API that plugins can use (legacy + new)
const createPluginAPI = (pluginConfig, callbacks) => {
  // Create new-style context
  const ctx = createPluginContext(pluginConfig.id, pluginConfig);
  
  return {
    config: pluginConfig,
    
    // Legacy API
    setInputText: (text) => {
      callbacks.onSetInputText?.(text);
      ctx.ui.setInput(text);
    },
    
    showStatus: (message, type = 'idle') => {
      callbacks.onShowStatus?.(pluginConfig.id, message, type);
      ctx.ui.showStatus(message, type);
    },
    
    async fetchAPI(path, options = {}) {
      const url = pluginConfig.integration?.endpoint + path;
      return fetch(url, options);
    },
    
    // New Plugin Context API
    ...ctx,
  };
};

/**
 * Load a plugin's JS and CSS
 */
export async function loadPlugin(plugin, callbacks) {
  if (!plugin.ui?.hasUI && !plugin.ui?.slots) return null;
  if (loadedPlugins.has(plugin.id)) return loadedPlugins.get(plugin.id);
  
  // Initialize system if needed
  initPluginSystem();
  
  const baseUrl = plugin.ui?.pluginUrl;
  
  try {
    // Create plugin API
    const pluginAPI = createPluginAPI(plugin, callbacks);
    
    // Register UI slots from manifest (declarative UI)
    if (plugin.ui?.slots) {
      for (const [slot, config] of Object.entries(plugin.ui.slots)) {
        registerSlotElement(plugin.id, slot, {
          id: config.id || `${plugin.id}-${slot}`,
          type: config.type || 'toggle-button',
          icon: config.icon,
          label: config.label,
          tooltip: config.tooltip,
          stateKey: config.stateKey,
          priority: config.priority || 50,
        });
      }
    }
    
    // Load CSS if exists
    if (plugin.ui?.css && baseUrl) {
      const cssUrl = baseUrl + plugin.ui.css;
      const cssResponse = await fetch(cssUrl);
      if (cssResponse.ok) {
        const cssText = await cssResponse.text();
        const styleEl = document.createElement('style');
        styleEl.id = `plugin-style-${plugin.id}`;
        styleEl.textContent = cssText;
        document.head.appendChild(styleEl);
        pluginStyles.set(plugin.id, styleEl);
      }
    }
    
    // Load JS if exists
    if (plugin.ui?.js && baseUrl) {
      const jsUrl = baseUrl + plugin.ui.js;
      const jsResponse = await fetch(jsUrl);
      if (jsResponse.ok) {
        const jsText = await jsResponse.text();
        
        // Execute plugin code in sandboxed context
        const pluginModule = {};
        const wrappedCode = `
          (function(OpenMindPlugin) {
            ${jsText}
            return OpenMindPlugin;
          })
        `;
        
        try {
          const pluginFactory = eval(wrappedCode);
          const loadedPlugin = pluginFactory(pluginAPI);
          
          // Call onInit if exists
          if (loadedPlugin.onInit) {
            loadedPlugin.onInit(plugin);
          }
          
          loadedPlugins.set(plugin.id, {
            config: plugin,
            module: loadedPlugin,
            api: pluginAPI
          });
          
          console.log(`[PluginLoader] Plugin loaded: ${plugin.name}`);
          return loadedPlugins.get(plugin.id);
        } catch (err) {
          console.error(`[PluginLoader] Plugin JS error (${plugin.id}):`, err);
        }
      }
    } else {
      // Plugin without JS (declarative only)
      loadedPlugins.set(plugin.id, {
        config: plugin,
        module: null,
        api: pluginAPI
      });
      
      console.log(`[PluginLoader] Plugin loaded (declarative): ${plugin.name}`);
      return loadedPlugins.get(plugin.id);
    }
  } catch (err) {
    console.error(`[PluginLoader] Failed to load plugin ${plugin.id}:`, err);
  }
  
  return null;
}

/**
 * Unload a plugin
 */
export function unloadPlugin(pluginId) {
  // Remove CSS
  const styleEl = pluginStyles.get(pluginId);
  if (styleEl) {
    styleEl.remove();
    pluginStyles.delete(pluginId);
  }
  
  // Remove UI elements
  unregisterPluginElements(pluginId);
  
  // Call cleanup if exists
  const plugin = loadedPlugins.get(pluginId);
  if (plugin?.module?.cleanup) {
    try {
      plugin.module.cleanup();
    } catch (err) {
      console.error(`[PluginLoader] Cleanup error for ${pluginId}:`, err);
    }
  }
  
  // Remove from loaded plugins
  loadedPlugins.delete(pluginId);
  console.log(`[PluginLoader] Plugin unloaded: ${pluginId}`);
}

/**
 * Get loaded plugin
 */
export function getPlugin(pluginId) {
  return loadedPlugins.get(pluginId);
}

/**
 * Get all loaded plugins
 */
export function getLoadedPlugins() {
  return Array.from(loadedPlugins.values());
}

/**
 * Call plugin button event
 */
export function triggerPluginEvent(pluginId, event, buttonId) {
  const plugin = loadedPlugins.get(pluginId);
  
  // New event system
  emitPluginEvent(pluginId, `button-${event}`, { buttonId });
  
  // Legacy support
  if (!plugin?.module) return;
  
  switch (event) {
    case 'down':
      plugin.module.onButtonDown?.(buttonId);
      break;
    case 'up':
      plugin.module.onButtonUp?.(buttonId);
      break;
    case 'click':
      plugin.module.onButtonClick?.(buttonId);
      break;
  }
}

/**
 * Check if plugin is loaded
 */
export function isPluginLoaded(pluginId) {
  return loadedPlugins.has(pluginId);
}

/**
 * Load plugins from registry that have UI
 */
export async function loadPluginsWithUI(registry, callbacks = {}) {
  if (!registry?.plugins) return [];
  
  initPluginSystem();
  
  const results = [];
  for (const plugin of registry.plugins) {
    if (plugin.ui?.slots || plugin.ui?.hasUI) {
      const result = await loadPlugin(plugin, callbacks);
      if (result) {
        results.push(result);
      }
    }
  }
  
  return results;
}

/**
 * Register a native plugin (from electron main process)
 */
export function registerNativePlugin(pluginId, manifest, handlers = {}) {
  initPluginSystem();
  
  const ctx = createPluginContext(pluginId, manifest);
  
  // Register UI from manifest
  if (manifest.ui?.slots) {
    for (const [slot, config] of Object.entries(manifest.ui.slots)) {
      registerSlotElement(pluginId, slot, {
        id: config.id || `${pluginId}-${slot}`,
        type: config.type || 'toggle-button',
        icon: config.icon,
        label: config.label,
        tooltip: config.tooltip,
        stateKey: config.stateKey,
        priority: config.priority || 50,
      });
    }
  }
  
  // Register event handlers
  if (handlers.onClick) {
    ctx.on('ui-click', handlers.onClick);
  }
  if (handlers.onAction) {
    ctx.on('ui-action', handlers.onAction);
  }
  
  loadedPlugins.set(pluginId, {
    config: manifest,
    module: handlers,
    api: ctx,
    isNative: true,
  });
  
  console.log(`[PluginLoader] Native plugin registered: ${manifest.name || pluginId}`);
  return ctx;
}
