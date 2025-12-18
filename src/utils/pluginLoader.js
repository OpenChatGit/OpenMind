/**
 * OpenMind Plugin Loader
 * 
 * Loads and manages UI plugins from Docker containers
 * Plugins can add buttons, styles, and functionality to the app
 */

// Store loaded plugins
const loadedPlugins = new Map();
const pluginStyles = new Map();

// Plugin API that plugins can use
const createPluginAPI = (pluginConfig, callbacks) => ({
  config: pluginConfig,
  
  // Set text in chat input
  setInputText: (text) => {
    callbacks.onSetInputText?.(text);
  },
  
  // Show status message near button
  showStatus: (message, type = 'idle') => {
    callbacks.onShowStatus?.(pluginConfig.id, message, type);
  },
  
  // Send request to plugin's API endpoint
  async fetchAPI(path, options = {}) {
    const url = pluginConfig.integration?.endpoint + path;
    return fetch(url, options);
  }
});

/**
 * Load a plugin's JS and CSS
 */
export async function loadPlugin(plugin, callbacks) {
  if (!plugin.ui?.hasUI) return null;
  if (loadedPlugins.has(plugin.id)) return loadedPlugins.get(plugin.id);
  
  const baseUrl = plugin.ui.pluginUrl;
  
  try {
    // Load CSS if exists
    if (plugin.ui.css) {
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
    if (plugin.ui.js) {
      const jsUrl = baseUrl + plugin.ui.js;
      const jsResponse = await fetch(jsUrl);
      if (jsResponse.ok) {
        const jsText = await jsResponse.text();
        
        // Create plugin API
        const pluginAPI = createPluginAPI(plugin, callbacks);
        
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
          
          console.log(`Plugin loaded: ${plugin.name}`);
          return loadedPlugins.get(plugin.id);
        } catch (err) {
          console.error(`Plugin JS error (${plugin.id}):`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Failed to load plugin ${plugin.id}:`, err);
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
  
  // Remove from loaded plugins
  loadedPlugins.delete(pluginId);
  console.log(`Plugin unloaded: ${pluginId}`);
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
