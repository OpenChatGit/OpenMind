import { useState, useEffect, useCallback, useRef } from 'react';
import { loadPlugin, unloadPlugin, getLoadedPlugins, isPluginLoaded } from '../utils/pluginLoader';

/**
 * Hook to manage UI plugins
 * Loads plugins when their Docker containers are running
 */
export function usePlugins(installedContainers = []) {
  const [plugins, setPlugins] = useState([]);
  const [pluginButtons, setPluginButtons] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(new Set());

  // Fetch plugin registry
  const fetchPluginRegistry = useCallback(async () => {
    try {
      const result = await window.electronAPI?.loadOnlinePluginRegistry();
      if (result?.success) {
        return result.plugins || [];
      }
    } catch (err) {
      console.error('Failed to fetch plugin registry:', err);
    }
    return [];
  }, []);

  // Check if a plugin's container is running
  const isPluginRunning = useCallback((plugin) => {
    return installedContainers.some(c => 
      c.name === plugin.containerName || 
      c.name === `/${plugin.containerName}` ||
      c.name?.includes(plugin.containerName)
    ) && installedContainers.find(c => 
      c.name === plugin.containerName || 
      c.name === `/${plugin.containerName}` ||
      c.name?.includes(plugin.containerName)
    )?.state === 'running';
  }, [installedContainers]);

  // Plugin callbacks
  const createCallbacks = useCallback((setInputText) => ({
    onSetInputText: (text) => {
      setInputText?.(text);
    },
    onShowStatus: (pluginId, message, type) => {
      window.dispatchEvent(new CustomEvent('plugin-status', {
        detail: { pluginId, message, type }
      }));
    }
  }), []);

  // Load/unload plugins based on running containers
  useEffect(() => {
    const loadPlugins = async () => {
      const registry = await fetchPluginRegistry();
      const uiPlugins = registry.filter(p => p.ui?.hasUI);
      
      const buttons = [];
      
      for (const plugin of uiPlugins) {
        const isRunning = isPluginRunning(plugin);
        
        if (isRunning && !loadedRef.current.has(plugin.id)) {
          // Load plugin
          const callbacks = createCallbacks();
          await loadPlugin(plugin, callbacks);
          loadedRef.current.add(plugin.id);
          
          // Add buttons
          if (plugin.ui?.buttons) {
            plugin.ui.buttons.forEach(btn => {
              buttons.push({
                ...btn,
                pluginId: plugin.id,
                pluginName: plugin.name
              });
            });
          }
        } else if (!isRunning && loadedRef.current.has(plugin.id)) {
          // Unload plugin
          unloadPlugin(plugin.id);
          loadedRef.current.delete(plugin.id);
        } else if (isRunning && loadedRef.current.has(plugin.id)) {
          // Already loaded, just add buttons
          if (plugin.ui?.buttons) {
            plugin.ui.buttons.forEach(btn => {
              buttons.push({
                ...btn,
                pluginId: plugin.id,
                pluginName: plugin.name
              });
            });
          }
        }
      }
      
      setPlugins(uiPlugins);
      setPluginButtons(buttons);
    };

    loadPlugins();
  }, [installedContainers, fetchPluginRegistry, isPluginRunning, createCallbacks]);

  // Get buttons for a specific position
  const getButtonsForPosition = useCallback((position) => {
    return pluginButtons.filter(btn => btn.position === position);
  }, [pluginButtons]);

  return {
    plugins,
    pluginButtons,
    getButtonsForPosition,
    loading
  };
}

export default usePlugins;
