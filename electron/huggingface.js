const https = require('https');
const fs = require('fs');
const path = require('path');

let apiToken = null;

// Cache for author avatars to avoid repeated requests
const avatarCache = new Map();

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

// Fetch avatar URL for an author/organization from HuggingFace
function fetchAuthorAvatar(author) {
  return new Promise((resolve) => {
    // Check cache first
    if (avatarCache.has(author)) {
      resolve(avatarCache.get(author));
      return;
    }

    // Fetch the author's page and extract avatar URL
    const url = `https://huggingface.co/${author}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Look for avatar URL pattern: cdn-avatars.huggingface.co/...
        // The URL might be in JSON with &quot; entities or regular quotes
        // Match until we hit a quote, &quot;, whitespace, or end of URL
        const match = data.match(/https:\/\/cdn-avatars\.huggingface\.co\/v1\/production\/uploads\/[a-zA-Z0-9\/_-]+\.[a-zA-Z]+/);
        if (match) {
          // Found avatar URL, now fetch it as base64 to bypass CORS
          fetchImageAsBase64(match[0]).then(base64 => {
            avatarCache.set(author, base64);
            resolve(base64);
          }).catch(() => {
            avatarCache.set(author, null);
            resolve(null);
          });
        } else {
          avatarCache.set(author, null);
          resolve(null);
        }
      });
    }).on('error', () => {
      avatarCache.set(author, null);
      resolve(null);
    });
  });
}

// Fetch image and convert to base64 data URL
function fetchImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchImageAsBase64(res.headers.location).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // Get content type from header or infer from URL extension
        let contentType = res.headers['content-type'];
        if (!contentType || contentType.includes('octet-stream')) {
          // Infer from URL extension
          const ext = imageUrl.split('.').pop()?.toLowerCase();
          const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'ico': 'image/x-icon',
            'bmp': 'image/bmp'
          };
          contentType = mimeTypes[ext] || 'image/png';
        }
        const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;
        resolve(base64);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Fetch avatars for multiple authors in parallel
async function fetchAvatarsForModels(models) {
  const uniqueAuthors = [...new Set(models.map(m => m.author))];
  
  // Fetch all avatars in parallel (with timeout to not block too long)
  await Promise.all(uniqueAuthors.map(author => 
    Promise.race([
      fetchAuthorAvatar(author),
      new Promise(resolve => setTimeout(() => resolve(null), 3000)) // 3s timeout
    ])
  ));
  
  // Apply cached avatars to models
  return models.map(m => ({
    ...m,
    avatarUrl: avatarCache.get(m.author) || null
  }));
}

async function searchModels(query = '', limit = 20) {
  return new Promise((resolve) => {
    // Search for GGUF models - sort by downloads for popular models
    const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=${limit}&sort=downloads&direction=-1`;
    
    const options = {
      headers: apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', async () => {
        try {
          const parsed = JSON.parse(data);
          
          // Handle various response formats
          let models = [];
          if (Array.isArray(parsed)) {
            models = parsed;
          } else if (parsed.models && Array.isArray(parsed.models)) {
            models = parsed.models;
          } else if (parsed.value && Array.isArray(parsed.value)) {
            models = parsed.value;
          } else if (parsed.error) {
            console.error('HF API error:', parsed.error);
            resolve({ success: false, error: parsed.error, models: [] });
            return;
          }
          
          // Format models with basic info
          const formatted = models.map(m => {
            const modelId = m.id || m.modelId;
            const author = modelId.split('/')[0];
            return {
              id: modelId,
              name: modelId,
              author: author,
              avatarUrl: null, // Will be filled by fetchAvatarsForModels
              downloads: m.downloads || 0,
              likes: m.likes || 0,
              tags: m.tags || [],
              pipeline_tag: m.pipeline_tag,
              library_name: m.library_name
            };
          });
          
          // Fetch avatars for all unique authors
          const modelsWithAvatars = await fetchAvatarsForModels(formatted);
          resolve({ success: true, models: modelsWithAvatars });
        } catch (error) {
          console.error('Error parsing models:', error);
          console.error('Raw data:', data.slice(0, 1000));
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

// Reasoning tag patterns used by various models
const THINKING_START_PATTERNS = [
  '<think>', '<thinking>', '<reasoning>', '<thought>',
  '<|think|>', '<|thinking|>', '<|reasoning|>',
  '**Thinking:**', '**Reasoning:**', '**思考:**',
  '[thinking]', '[reasoning]', '[think]'
];

const THINKING_END_PATTERNS = [
  '</think>', '</thinking>', '</reasoning>', '</thought>',
  '<|/think|>', '<|/thinking|>', '<|/reasoning|>',
  '**End Thinking**', '**End Reasoning**',
  '[/thinking]', '[/reasoning]', '[/think]'
];

// Check if text contains any thinking start pattern
function findThinkingStart(text) {
  for (const pattern of THINKING_START_PATTERNS) {
    const idx = text.indexOf(pattern);
    if (idx !== -1) {
      return { index: idx, pattern, length: pattern.length };
    }
  }
  return null;
}

// Check if text contains any thinking end pattern
function findThinkingEnd(text) {
  for (const pattern of THINKING_END_PATTERNS) {
    const idx = text.indexOf(pattern);
    if (idx !== -1) {
      return { index: idx, pattern, length: pattern.length };
    }
  }
  return null;
}

// HuggingFace Inference API for chat completions
function sendInferenceMessage(model, messages, onChunk, onThinking) {
  return new Promise((resolve, reject) => {
    if (!apiToken) {
      reject(new Error('HuggingFace API token not set'));
      return;
    }

    // Track timing for stats
    const startTime = Date.now();
    let firstTokenTime = null;
    let tokenCount = 0;

    // Convert messages to HF format
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Estimate prompt tokens (rough: ~4 chars per token)
    const promptText = formattedMessages.map(m => m.content).join(' ');
    const promptTokenEstimate = Math.ceil(promptText.length / 4);

    const postData = JSON.stringify({
      model: model,
      messages: formattedMessages,
      stream: true,
      max_tokens: 2048
    });

    // Use the new HF Router API
    console.log('HF Inference request:', { model, endpoint: `/v1/chat/completions` });

    const options = {
      hostname: 'router.huggingface.co',
      path: `/v1/chat/completions`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let fullContent = '';
      let fullThinking = '';
      let buffer = '';
      let rawResponse = '';
      let isInThinkBlock = false;
      let pendingText = ''; // Buffer for detecting split tags

      console.log('HF Inference response status:', res.statusCode);

      // Handle non-200 responses
      if (res.statusCode !== 200) {
        res.on('data', (chunk) => {
          rawResponse += chunk.toString();
        });
        res.on('end', () => {
          console.error('HF Inference error response:', rawResponse);
          try {
            const errorData = JSON.parse(rawResponse);
            const errorMsg = typeof errorData.error === 'object' 
              ? errorData.error.message || JSON.stringify(errorData.error)
              : errorData.error || `HTTP ${res.statusCode}`;
            reject(new Error(errorMsg));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}: ${rawResponse.slice(0, 200)}`));
          }
        });
        return;
      }

      // Process accumulated text for thinking patterns
      // Some models start with thinking implicitly (no opening tag, just closing </think>)
      let hasSeenAnyContent = false;
      let implicitThinkingMode = true; // Assume we start in thinking mode until proven otherwise
      
      const processText = (text) => {
        let remaining = text;
        
        while (remaining.length > 0) {
          if (isInThinkBlock || implicitThinkingMode) {
            // Look for end of thinking
            const endMatch = findThinkingEnd(remaining);
            if (endMatch) {
              // Add text before end tag to thinking
              fullThinking += remaining.slice(0, endMatch.index);
              if (onThinking) onThinking(fullThinking);
              isInThinkBlock = false;
              implicitThinkingMode = false; // We found the end, no longer in implicit mode
              remaining = remaining.slice(endMatch.index + endMatch.length);
              hasSeenAnyContent = true;
            } else {
              // Check if there's a start tag (explicit thinking block)
              const startMatch = findThinkingStart(remaining);
              if (startMatch && !isInThinkBlock) {
                // Found explicit start - we weren't actually in implicit thinking mode
                // Everything before this is content
                if (implicitThinkingMode && fullThinking.length === 0) {
                  // We haven't added anything to thinking yet, so this is content
                  implicitThinkingMode = false;
                  if (startMatch.index > 0) {
                    fullContent += remaining.slice(0, startMatch.index);
                    if (onChunk) onChunk(fullContent);
                  }
                  isInThinkBlock = true;
                  remaining = remaining.slice(startMatch.index + startMatch.length);
                  hasSeenAnyContent = true;
                  continue;
                }
              }
              
              // Still in thinking block, add all to thinking
              fullThinking += remaining;
              if (onThinking) onThinking(fullThinking);
              remaining = '';
            }
          } else {
            // Look for start of thinking
            const startMatch = findThinkingStart(remaining);
            if (startMatch) {
              // Add text before start tag to content
              if (startMatch.index > 0) {
                fullContent += remaining.slice(0, startMatch.index);
                if (onChunk) onChunk(fullContent);
              }
              isInThinkBlock = true;
              remaining = remaining.slice(startMatch.index + startMatch.length);
              hasSeenAnyContent = true;
            } else {
              // No thinking tag, add to content
              fullContent += remaining;
              if (onChunk) onChunk(fullContent);
              remaining = '';
              hasSeenAnyContent = true;
            }
          }
        }
      };

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              // Method 1: Check for reasoning_content field (DeepSeek-R1, Qwen-QwQ style)
              if (delta?.reasoning_content) {
                fullThinking += delta.reasoning_content;
                if (onThinking) onThinking(fullThinking);
              }
              
              // Method 2: Check for thinking field
              if (delta?.thinking) {
                fullThinking += delta.thinking;
                if (onThinking) onThinking(fullThinking);
              }
              
              // Method 3: Process content for inline thinking tags
              if (delta?.content) {
                // Track first token time
                if (!firstTokenTime) {
                  firstTokenTime = Date.now();
                }
                tokenCount++;
                
                pendingText += delta.content;
                
                // Process when we have enough text or see potential tag boundaries
                if (pendingText.length > 50 || 
                    pendingText.includes('>') || 
                    pendingText.includes(']') ||
                    pendingText.includes('*')) {
                  processText(pendingText);
                  pendingText = '';
                }
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
              console.log('Parse chunk error (may be incomplete):', data.slice(0, 50));
            }
          }
        }
      });

      res.on('end', () => {
        // Process any remaining pending text
        if (pendingText.length > 0) {
          processText(pendingText);
        }
        
        // If we were in implicit thinking mode the whole time and never found an end tag,
        // then it was probably just regular content (model doesn't use thinking tags)
        if (implicitThinkingMode && fullThinking.length > 0 && fullContent.length === 0) {
          // Check if the "thinking" actually contains a closing tag somewhere
          const hasEndTag = THINKING_END_PATTERNS.some(p => fullThinking.includes(p));
          if (!hasEndTag) {
            // No end tag found - this was regular content, not thinking
            fullContent = fullThinking;
            fullThinking = '';
            if (onChunk) onChunk(fullContent);
          }
        }
        
        // Calculate stats
        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        const timeToFirstToken = firstTokenTime ? firstTokenTime - startTime : 0;
        const evalDuration = firstTokenTime ? endTime - firstTokenTime : totalDuration;
        
        // Estimate output tokens (rough: ~4 chars per token)
        const evalCount = Math.ceil((fullContent.length + fullThinking.length) / 4);
        const evalRate = evalDuration > 0 ? (evalCount / (evalDuration / 1000)).toFixed(2) : 0;
        
        const stats = {
          total_duration: totalDuration * 1000000, // Convert to nanoseconds like Ollama
          prompt_eval_count: promptTokenEstimate,
          prompt_eval_duration: timeToFirstToken * 1000000,
          prompt_eval_rate: timeToFirstToken > 0 ? (promptTokenEstimate / (timeToFirstToken / 1000)).toFixed(2) : 0,
          eval_count: evalCount,
          eval_duration: evalDuration * 1000000,
          eval_rate: parseFloat(evalRate),
          model: model,
          provider: 'huggingface'
        };
        
        console.log('HF Inference complete, content length:', fullContent.length, 'thinking length:', fullThinking.length, 'stats:', stats);
        resolve({ content: fullContent, thinking: fullThinking, stats: stats });
      });
    });

    req.on('error', (error) => {
      console.error('HF Inference request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Get default inference models (known to work with HF Pro)
function getInferenceModels() {
  return [
    { id: 'meta-llama/Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B', size: '3B' },
    { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', size: '8B' },
    { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B', size: '7B' },
    { id: 'microsoft/Phi-3.5-mini-instruct', name: 'Phi-3.5 Mini', size: '3.8B' },
    { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B', size: '7B' },
  ];
}

// Search for text-generation models on HuggingFace
function searchInferenceModels(query = '', limit = 5) {
  return new Promise((resolve) => {
    // Search for conversational/text-generation models
    const searchQuery = query || 'chat';
    const url = `https://huggingface.co/api/models?search=${encodeURIComponent(searchQuery)}&filter=text-generation&sort=downloads&direction=-1&limit=${limit}`;
    
    const options = {
      headers: apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const models = JSON.parse(data);
          const formatted = models
            .filter(m => m.pipeline_tag === 'text-generation' || m.tags?.includes('conversational'))
            .map(m => ({
              id: m.id || m.modelId,
              name: (m.id || m.modelId).split('/').pop(),
              size: formatModelSize(m.safetensors?.total || 0),
              downloads: m.downloads || 0
            }));
          resolve({ success: true, models: formatted });
        } catch (error) {
          console.error('Error parsing inference models:', error);
          resolve({ success: false, error: error.message, models: [] });
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching inference models:', error);
      resolve({ success: false, error: error.message, models: [] });
    });
  });
}

// Format model size from bytes
function formatModelSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)}GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)}MB`;
}

// Remove YAML front matter from README (the --- ... --- block at the start)
function stripYamlFrontMatter(content) {
  if (!content) return '';
  // Check if starts with ---
  let result = content.trimStart();
  if (result.startsWith('---')) {
    // Find the closing ---
    const endIndex = result.indexOf('---', 3);
    if (endIndex !== -1) {
      // Return everything after the closing --- and newline
      result = result.slice(endIndex + 3).trimStart();
    }
  }
  
  // Remove HTML comments (<!-- ... -->)
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  
  return result.trimStart();
}

// Fetch model README/Model Card from HuggingFace
function fetchModelReadme(modelId) {
  return new Promise((resolve) => {
    const url = `https://huggingface.co/${modelId}/raw/main/README.md`;
    
    const options = {
      headers: apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}
    };

    https.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, options, (res2) => {
          let data = '';
          res2.on('data', (chunk) => data += chunk);
          res2.on('end', () => resolve(res2.statusCode === 200 ? stripYamlFrontMatter(data) : ''));
        }).on('error', () => resolve(''));
        return;
      }
      
      if (res.statusCode !== 200) {
        resolve('');
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(stripYamlFrontMatter(data)));
    }).on('error', () => resolve(''));
  });
}

