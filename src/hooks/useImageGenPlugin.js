import { useState, useCallback, useEffect } from 'react';

const PLUGIN_ID = 'openmind-image-gen';

/**
 * Hook for the Image Generation Plugin
 * Wraps the native plugin API and provides React state management
 * Plugin must be explicitly enabled in Settings > Plugins > API Plugins
 */
export const useImageGenPlugin = () => {
  const [enabled, setEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [progress, setProgress] = useState('');
  const [pluginLoaded, setPluginLoaded] = useState(false);

  // Check if plugin is enabled in localStorage AND actually installed (code exists)
  const checkPluginEnabled = useCallback(async () => {
    try {
      const enabledPlugins = JSON.parse(localStorage.getItem('enabled-native-plugins') || '[]');
      if (!enabledPlugins.includes(PLUGIN_ID)) {
        return false;
      }
      
      // Check if plugin code is actually installed (not just in registry)
      const installedCheck = await window.electronAPI?.checkInstalledPlugins?.();
      if (installedCheck?.success && installedCheck.installedPluginIds) {
        const isInstalled = installedCheck.installedPluginIds.includes(PLUGIN_ID);
        if (!isInstalled) {
          // Plugin code doesn't exist, clean up localStorage
          console.log('[ImageGenPlugin] Plugin not installed, cleaning up localStorage');
          const newEnabled = enabledPlugins.filter(id => id !== PLUGIN_ID);
          localStorage.setItem('enabled-native-plugins', JSON.stringify(newEnabled));
          return false;
        }
      }
      
      return true;
    } catch (e) {
      console.warn('[ImageGenPlugin] Error checking plugin status:', e);
      return false;
    }
  }, []);

  // Load models from plugin (defined before useEffect that uses it)
  const loadModels = useCallback(async () => {
    try {
      // Try plugin first
      const result = await window.electronAPI?.nativePluginCall?.(
        'openmind-image-gen', 
        'getModels', 
        []
      );
      
      if (result?.success && result.result?.length > 0) {
        setModels(result.result);
        setSelectedModel(prev => prev || result.result[0].name || result.result[0].id);
        return;
      }
      
      // Fallback to direct scan
      const scanResult = await window.electronAPI?.scanDiffusionModels?.();
      if (scanResult?.success && scanResult.models?.length > 0) {
        setModels(scanResult.models);
        setSelectedModel(prev => prev || scanResult.models[0].name);
      } else {
        // Default models
        setModels([{ 
          name: 'SDXL-Turbo (Download)', 
          hfModelId: 'stabilityai/sdxl-turbo',
          type: 'huggingface',
          description: 'Fast generation, good quality'
        }]);
        setSelectedModel(prev => prev || 'SDXL-Turbo (Download)');
      }
    } catch (error) {
      console.error('[ImageGenPlugin] Load models error:', error);
    }
  }, []);

  // Check if plugin is enabled and load models
  useEffect(() => {
    const checkPlugin = async () => {
      // Check if plugin is enabled in settings AND exists in registry
      const isEnabled = await checkPluginEnabled();
      
      if (!isEnabled) {
        setPluginLoaded(false);
        setEnabled(false);
        return;
      }
      
      // Plugin is enabled, check if API is available
      const hasImageGen = !!window.electronAPI?.generateImage;
      if (hasImageGen) {
        setPluginLoaded(true);
        await loadModels();
      } else {
        setPluginLoaded(false);
      }
    };
    
    checkPlugin();
    
    // Listen for plugin state changes
    const handlePluginChange = async (event) => {
      if (event.detail?.pluginId === PLUGIN_ID) {
        if (event.detail.enabled) {
          // Verify plugin still exists before enabling
          const isValid = await checkPluginEnabled();
          if (isValid) {
            setPluginLoaded(true);
            loadModels();
          }
        } else {
          setPluginLoaded(false);
          setEnabled(false);
        }
      }
    };
    
    window.addEventListener('plugin-state-changed', handlePluginChange);
    return () => window.removeEventListener('plugin-state-changed', handlePluginChange);
  }, [checkPluginEnabled, loadModels]);

  // Listen for progress updates
  useEffect(() => {
    if (window.electronAPI?.onImageGenProgress) {
      window.electronAPI.onImageGenProgress((data) => {
        setProgress(data.message || '');
      });
    }
  }, []);

  // Toggle image gen mode
  const toggle = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);

  // Generate image
  const generate = useCallback(async (prompt, options = {}) => {
    if (!prompt?.trim()) {
      return { success: false, error: 'Prompt is required' };
    }
    
    setIsGenerating(true);
    setProgress('Starting...');
    
    try {
      // Find model info
      const modelInfo = models.find(m => 
        (m.name || m.id) === selectedModel
      ) || models[0];
      
      const isLocalModel = modelInfo && modelInfo.path;
      const hfModelId = modelInfo?.hfModelId || 'stabilityai/sdxl-turbo';
      
      const result = await window.electronAPI?.generateImage?.({
        prompt,
        negativePrompt: options.negativePrompt || 'blurry, bad quality, distorted, ugly, deformed',
        width: options.width || 512,
        height: options.height || 512,
        steps: options.steps || (isLocalModel ? 20 : 4),
        guidance: options.guidance || (isLocalModel ? 7.5 : 0.0),
        model: hfModelId,
        localPath: isLocalModel ? modelInfo.path : null,
        seed: options.seed,
      });
      
      if (result?.success) {
        return { success: true, image: result.image };
      } else {
        return { success: false, error: result?.error || 'Generation failed' };
      }
    } catch (error) {
      console.error('[ImageGenPlugin] Generate error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  }, [models, selectedModel]);

  // Select model
  const selectModel = useCallback((modelName) => {
    setSelectedModel(modelName);
  }, []);

  return {
    // State
    enabled,
    isGenerating,
    models,
    selectedModel,
    progress,
    pluginLoaded,
    
    // Actions
    toggle,
    setEnabled,
    generate,
    selectModel,
    loadModels,
  };
};

export default useImageGenPlugin;
