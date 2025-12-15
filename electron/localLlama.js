/**
 * Local LLM Inference using node-llama-cpp
 * 
 * This module provides local inference without needing Ollama installed.
 * Supports GGUF models directly with OpenMind model configurations.
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let llama = null;
let model = null;
let context = null;
let contextSequence = null; // Reusable sequence
let currentModelPath = null;
let currentModelConfig = null; // OpenMind model configuration

// Get models directory
function getModelsDir() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'models');
}

// Initialize llama.cpp (lazy load)
async function initLlama() {
    if (llama) return llama;
    
    try {
        // Dynamic import for node-llama-cpp
        const { getLlama } = await import('node-llama-cpp');
        llama = await getLlama();
        console.log('node-llama-cpp initialized');
        return llama;
    } catch (error) {
        console.error('Failed to initialize node-llama-cpp:', error);
        throw error;
    }
}

// Load a GGUF model (with optional OpenMind config)
async function loadModel(modelPath, onProgress, modelConfig = null) {
    if (currentModelPath === modelPath && model) {
        console.log('Model already loaded:', modelPath);
        // Update config if provided
        if (modelConfig) {
            currentModelConfig = modelConfig;
        }
        return { success: true, alreadyLoaded: true };
    }
    
    // Unload previous model
    if (model) {
        await unloadModel();
    }
    
    try {
        if (onProgress) onProgress({ status: 'loading', message: `Loading model: ${path.basename(modelPath)}` });
        
        const llamaInstance = await initLlama();
        
        console.log('Loading model:', modelPath);
        
        // Build model options from config
        const modelOptions = {
            modelPath: modelPath,
            onLoadProgress: (progress) => {
                if (onProgress) {
                    onProgress({ 
                        status: 'loading', 
                        message: `Loading: ${Math.round(progress * 100)}%`,
                        progress: progress 
                    });
                }
            }
        };
        
        // Apply GPU layers if specified in config
        if (modelConfig?.params?.gpu_layers !== undefined) {
            modelOptions.gpuLayers = modelConfig.params.gpu_layers;
        }
        
        model = await llamaInstance.loadModel(modelOptions);
        
        // Create context with config params
        const contextOptions = {};
        if (modelConfig?.params?.num_ctx) {
            contextOptions.contextSize = modelConfig.params.num_ctx;
        }
        
        context = await model.createContext(contextOptions);
        contextSequence = context.getSequence(); // Get sequence once and reuse
        currentModelPath = modelPath;
        currentModelConfig = modelConfig;
        
        console.log('Model loaded successfully');
        if (modelConfig) {
            console.log('Using OpenMind config:', modelConfig.name);
        }
        if (onProgress) onProgress({ status: 'ready', message: 'Model ready' });
        
        return { success: true, modelPath, config: modelConfig };
    } catch (error) {
        console.error('Failed to load model:', error);
        if (onProgress) onProgress({ status: 'error', message: error.message });
        return { success: false, error: error.message };
    }
}


// Unload current model
async function unloadModel() {
    contextSequence = null;
    if (context) {
        await context.dispose();
        context = null;
    }
    if (model) {
        await model.dispose();
        model = null;
    }
    currentModelPath = null;
    currentModelConfig = null;
    console.log('Model unloaded');
}

// Chat with the model (streaming)
async function chat(messages, onToken, onThinking, options = {}) {
    if (!model || !context || !contextSequence) {
        throw new Error('No model loaded. Call loadModel first.');
    }
    
    try {
        const { LlamaChatSession } = await import('node-llama-cpp');
        
        // Clear the sequence for a fresh conversation
        contextSequence.clearHistory();
        
        const session = new LlamaChatSession({
            contextSequence: contextSequence
        });
        
        // Build prompt from messages
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (!lastUserMessage) {
            throw new Error('No user message found');
        }
        
        // Set system prompt - priority: options > config > message
        let systemPrompt = null;
        if (options.systemPrompt) {
            systemPrompt = options.systemPrompt;
        } else if (currentModelConfig?.systemPrompt) {
            systemPrompt = currentModelConfig.systemPrompt;
        } else {
            const systemMessage = messages.find(m => m.role === 'system');
            if (systemMessage) {
                systemPrompt = systemMessage.content;
            }
        }
        
        if (systemPrompt) {
            session.systemPrompt = systemPrompt;
        }
        
        // Build generation options from config
        const genOptions = {
            onTextChunk: null // Set below
        };
        
        // Apply params from config or options
        const params = { ...currentModelConfig?.params, ...options };
        if (params.temperature !== undefined) genOptions.temperature = params.temperature;
        if (params.top_p !== undefined) genOptions.topP = params.top_p;
        if (params.top_k !== undefined) genOptions.topK = params.top_k;
        if (params.repeat_penalty !== undefined) genOptions.repeatPenalty = params.repeat_penalty;
        if (params.num_predict !== undefined && params.num_predict > 0) {
            genOptions.maxTokens = params.num_predict;
        }
        
        let fullResponse = '';
        let thinkingContent = '';
        let inThinkTag = false;
        
        // Stream the response
        genOptions.onTextChunk = (text) => {
            // Handle <think> tags
            if (text.includes('<think>')) {
                inThinkTag = true;
            }
            
            if (inThinkTag) {
                thinkingContent += text;
                if (text.includes('</think>')) {
                    inThinkTag = false;
                    // Extract thinking content
                    const match = thinkingContent.match(/<think>([\s\S]*?)<\/think>/);
                    if (match && onThinking) {
                        onThinking(match[1].trim());
                    }
                    thinkingContent = '';
                }
            } else {
                fullResponse += text;
                if (onToken) onToken(fullResponse);
            }
        };
        
        const response = await session.prompt(lastUserMessage.content, genOptions);
        
        return {
            content: fullResponse || response,
            thinking: thinkingContent,
            model: currentModelConfig?.name || path.basename(currentModelPath)
        };
    } catch (error) {
        console.error('Chat error:', error);
        throw error;
    }
}

// List available local models
function listLocalModels() {
    const modelsDir = getModelsDir();
    
    if (!fs.existsSync(modelsDir)) {
        return [];
    }
    
    const files = fs.readdirSync(modelsDir);
    const models = files
        .filter(f => f.endsWith('.gguf'))
        .map(f => {
            const filePath = path.join(modelsDir, f);
            const stats = fs.statSync(filePath);
            return {
                name: f.replace('.gguf', ''),
                filename: f,
                path: filePath,
                size: stats.size,
                sizeFormatted: formatSize(stats.size)
            };
        });
    
    return models;
}

function formatSize(bytes) {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
}

// Get status
function getStatus() {
    return {
        initialized: llama !== null,
        modelLoaded: model !== null,
        currentModel: currentModelPath ? path.basename(currentModelPath) : null,
        currentModelConfig: currentModelConfig,
        modelsDir: getModelsDir()
    };
}

// Get current model config
function getCurrentConfig() {
    return currentModelConfig;
}

// Set model config without reloading
function setModelConfig(config) {
    currentModelConfig = config;
}

module.exports = {
    initLlama,
    loadModel,
    unloadModel,
    chat,
    listLocalModels,
    getStatus,
    getModelsDir,
    getCurrentConfig,
    setModelConfig
};