// Get detailed model info from HuggingFace
function getModelInfo(modelId) {
  return new Promise((resolve) => {
    const url = `https://huggingface.co/api/models/${modelId}`;
    
    const options = {
      headers: apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', async () => {
        try {
          const model = JSON.parse(data);
          
          // Get author avatar and README in parallel
          const author = modelId.split('/')[0];
          const [avatarUrl, readme] = await Promise.all([
            avatarCache.get(author) || fetchAuthorAvatar(author),
            fetchModelReadme(modelId)
          ]);
          
          // Extract GGUF files from siblings
          const ggufFiles = (model.siblings || [])
            .filter(f => f.rfilename?.endsWith('.gguf'))
            .map(f => ({
              name: f.rfilename,
              size: f.size || 0,
              sizeFormatted: formatModelSize(f.size || 0)
            }));
          
          const result = {
            id: model.id || model.modelId,
            author: model.author || author,
            avatarUrl: avatarUrl,
            downloads: model.downloads || 0,
            likes: model.likes || 0,
            tags: model.tags || [],
            pipeline_tag: model.pipeline_tag,
            library_name: model.library_name,
            lastModified: model.lastModified,
            createdAt: model.createdAt,
            description: model.cardData?.description || '',
            license: model.cardData?.license || model.tags?.find(t => t.startsWith('license:'))?.replace('license:', '') || '',
            ggufFiles: ggufFiles,
            modelSize: model.safetensors?.total ? formatModelSize(model.safetensors.total) : '',
            readme: readme || '',
            // GGUF specific info
            gguf: model.gguf ? {
              contextLength: model.gguf.context_length,
              architecture: model.gguf.architecture,
              totalSize: formatModelSize(model.gguf.total || 0)
            } : null
          };
          
          resolve({ success: true, model: result });
        } catch (error) {
          console.error('Error parsing model info:', error);
          resolve({ success: false, error: error.message });
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching model info:', error);
      resolve({ success: false, error: error.message });
    });
  });
}

