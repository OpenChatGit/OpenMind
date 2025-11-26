const fs = require('fs');
const path = require('path');

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
    
    // Filter for common model file extensions
    const modelFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.bin', '.safetensors', '.gguf', '.pt', '.pth', '.onnx', '.h5', '.pb'].includes(ext) ||
             fs.statSync(path.join(modelsDir, file)).isDirectory();
    });

    const models = modelFiles.map(file => {
      const fullPath = path.join(modelsDir, file);
      const stats = fs.statSync(fullPath);
      
      return {
        name: file,
        path: fullPath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        modified: stats.mtime
      };
    });

    console.log(`Found ${models.length} models in ${modelsDir}`);
    return { success: true, models, modelsDir };
  } catch (error) {
    console.error('Error scanning models folder:', error);
    return { success: false, error: error.message, models: [], modelsDir };
  }
}

function getModelInfo(modelPath) {
  try {
    const stats = fs.statSync(modelPath);
    const configPath = path.join(path.dirname(modelPath), 'config.json');
    
    let config = null;
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
    }

    return {
      success: true,
      name: path.basename(modelPath),
      size: stats.size,
      modified: stats.mtime,
      config: config
    };
  } catch (error) {
    console.error('Error reading model info:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  scanModelsFolder,
  getModelInfo
};
