import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing plugin UI slots
 * Allows plugins to inject UI elements dynamically
 */
export const usePluginUI = () => {
  const [uiSlots, setUISlots] = useState({});
  const [nativePlugins, setNativePlugins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load native plugins and their UI slots
  const loadPlugins = useCallback(async () => {
    try {
      setLoading(true);
      
      // Scan and load all native plugins
      const scanResult = await window.electronAPI?.nativePluginsScan?.();
      if (scanResult?.success) {
        console.log('[PluginUI] Loaded plugins:', scanResult.plugins);
      }
      
      // Get list of loaded plugins
      const listResult = await window.electronAPI?.nativePluginsList?.();
      if (listResult?.success) {
        setNativePlugins(listResult.plugins || []);
      }
      
      // Get all UI slots
      const slotsResult = await window.electronAPI?.nativePluginsUISlots?.();
      if (slotsResult?.success) {
        setUISlots(slotsResult.slots || {});
        console.log('[PluginUI] UI Slots:', slotsResult.slots);
      }
      
    } catch (error) {
      console.error('[PluginUI] Error loading plugins:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // Get UI elements for a specific slot
  const getSlotElements = useCallback((slotName) => {
    return uiSlots[slotName] || [];
  }, [uiSlots]);

  // Check if a slot has any elements
  const hasSlotElements = useCallback((slotName) => {
    return (uiSlots[slotName]?.length || 0) > 0;
  }, [uiSlots]);

  // Call a method on a native plugin
  const callPlugin = useCallback(async (pluginId, method, ...args) => {
    try {
      const result = await window.electronAPI?.nativePluginCall?.(pluginId, method, args);
      return result;
    } catch (error) {
      console.error(`[PluginUI] Error calling ${pluginId}.${method}:`, error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get plugin by ID
  const getPlugin = useCallback((pluginId) => {
    return nativePlugins.find(p => p.id === pluginId);
  }, [nativePlugins]);

  // Refresh plugins
  const refresh = useCallback(() => {
    loadPlugins();
  }, [loadPlugins]);

  return {
    uiSlots,
    nativePlugins,
    loading,
    getSlotElements,
    hasSlotElements,
    callPlugin,
    getPlugin,
    refresh,
  };
};

export default usePluginUI;