// Download a GGUF file from HuggingFace
// onProgress callback receives { percent, downloaded, total, speed }
function downloadGGUF(modelId, filename, onProgress) {
  return new Promise((resolve, reject) => {
    const modelsDir = path.join(__dirname, '..', 'models');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    const localFilename = `${modelId.replace('/', '_')}_${filename}`;
    const filePath = path.join(modelsDir, localFilename);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      resolve({
        success: true,
        path: filePath,
        filename: localFilename,
        message: 'File already exists'
      });
      return;
    }

    // HuggingFace download URL
    const url = `https://huggingface.co/${modelId}/resolve/main/${filename}`;
    console.log('Downloading GGUF:', url);

    const options = {
      headers: apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}
    };

    const file = fs.createWriteStream(filePath);
    let downloadedBytes = 0;
    let totalBytes = 0;
    let startTime = Date.now();

    const makeRequest = (requestUrl) => {
      https.get(requestUrl, options, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          makeRequest(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filePath);
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        totalBytes = parseInt(res.headers['content-length'], 10) || 0;

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          file.write(chunk);

          if (onProgress && totalBytes > 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = downloadedBytes / elapsed;
            onProgress({
              percent: Math.round((downloadedBytes / totalBytes) * 100),
              downloaded: downloadedBytes,
              total: totalBytes,
              speed: speed,
              speedFormatted: formatModelSize(speed) + '/s',
              downloadedFormatted: formatModelSize(downloadedBytes),
              totalFormatted: formatModelSize(totalBytes)
            });
          }
        });

        res.on('end', () => {
          file.end();
          console.log('Download complete:', filePath);
          resolve({
            success: true,
            path: filePath,
            filename: localFilename,
            message: 'Download complete'
          });
        });

        res.on('error', (err) => {
          file.close();
          fs.unlinkSync(filePath);
          reject(err);
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        reject(err);
      });
    };

    makeRequest(url);
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
  getUserInfo,
  sendInferenceMessage,
  getInferenceModels,
  searchInferenceModels,
  getModelInfo,
  downloadGGUF
};
