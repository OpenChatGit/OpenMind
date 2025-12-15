/**
 * OpenMind Model Manager
 * 
 * Manages local GGUF models with custom configurations.
 * Similar to Ollama's model creation but for direct GGUF usage.
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Store for custom model configurations
let modelConfigs = {};
const CONFIG_FILE = 'openmind-models.json';

/**
 * Get the models directory path
 */
function getModelsDir() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'models');
}

/**
 * Get the config file path
 */
function getConfigPath() {
    return path.join(app.getPath('userData'), CONFIG_FILE);
}

/**
 * Load model configurations from disk
 */
function loadModelConfigs() {
    try {
        const configPath = getConfigPath();
        if (fs.existsSync(configPath)) {
            modelConfigs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('Loaded OpenMind model configs:', Object.keys(modelConfigs).length);
        }
    } catch (err) {
        console.error('Error loading OpenMind model configs:', err);
        modelConfigs = {};
    }
    return modelConfigs;
}

/**
 * Save model configurations to disk
 */
function saveModelConfigs() {
    try {
        const configPath = getConfigPath();
        fs.writeFileSync(configPath, JSON.stringify(modelConfigs, null, 2));
        console.log('Saved OpenMind model configs');
    } catch (err) {
        console.error('Error saving OpenMind model configs:', err);
    }
}

/**
 * Parse GGUF file header to extract metadata
 */
async function parseGGUFMetadata(filePath) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const headerBuffer = Buffer.alloc(8);
        fs.readSync(fd, headerBuffer, 0, 8, 0);
        
        // Check GGUF magic number
        const magic = headerBuffer.toString('ascii', 0, 4);
        if (magic !== 'GGUF') {
            fs.closeSync(fd);
            return { error: 'Not a valid GGUF file' };
        }
        
        // Read version (uint32 at offset 4)
        const version = headerBuffer.readUInt32LE(4);
        
        fs.closeSync(fd);
        
        // Extract info from filename
        const filename = path.basename(filePath);
        const info = parseModelFilename(filename);
        
        return {
            magic,
            version,
            filename,
            ...info,
            path: filePath,
            size: fs.statSync(filePath).size,
            sizeFormatted: formatSize(fs.statSync(filePath).size)
        };
    } catch (err) {
        console.error('Error parsing GGUF:', err);
        return { error: err.message };
    }
}

/**
 * Parse model info from filename
 * Examples: 
 * - llama-2-7b-chat.Q4_K_M.gguf
 * - mistral-7b-instruct-v0.2.Q5_K_S.gguf
 * - qwen2.5-7b-instruct-q4_k_m.gguf
 */
function parseModelFilename(filename) {
    const info = {
        baseName: filename.replace('.gguf', ''),
        quantization: null,
        parameters: null,
        variant: null
    };
    
    // Extract quantization (Q4_K_M, Q5_K_S, Q8_0, f16, etc.)
    const quantMatch = filename.match(/[._-](Q\d+_K_[MSL]|Q\d+_\d+|Q\d+|f16|f32|fp16|fp32)/i);
    if (quantMatch) {
        info.quantization = quantMatch[1].toUpperCase();
    }
    
    // Extract parameter count (7b, 13b, 70b, etc.)
    const paramMatch = filename.match(/(\d+\.?\d*)[bB]/);
    if (paramMatch) {
        info.parameters = paramMatch[1] + 'B';
    }
    
    // Extract variant (chat, instruct, code, etc.)
    const variants = ['chat', 'instruct', 'code', 'coder', 'base', 'uncensored'];
    for (const v of variants) {
        if (filename.toLowerCase().includes(v)) {
            info.variant = v;
            break;
        }
    }
    
    return info;
}

/**
 * Format file size
 */
function formatSize(bytes) {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
}

/**
 * Create a custom OpenMind model configuration
 */
