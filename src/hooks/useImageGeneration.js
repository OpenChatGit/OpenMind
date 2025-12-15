import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for handling image generation functionality
 * Extracts image gen logic from ChatArea to reduce component size
 */
export const useImageGeneration = () => {
  const [imageGenEnabled, setImageGenEnabled] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [diffusionModels, setDiffusionModels] = useState([]);
  const [selectedImageModel, setSelectedImageModel] = useState('');
  const [imageGenProgress, setImageGenProgress] = useState('');

  // Load diffusion models - matches original ChatArea logic
  const loadDiffusionModels = useCallback(async () => {
    if (window.electronAPI?.scanDiffusionModels) {
      const result = await window.electronAPI.scanDiffusionModels();
      if (result.success && result.models.length > 0) {
        setDiffusionModels(result.models);
        setSelectedImageModel(prev => prev || result.models[0].name);
      } else {
        setDiffusionModels([{ 
          name: 'SDXL-Turbo (Download)', 
          hfModelId: 'stabilityai/sdxl-turbo',
          type: 'huggingface'
        }]);
        setSelectedImageModel(prev => prev || 'SDXL-Turbo (Download)');
      }
    }
  }, []);

  // Listen for image generation progress
  useEffect(() => {
    if (window.electronAPI?.onImageGenProgress) {
      window.electronAPI.onImageGenProgress((data) => {
        setImageGenProgress(data.message || '');
      });
    }
  }, []);

  // Handle image generation - matches original ChatArea logic exactly
  const handleGenerateImage = useCallback(async (prompt) => {
    if (!prompt.trim()) return null;
    
    setIsGeneratingImage(true);
    setImageGenProgress('Starting...');
    try {
      // Find the selected model details
      const modelInfo = diffusionModels.find(m => m.name === selectedImageModel);
      const isLocalModel = modelInfo && modelInfo.path;
      const hfModelId = modelInfo?.hfModelId || 'stabilityai/sdxl-turbo';
      
      const result = await window.electronAPI?.generateImage({
        prompt: prompt,
        negativePrompt: 'blurry, bad quality, distorted, ugly, deformed',
        width: 512,
        height: 512,
        steps: isLocalModel ? 20 : 4,
        guidance: isLocalModel ? 7.5 : 0.0,
        model: hfModelId,
        localPath: isLocalModel ? modelInfo.path : null
      });
      
      if (result?.success) {
        return result.image;
      } else {
        console.error('Image generation failed:', result?.error);
        return { error: result?.error || 'Generation failed' };
      }
    } catch (error) {
      console.error('Image generation error:', error);
      return { error: error.message };
    } finally {
      setIsGeneratingImage(false);
      setImageGenProgress('');
    }
  }, [diffusionModels, selectedImageModel]);

  return {
    imageGenEnabled,
    setImageGenEnabled,
    isGeneratingImage,
    setIsGeneratingImage,
    diffusionModels,
    setDiffusionModels,
    selectedImageModel,
    setSelectedImageModel,
    imageGenProgress,
    setImageGenProgress,
    handleGenerateImage,
    loadDiffusionModels,
  };
};

export default useImageGeneration;
