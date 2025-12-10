const fs = require('fs');
const path = require('path');

/**
 * Detect model type from directory structure or file
 */
function detectModelType(modelPath) {
  const stats = fs.statSync(modelPath);
  const folderName = path.basename(modelPath).toLowerCase();
  
  if (stats.isDirectory()) {
    // Check for diffusion model indicators
    const files = fs.readdirSync(modelPath);
    
    // Check for GGUF files in directory (Stable Diffusion GGUF)
    const hasGgufFiles = files.some(f => f.endsWith('.gguf'));
    if (hasGgufFiles) {
      // Check if it's a diffusion GGUF by folder name or file names
      const isDiffusionGguf = folderName.includes('diffusion') || 
                              folderName.includes('sd') ||
                              folderName.includes('stable') ||
                              folderName.includes('sdxl') ||
                              folderName.includes('flux') ||
                              files.some(f => f.toLowerCase().includes('diffusion') || 
                                            f.toLowerCase().includes('stable'));
      if (isDiffusionGguf) {
        return 'diffusion-gguf';
      }
      return 'llm'; // Default GGUF to LLM
    }
    
    // Stable Diffusion / Diffusers model
    if (files.includes('model_index.json') || 
        files.includes('scheduler') ||
        files.includes('unet') ||
        files.includes('vae') ||
        files.includes('text_encoder')) {
      return 'diffusion';
    }
    
    // Check model_index.json for pipeline type
    const modelIndexPath = path.join(modelPath, 'model_index.json');
    if (fs.existsSync(modelIndexPath)) {
      try {
        const modelIndex = JSON.parse(fs.readFileSync(modelIndexPath, 'utf8'));
        if (modelIndex._class_name?.includes('Pipeline') || 
            modelIndex._diffusers_version) {
          return 'diffusion';
        }
      } catch (e) {}
    }
    
    // Check config.json for model type
    const configPath = path.join(modelPath, 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.model_type) {
          // LLM types
          if (['llama', 'mistral', 'qwen', 'phi', 'gemma'].some(t => 
              config.model_type.toLowerCase().includes(t))) {
            return 'llm';
          }
        }
        if (config._diffusers_version || config.in_channels === 4) {
          return 'diffusion';
        }
      } catch (e) {}
    }
    
    // Check folder name for hints
    if (folderName.includes('diffusion') || folderName.includes('sd-') || 
        folderName.includes('stable') || folderName.includes('sdxl')) {
      return 'diffusion';
    }
    
    return 'unknown';
  }
  
  // Single file models
  const ext = path.extname(modelPath).toLowerCase();
  const name = path.basename(modelPath).toLowerCase();
  
  if (ext === '.gguf') {
    // GGUF can be either LLM or Diffusion - check filename
    if (name.includes('sd') || name.includes('diffusion') || 
        name.includes('stable') || name.includes('sdxl') || name.includes('flux')) {
      return 'diffusion-gguf';
    }
    return 'llm'; // Default GGUF to LLM (Ollama/llama.cpp format)
  }
  
  if (ext === '.safetensors' || ext === '.ckpt') {
    // Diffusion model indicators
    const diffusionKeywords = [
      'sd', 'stable', 'diffusion', 'sdxl', 'flux', 'turbo', 
      'dreamshaper', 'realistic', 'anime', 'deliberate', 
      'protogen', 'openjourney', 'midjourney', 'anything',
      'counterfeit', 'waifu', 'pastel', 'rev', 'epic',
      'photon', 'juggernaut', 'realvis', 'cyberrealistic',
      'v1-5', 'v2-1', 'xl-base', 'inpainting', 'img2img'
    ];
    
    // LLM model indicators
    const llmKeywords = ['llama', 'mistral', 'qwen', 'phi', 'gemma', 'falcon', 'mpt', 'gpt'];
    
    // Check for diffusion keywords
    if (diffusionKeywords.some(kw => name.includes(kw))) {
      return 'diffusion';
    }
    
    // Check for LLM keywords
    if (llmKeywords.some(kw => name.includes(kw))) {
      return 'llm';
    }
    
    // Default safetensors/ckpt to diffusion (more common use case)
    // Most single-file safetensors in a models folder are SD checkpoints
    return 'diffusion';
  }
  
  return 'unknown';
}

/**
 * Get Hugging Face model ID from local path if available
 */
function getHfModelId(modelPath) {
  // Check for .hf_model_id file (we can create this when downloading)
  const idFile = path.join(modelPath, '.hf_model_id');
  if (fs.existsSync(idFile)) {
    return fs.readFileSync(idFile, 'utf8').trim();
  }
  
  // Try to extract from model_index.json
  const modelIndexPath = path.join(modelPath, 'model_index.json');
  if (fs.existsSync(modelIndexPath)) {
    try {
      const modelIndex = JSON.parse(fs.readFileSync(modelIndexPath, 'utf8'));
      if (modelIndex._name_or_path) {
        return modelIndex._name_or_path;
      }
    } catch (e) {}
  }
  
  // Use folder name as fallback (might be HF format like "stabilityai_sdxl-turbo")
  const folderName = path.basename(modelPath);
  if (folderName.includes('_')) {
    return folderName.replace('_', '/');
  }
  
  return null;
}