async function createModel(config, onProgress) {
    const { name, baseModel, systemPrompt, params, chatTemplate } = config;
    
    if (!name || !baseModel) {
        return { success: false, error: 'Name and base model are required' };
    }
    
    if (onProgress) onProgress({ type: 'info', message: `Creating model "${name}"...` });
    
    // Verify base model exists
    const modelsDir = getModelsDir();
    let modelPath = baseModel;
    
    // If baseModel is just a filename, look in models directory
    if (!path.isAbsolute(baseModel)) {
        modelPath = path.join(modelsDir, baseModel);
        if (!modelPath.endsWith('.gguf')) {
            modelPath += '.gguf';
        }
    }
    
    if (!fs.existsSync(modelPath)) {
        // Try to find the model
        const files = fs.existsSync(modelsDir) ? fs.readdirSync(modelsDir) : [];
        const match = files.find(f => 
            f.toLowerCase().includes(baseModel.toLowerCase()) && f.endsWith('.gguf')
        );
        if (match) {
            modelPath = path.join(modelsDir, match);
        } else {
            return { success: false, error: `Base model not found: ${baseModel}` };
        }
    }
    
    if (onProgress) onProgress({ type: 'info', message: 'Validating GGUF file...' });
    
    // Parse GGUF metadata
    const metadata = await parseGGUFMetadata(modelPath);
    if (metadata.error) {
        return { success: false, error: metadata.error };
    }
    
    if (onProgress) onProgress({ type: 'info', message: 'Creating model configuration...' });
    
    // Create model config
    const modelConfig = {
        name,
        baseModel: modelPath,
        baseName: metadata.baseName,
        systemPrompt: systemPrompt || '',
        params: {
            temperature: params?.temperature ?? 0.7,
            top_p: params?.top_p ?? 0.9,
            top_k: params?.top_k ?? 40,
            repeat_penalty: params?.repeat_penalty ?? 1.1,
            num_ctx: params?.num_ctx ?? 4096,
            num_predict: params?.num_predict ?? -1,
            ...params
        },
        chatTemplate: chatTemplate || 'default',
        metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save to configs
    modelConfigs[name] = modelConfig;
    saveModelConfigs();
    
    if (onProgress) onProgress({ type: 'success', message: `Model "${name}" created successfully!` });
    
    return { success: true, model: modelConfig };
}

/**
 * Update an existing model configuration
 */
function updateModel(name, updates) {
    if (!modelConfigs[name]) {
        return { success: false, error: `Model "${name}" not found` };
    }
    
    modelConfigs[name] = {
        ...modelConfigs[name],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    saveModelConfigs();
    return { success: true, model: modelConfigs[name] };
}

/**
 * Delete a model configuration
 */
function deleteModel(name) {
    if (!modelConfigs[name]) {
        return { success: false, error: `Model "${name}" not found` };
    }
    
    delete modelConfigs[name];
    saveModelConfigs();
    return { success: true };
}

/**
 * Get a model configuration
 */
function getModel(name) {
    return modelConfigs[name] || null;
}

/**
 * List all custom models
 */
function listModels() {
    return Object.values(modelConfigs);
}

/**
 * Scan for available GGUF models
 */
function scanGGUFModels() {
    const modelsDir = getModelsDir();
    
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
        return [];
    }
    
    const files = fs.readdirSync(modelsDir);
    const models = files
        .filter(f => f.endsWith('.gguf'))
        .map(f => {
            const filePath = path.join(modelsDir, f);
            const stats = fs.statSync(filePath);
            const info = parseModelFilename(f);
            
            return {
                filename: f,
                path: filePath,
                size: stats.size,
                sizeFormatted: formatSize(stats.size),
                modified: stats.mtime,
                ...info
            };
        });
    
    return models;
}

/**
 * Import a GGUF model from external path
 */
async function importModel(sourcePath, onProgress) {
    if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'Source file not found' };
    }
    
    if (!sourcePath.endsWith('.gguf')) {
        return { success: false, error: 'Only GGUF files are supported' };
    }
    
    const filename = path.basename(sourcePath);
    const modelsDir = getModelsDir();
    const destPath = path.join(modelsDir, filename);
    
    if (fs.existsSync(destPath)) {
        return { success: false, error: 'Model already exists' };
    }
    
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
    }
    
    if (onProgress) onProgress({ type: 'info', message: `Importing ${filename}...` });
    
    // Copy file with progress
    const stats = fs.statSync(sourcePath);
    const totalSize = stats.size;
    let copiedSize = 0;
    
    return new Promise((resolve) => {
        const readStream = fs.createReadStream(sourcePath);
        const writeStream = fs.createWriteStream(destPath);
        
        readStream.on('data', (chunk) => {
            copiedSize += chunk.length;
            const progress = Math.round((copiedSize / totalSize) * 100);
            if (onProgress) {
                onProgress({ 
                    type: 'progress', 
                    message: `Importing: ${progress}%`,
                    progress 
                });
            }
        });
        
        readStream.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });
        
        writeStream.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });
        
        writeStream.on('finish', () => {
            if (onProgress) onProgress({ type: 'success', message: 'Import complete!' });
            resolve({ success: true, path: destPath, filename });
        });
        
        readStream.pipe(writeStream);
    });
}

/**
 * Get model presets/templates
 */
