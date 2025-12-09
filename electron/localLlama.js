/**
 * Local LLM Inference using node-llama-cpp
 * 
 * This module provides local inference without needing Ollama installed.
 * Supports GGUF models directly.
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let llama = null;
let model = null;
let context = null;
let currentModelPath = null;

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

// Load a GGUF model
async function loadModel(modelPath, onProgress) {
    if (currentModelPath === modelPath && model) {
        console.log('Model already loaded:', modelPath);
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
        model = await llamaInstance.loadModel({
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
        });
        
        // Create context
        context = await model.createContext();
        currentModelPath = modelPath;
        
        console.log('Model loaded successfully');
        if (onProgress) onProgress({ status: 'ready', message: 'Model ready' });
        
        return { success: true, modelPath };
    } catch (error) {
        console.error('Failed to load model:', error);
        if (onProgress) onProgress({ status: 'error', message: error.message });
        return { success: false, error: error.message };
    }
}


// Unload current model
async function unloadModel() {
    if (context) {
        await context.dispose();
        context = null;
    }
    if (model) {
        await model.dispose();
        model = null;
    }
    currentModelPath = null;
    console.log('Model unloaded');
}

// Chat with the model (streaming)
async function chat(messages, onToken, onThinking) {
    if (!model || !context) {
        throw new Error('No model loaded. Call loadModel first.');
    }
    
    try {
        const { LlamaChatSession } = await import('node-llama-cpp');
        
        const session = new LlamaChatSession({
            contextSequence: context.getSequence()
        });
        
        // Build prompt from messages
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (!lastUserMessage) {
            throw new Error('No user message found');
        }
        
        // Set system prompt if present
        const systemMessage = messages.find(m => m.role === 'system');
        if (systemMessage) {
            session.systemPrompt = systemMessage.content;
        }
        
        let fullResponse = '';
        let thinkingContent = '';
        let inThinkTag = false;
        
        // Stream the response
        const response = await session.prompt(lastUserMessage.content, {
            onTextChunk: (text) => {
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
            }
        });
        
        return {
            content: fullResponse || response,
            thinking: thinkingContent
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
        modelsDir: getModelsDir()
    };
}

module.exports = {
    initLlama,
    loadModel,
    unloadModel,
    chat,
    listLocalModels,
    getStatus,
    getModelsDir
};