function scanModelsFolder() {
  const projectRoot = path.join(__dirname, '..');
  const modelsDir = path.join(projectRoot, 'models');
  
  // Create models directory if it doesn't exist
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
    console.log('Created models directory at:', modelsDir);
  }

  try {
    const files = fs.readdirSync(modelsDir);
    
    // Filter for common model file extensions and directories
    const modelFiles = files.filter(file => {
      const fullPath = path.join(modelsDir, file);
      const ext = path.extname(file).toLowerCase();
      const isDir = fs.statSync(fullPath).isDirectory();
      
      // Include directories (could be diffusion models) and model files
      return isDir || ['.bin', '.safetensors', '.gguf', '.pt', '.pth', '.onnx', '.ckpt'].includes(ext);
    });

    const models = [];
    
    for (const file of modelFiles) {
      const fullPath = path.join(modelsDir, file);
      const stats = fs.statSync(fullPath);
      const modelType = detectModelType(fullPath);
      
      // For directories with GGUF files, list each GGUF file separately
      if (stats.isDirectory() && modelType === 'diffusion-gguf') {
        const dirFiles = fs.readdirSync(fullPath);
        const ggufFiles = dirFiles.filter(f => f.endsWith('.gguf'));
        
        for (const ggufFile of ggufFiles) {
          const ggufPath = path.join(fullPath, ggufFile);
          const ggufStats = fs.statSync(ggufPath);
          
          // Extract quantization type from filename (Q4_0, Q8_0, f16, etc.)
          const quantMatch = ggufFile.match(/(Q\d+_\d+|f16|f32)/i);
          const quantType = quantMatch ? quantMatch[1].toUpperCase() : '';
          
          models.push({
            name: quantType ? `${file} (${quantType})` : ggufFile,
            path: ggufPath,
            size: ggufStats.size,
            sizeFormatted: formatSize(ggufStats.size),
            isDirectory: false,
            modified: ggufStats.mtime,
            type: 'diffusion-gguf',
            hfModelId: null,
            quantization: quantType
          });
        }
      } else {
        // Regular model (directory or single file)
        const hfModelId = stats.isDirectory() ? getHfModelId(fullPath) : null;
        let totalSize = stats.size;
        if (stats.isDirectory()) {
          totalSize = getDirSize(fullPath);
        }
        
        models.push({
          name: file,
          path: fullPath,
          size: totalSize,
          sizeFormatted: formatSize(totalSize),
          isDirectory: stats.isDirectory(),
          modified: stats.mtime,
          type: modelType,
          hfModelId: hfModelId
        });
      }
    }

    // Separate by type (include diffusion-gguf in diffusion models)
    const diffusionModels = models.filter(m => m.type === 'diffusion' || m.type === 'diffusion-gguf');
    const llmModels = models.filter(m => m.type === 'llm');
    const otherModels = models.filter(m => m.type === 'unknown');

    console.log(`Found ${models.length} models: ${diffusionModels.length} diffusion (incl. GGUF), ${llmModels.length} LLM, ${otherModels.length} other`);
    
    return { 
      success: true, 
      models, 
      diffusionModels,
      llmModels,
      modelsDir 
    };
  } catch (error) {
    console.error('Error scanning models folder:', error);
    return { success: false, error: error.message, models: [], diffusionModels: [], llmModels: [], modelsDir };
  }
}

/**
 * Get directory size recursively
 */
function getDirSize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += stats.size;
      }
    }
  } catch (e) {}
  return size;
}

/**
 * Format file size to human readable
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getModelInfo(modelPath) {
  try {
    const stats = fs.statSync(modelPath);
    const isDir = stats.isDirectory();
    const configPath = isDir 
      ? path.join(modelPath, 'config.json')
      : path.join(path.dirname(modelPath), 'config.json');
    
    let config = null;
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
    }
    
    // For diffusion models, also check model_index.json
    let modelIndex = null;
    if (isDir) {
      const modelIndexPath = path.join(modelPath, 'model_index.json');
      if (fs.existsSync(modelIndexPath)) {
        modelIndex = JSON.parse(fs.readFileSync(modelIndexPath, 'utf8'));
      }
    }

    const modelType = detectModelType(modelPath);
    const totalSize = isDir ? getDirSize(modelPath) : stats.size;

    return {
      success: true,
      name: path.basename(modelPath),
      path: modelPath,
      size: totalSize,
      sizeFormatted: formatSize(totalSize),
      modified: stats.mtime,
      isDirectory: isDir,
      type: modelType,
      config: config,
      modelIndex: modelIndex,
      hfModelId: isDir ? getHfModelId(modelPath) : null
    };
  } catch (error) {
    console.error('Error reading model info:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Scan only for diffusion models
 */
function scanDiffusionModels() {
  const result = scanModelsFolder();
  if (!result.success) return result;
  
  return {
    success: true,
    models: result.diffusionModels,
    modelsDir: result.modelsDir
  };
}

module.exports = {
  scanModelsFolder,
  scanDiffusionModels,
  getModelInfo,
  detectModelType
};