function getModelPresets() {
    return [
        {
            id: 'assistant',
            name: 'General Assistant',
            description: 'Helpful, harmless, and honest assistant',
            systemPrompt: 'You are a helpful, harmless, and honest AI assistant. You provide accurate, thoughtful responses while being respectful and considerate.',
            params: { temperature: 0.7, top_p: 0.9 }
        },
        {
            id: 'coder',
            name: 'Code Assistant',
            description: 'Expert programmer and code reviewer',
            systemPrompt: 'You are an expert programmer. You write clean, efficient, well-documented code. You explain your reasoning and suggest best practices. When reviewing code, you identify bugs, security issues, and areas for improvement.',
            params: { temperature: 0.3, top_p: 0.95 }
        },
        {
            id: 'creative',
            name: 'Creative Writer',
            description: 'Creative writing and storytelling',
            systemPrompt: 'You are a creative writer with a vivid imagination. You craft engaging stories, poems, and creative content. You have a unique voice and style that captivates readers.',
            params: { temperature: 0.9, top_p: 0.95, repeat_penalty: 1.05 }
        },
        {
            id: 'analyst',
            name: 'Data Analyst',
            description: 'Data analysis and insights',
            systemPrompt: 'You are a data analyst expert. You analyze data, identify patterns, and provide actionable insights. You explain complex statistical concepts in simple terms and create clear visualizations.',
            params: { temperature: 0.4, top_p: 0.9 }
        },
        {
            id: 'tutor',
            name: 'Learning Tutor',
            description: 'Patient teacher and explainer',
            systemPrompt: 'You are a patient and encouraging tutor. You explain concepts step by step, use analogies and examples, and adapt your teaching style to the learner. You celebrate progress and gently correct mistakes.',
            params: { temperature: 0.6, top_p: 0.9 }
        },
        {
            id: 'researcher',
            name: 'Research Assistant',
            description: 'Academic research and analysis',
            systemPrompt: 'You are a research assistant with expertise in academic writing and analysis. You help with literature reviews, methodology design, and critical analysis. You cite sources properly and maintain academic rigor.',
            params: { temperature: 0.5, top_p: 0.9 }
        }
    ];
}

/**
 * Chat templates for different model families
 */
function getChatTemplates() {
    return {
        'default': {
            name: 'Default',
            description: 'Standard chat format',
            format: (messages, systemPrompt) => {
                let prompt = '';
                if (systemPrompt) {
                    prompt += `System: ${systemPrompt}\n\n`;
                }
                for (const msg of messages) {
                    if (msg.role === 'user') {
                        prompt += `User: ${msg.content}\n`;
                    } else if (msg.role === 'assistant') {
                        prompt += `Assistant: ${msg.content}\n`;
                    }
                }
                prompt += 'Assistant:';
                return prompt;
            }
        },
        'llama2': {
            name: 'Llama 2',
            description: 'Meta Llama 2 chat format',
            format: (messages, systemPrompt) => {
                let prompt = '<s>';
                if (systemPrompt) {
                    prompt += `[INST] <<SYS>>\n${systemPrompt}\n<</SYS>>\n\n`;
                }
                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    if (msg.role === 'user') {
                        if (i === 0 && !systemPrompt) {
                            prompt += `[INST] ${msg.content} [/INST]`;
                        } else if (i === 0) {
                            prompt += `${msg.content} [/INST]`;
                        } else {
                            prompt += `<s>[INST] ${msg.content} [/INST]`;
                        }
                    } else if (msg.role === 'assistant') {
                        prompt += ` ${msg.content} </s>`;
                    }
                }
                return prompt;
            }
        },
        'chatml': {
            name: 'ChatML',
            description: 'OpenAI ChatML format (Qwen, etc.)',
            format: (messages, systemPrompt) => {
                let prompt = '';
                if (systemPrompt) {
                    prompt += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
                }
                for (const msg of messages) {
                    prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
                }
                prompt += '<|im_start|>assistant\n';
                return prompt;
            }
        },
        'mistral': {
            name: 'Mistral',
            description: 'Mistral Instruct format',
            format: (messages, systemPrompt) => {
                let prompt = '<s>';
                for (const msg of messages) {
                    if (msg.role === 'user') {
                        const content = systemPrompt 
                            ? `${systemPrompt}\n\n${msg.content}` 
                            : msg.content;
                        prompt += `[INST] ${content} [/INST]`;
                        systemPrompt = null; // Only add system prompt once
                    } else if (msg.role === 'assistant') {
                        prompt += ` ${msg.content}</s>`;
                    }
                }
                return prompt;
            }
        },
        'alpaca': {
            name: 'Alpaca',
            description: 'Stanford Alpaca format',
            format: (messages, systemPrompt) => {
                let prompt = '';
                if (systemPrompt) {
                    prompt += `${systemPrompt}\n\n`;
                }
                for (const msg of messages) {
                    if (msg.role === 'user') {
                        prompt += `### Instruction:\n${msg.content}\n\n`;
                    } else if (msg.role === 'assistant') {
                        prompt += `### Response:\n${msg.content}\n\n`;
                    }
                }
                prompt += '### Response:\n';
                return prompt;
            }
        }
    };
}

// Initialize on module load
loadModelConfigs();

module.exports = {
    getModelsDir,
    loadModelConfigs,
    createModel,
    updateModel,
    deleteModel,
    getModel,
    listModels,
    scanGGUFModels,
    importModel,
    parseGGUFMetadata,
    getModelPresets,
    getChatTemplates
};
