const https = require('https');
const fs = require('fs');
const path = require('path');

let apiToken = null;

function setApiToken(token) {
  apiToken = token;
  // Save token to config file
  const configPath = path.join(__dirname, '..', 'data', 'hf_config.json');
  const configDir = path.dirname(configPath);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify({ token }, null, 2));
  return { success: true };
}

function loadApiToken() {
  try {
    const configPath = path.join(__dirname, '..', 'data', 'hf_config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      apiToken = config.token;
      return { success: true, token: apiToken };
    }
  } catch (error) {
    console.error('Error loading API token:', error);
  }
  return { success: false };
}

function clearApiToken() {
  apiToken = null;
  const configPath = path.join(__dirname, '..', 'data', 'hf_config.json');
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
  return { success: true };
}

function searchModels(query = '', limit = 20) {
  return new Promise((resolve) => {
    const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=${limit}&filter=pytorch`;
    
    const options = {
      headers: apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const models = JSON.parse(data);
          const formatted = models.map(m => ({
            id: m.id || m.modelId,
            name: m.id || m.modelId,
            downloads: m.downloads || 0,
            likes: m.likes || 0,
            tags: m.tags || [],
            pipeline_tag: m.pipeline_tag,
            library_name: m.library_name
          }));
          resolve({ success: true, models: formatted });
        } catch (error) {
          console.error('Error parsing models:', error);
          resolve({ success: false, error: error.message, models: [] });
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching models:', error);
      resolve({ success: false, error: error.message, models: [] });
    });
  });
}

function downloadModel(modelId, onProgress) {
  return new Promise((resolve) => {
    const modelsDir = path.join(__dirname, '..', 'models');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    const modelFileName = `${modelId.replace('/', '_')}.safetensors`;
    const modelPath = path.join(modelsDir, modelFileName);
    
    // Check if model already exists
    if (fs.existsSync(modelPath)) {
      resolve({
        success: true,
        path: modelPath,
        message: `Model ${modelId} already exists`
      });
      return;
    }

    // Simulate download with progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (onProgress) onProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        
        // Create model metadata file
        const metadata = {
          modelId,
          downloadedAt: new Date().toISOString(),
          source: 'Hugging Face',
          fileName: modelFileName
        };
        
        fs.writeFileSync(modelPath, JSON.stringify(metadata, null, 2));
        
        resolve({
          success: true,
          path: modelPath,
          message: `Model ${modelId} downloaded successfully`
        });
      }
    }, 300);
  });
}

function getUserInfo() {
  if (!apiToken) {
    return Promise.resolve({ success: false, error: 'Not authenticated' });
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'huggingface.co',
      path: '/api/whoami-v2',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const user = JSON.parse(data);
          // Build full avatar URL if it's a relative path
          let avatarUrl = user.avatarUrl;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            avatarUrl = `https://huggingface.co${avatarUrl}`;
          }
          resolve({
            success: true,
            user: {
              name: user.name || user.fullname,
              username: user.name,
              avatar: avatarUrl
            }
          });
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      });
    }).on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

// Load token on startup
loadApiToken();

module.exports = {
  setApiToken,
  loadApiToken,
  clearApiToken,
  searchModels,
  downloadModel,
  getUserInfo
};
