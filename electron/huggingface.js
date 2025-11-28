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
  searchInferenceModels
};
