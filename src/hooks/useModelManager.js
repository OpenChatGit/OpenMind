import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for managing AI models (Ollama, OpenMind, HuggingFace)
 * Extracts model management logic from ChatArea
 */
export const useModelManager = () => {
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('selectedModel') || '';
  });
  const [availableModels, setAvailableModels] = useState([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // Save selected model to localStorage
  useEffect(() => {
    if (selectedModel && selectedModel !== 'No Models Found') {
      localStorage.setItem('selectedModel', selectedModel);
    }
  }, [selectedModel]);

  // Fetch all available models - matches original ChatArea logic exactly
  const fetchModels = useCallback(async () => {
    let allModels = [];
    
    // Fetch Ollama models
    if (window.electronAPI?.getOllamaModels) {
      const models = await window.electronAPI.getOllamaModels();
      if (models && models.length > 0) {
        allModels = models.map(m => ({ name: m.name, type: 'ollama' }));
      }
    }
    
    // Fetch OpenMind custom models
    if (window.electronAPI?.openmindListModels) {
      const openmindModels = await window.electronAPI.openmindListModels();
      if (openmindModels && openmindModels.length > 0) {
        const omModels = openmindModels.map(m => ({ 
          name: `⚡ ${m.name}`, 
          type: 'openmind',
          config: m 
        }));
        allModels = [...omModels, ...allModels];
      }
    }
    
    if (allModels.length > 0) {
      const modelNames = allModels.map(m => m.name);
      setAvailableModels(modelNames);
      // Check if saved model is still available, otherwise use first available
      setSelectedModel(prev => {
        if (!prev || prev === 'No Models Found') {
          return modelNames[0];
        }
        // If saved model is not in available models, use first one
        if (!modelNames.includes(prev)) {
          return modelNames[0];
        }
        return prev;
      });
    } else {
      setAvailableModels([]);
      setSelectedModel(prev => prev || 'No Models Found');
    }
  }, []);

  // Check if a valid model is selected
  const hasValidModel = selectedModel && selectedModel !== 'No Models Found';

  return {
    selectedModel,
    setSelectedModel,
    availableModels,
    setAvailableModels,
    isModelMenuOpen,
    setIsModelMenuOpen,
    fetchModels,
    hasValidModel,
  };
};

export default useModelManager;
