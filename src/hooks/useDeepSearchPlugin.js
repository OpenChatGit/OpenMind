import { useState, useCallback, useEffect, useRef } from 'react';

const PLUGIN_ID = 'openmind-deep-search';

/**
 * Hook for the DeepSearch Plugin
 * Provides web search capabilities with real-time results
 * Plugin must be explicitly enabled in Settings > Plugins > API Plugins
 */
export const useDeepSearchPlugin = () => {
  // Core state
  const [deepSearchEnabled, setDeepSearchEnabled] = useState(() => {
    const saved = localStorage.getItem('deepSearchEnabled');
    return saved === 'true';
  });
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [isReasoning, setIsReasoning] = useState(false);
  const [pluginLoaded, setPluginLoaded] = useState(false);
  
  // Search results state
  const [searchedFavicons, setSearchedFavicons] = useState([]);
  const searchedFaviconsRef = useRef([]);
  const [searchSources, setSearchSources] = useState([]);
  const [currentSources, setCurrentSources] = useState([]);
  const [currentPreviews, setCurrentPreviews] = useState([]);
  const [currentToolCalls, setCurrentToolCalls] = useState([]);

  // Check if plugin is enabled
  const checkPluginEnabled = useCallback(async () => {
    try {
      const enabledPlugins = JSON.parse(localStorage.getItem('enabled-native-plugins') || '[]');
      if (!enabledPlugins.includes(PLUGIN_ID)) {
        return false;
      }
      
      // Check if plugin is actually installed
      const installedCheck = await window.electronAPI?.checkInstalledPlugins?.();
      if (installedCheck?.success && installedCheck.installedPluginIds) {
        return installedCheck.installedPluginIds.includes(PLUGIN_ID);
      }
      
      return true;
    } catch {
      return false;
    }
  }, []);

  // Initialize plugin
  useEffect(() => {
    const initPlugin = async () => {
      const isEnabled = await checkPluginEnabled();
      setPluginLoaded(isEnabled);
      
      // If plugin not installed/enabled, disable DeepSearch
      if (!isEnabled) {
        setDeepSearchEnabled(false);
      }
    };
    
    initPlugin();
    
    // Listen for plugin state changes
    const handlePluginChange = async (event) => {
      if (event.detail?.pluginId === PLUGIN_ID) {
        const isValid = event.detail.enabled && await checkPluginEnabled();
        setPluginLoaded(isValid);
        
        // Disable DeepSearch if plugin was disabled
        if (!isValid) {
          setDeepSearchEnabled(false);
        }
      }
    };
    
    window.addEventListener('plugin-state-changed', handlePluginChange);
    return () => window.removeEventListener('plugin-state-changed', handlePluginChange);
  }, [checkPluginEnabled]);

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem('deepSearchEnabled', deepSearchEnabled.toString());
  }, [deepSearchEnabled]);

  // Reset all DeepSearch state for new search
  const resetDeepSearchState = useCallback(() => {
    setSearchSources([]);
    setCurrentSources([]);
    setCurrentPreviews([]);
    setSearchedFavicons([]);
    searchedFaviconsRef.current = [];
    setCurrentToolCalls([]);
  }, []);

  // Clear temporary state after message complete
  const clearTempState = useCallback(() => {
    setCurrentSources([]);
    setCurrentToolCalls([]);
    setCurrentPreviews([]);
    setSearchedFavicons([]);
    searchedFaviconsRef.current = [];
    setIsReasoning(false);
  }, []);

  // Toggle DeepSearch mode
  const toggle = useCallback(() => {
    setDeepSearchEnabled(prev => !prev);
  }, []);

  return {
    // Core state
    deepSearchEnabled,
    setDeepSearchEnabled,
    isDeepSearching,
    setIsDeepSearching,
    isWebSearching,
    setIsWebSearching,
    isReasoning,
    setIsReasoning,
    pluginLoaded,
    
    // Search results
    searchedFavicons,
    setSearchedFavicons,
    searchedFaviconsRef,
    searchSources,
    setSearchSources,
    currentSources,
    setCurrentSources,
    currentPreviews,
    setCurrentPreviews,
    currentToolCalls,
    setCurrentToolCalls,
    
    // Actions
    toggle,
    resetDeepSearchState,
    clearTempState,
  };
};

export default useDeepSearchPlugin;
