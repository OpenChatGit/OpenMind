const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');

// CRITICAL: Only load essential modules synchronously
const { initDatabase, loadChats, saveChats, saveChat, deleteChat } = require('./database');
const auth = require('./auth');

// DEFERRED: Load heavy modules lazily to speed up startup
let modelScanner = null;
let huggingface = null;
let deepSearch = null;
let imageGen = null;
let ollama = null;
let ollamaManager = null;
let localLlama = null;
let openmindModels = null;
let searxng = null;
let training = null;

// Lazy loaders for heavy modules with timing
function getModelScanner() {
    if (!modelScanner) {
        const start = Date.now();
        modelScanner = require('./modelScanner');
        console.log(`[TIMING] modelScanner loaded in ${Date.now() - start}ms`);
    }
    return modelScanner;
}
function getHuggingface() {
    if (!huggingface) {
        const start = Date.now();
        huggingface = require('./huggingface');
        console.log(`[TIMING] huggingface loaded in ${Date.now() - start}ms`);
    }
    return huggingface;
}
function getDeepSearch() {
    if (!deepSearch) {
        const start = Date.now();
        deepSearch = require('./deepSearch');
        console.log(`[TIMING] deepSearch loaded in ${Date.now() - start}ms`);
    }
    return deepSearch;
}
function getImageGen() {
    if (!imageGen) {
        const start = Date.now();
        imageGen = require('./imageGen');
        console.log(`[TIMING] imageGen loaded in ${Date.now() - start}ms`);
    }
    return imageGen;
}
function getOllama() {
    if (!ollama) {
        const start = Date.now();
        ollama = require('./ollama');
        console.log(`[TIMING] ollama loaded in ${Date.now() - start}ms`);
    }
    return ollama;
}
function getOllamaManager() {
    if (!ollamaManager) {
        const start = Date.now();
        ollamaManager = require('./ollamaManager');
        console.log(`[TIMING] ollamaManager loaded in ${Date.now() - start}ms`);
    }
    return ollamaManager;
}
function getLocalLlama() {
    if (!localLlama) {
        const start = Date.now();
        localLlama = require('./localLlama');
        console.log(`[TIMING] localLlama loaded in ${Date.now() - start}ms`);
    }
    return localLlama;
}
function getOpenmindModels() {
    if (!openmindModels) {
        const start = Date.now();
        openmindModels = require('./openmindModels');
        console.log(`[TIMING] openmindModels loaded in ${Date.now() - start}ms`);
    }
    return openmindModels;
}
function getSearxng() {
    if (!searxng) {
        const start = Date.now();
        searxng = require('./searxng');
        console.log(`[TIMING] searxng loaded in ${Date.now() - start}ms`);
    }
    return searxng;
}
function getTraining() {
    if (!training) {
        const start = Date.now();
        training = require('./training');
        console.log(`[TIMING] training loaded in ${Date.now() - start}ms`);
    }
    return training;
}

let mainWindow;
let ollamaHost = '127.0.0.1';
let lastOllamaStatus = 'stopped';

// Store custom model system prompts (model name -> system prompt)
let customModelPrompts = {};

// Load custom model prompts from file
function loadCustomModelPrompts() {
    try {
        const promptsPath = path.join(app.getPath('userData'), 'custom-model-prompts.json');
        if (fs.existsSync(promptsPath)) {
            customModelPrompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
            console.log('Loaded custom model prompts:', Object.keys(customModelPrompts));
        }
    } catch (err) {
        console.error('Error loading custom model prompts:', err);
    }
}

// Save custom model prompts to file
function saveCustomModelPrompts() {
    try {
        const promptsPath = path.join(app.getPath('userData'), 'custom-model-prompts.json');
        fs.writeFileSync(promptsPath, JSON.stringify(customModelPrompts, null, 2));
    } catch (err) {
        console.error('Error saving custom model prompts:', err);
    }
}

// Get system prompt for a model (if it's a custom model)
function getModelSystemPrompt(modelName) {
    // Check exact match first
    if (customModelPrompts[modelName]) {
        return customModelPrompts[modelName];
    }
    // Check without tag (e.g., "my-model" matches "my-model:latest")
    const baseName = modelName.split(':')[0];
    if (customModelPrompts[baseName]) {
        return customModelPrompts[baseName];
    }
    return null;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#151517',
        show: false  // Don't show until ready
    });

    const isDev = !app.isPackaged;

    // Show window when ready to prevent white/gray flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    const ollamaInterval = setInterval(() => {
        checkOllamaStatus(mainWindow);
    }, 3000);

    mainWindow.on('closed', () => {
        clearInterval(ollamaInterval);
        mainWindow = null;
    });
}

// IPC Handlers
ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
});

// Ollama Server Management (with bundled binary support)
ipcMain.handle('get-ollama-server-status', async () => {
    const status = getOllamaManager().getStatus();
    const running = await getOllamaManager().isServerRunning();
    return { ...status, running };
});

ipcMain.handle('start-ollama-server', async () => {
    console.log('Starting bundled Ollama server...');
    return await getOllamaManager().startServer((log) => {
        console.log('[Ollama Server]', log.type, log.message);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ollama-server-log', log);
        }
    });
});

ipcMain.handle('stop-ollama-server', async () => {
    getOllamaManager().stopServer();
    return { success: true };
});

ipcMain.handle('download-ollama', async () => {
    return await getOllamaManager().downloadOllama((progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ollama-download-progress', progress);
        }
    });
});

ipcMain.handle('check-ollama-updates', async () => {
    return await getOllamaManager().checkForUpdates();
});

// Fetch Ollama Models (using ollama-js library)
ipcMain.handle('get-ollama-models', async () => {
    const host = `http://${ollamaHost}:11434`;
    return await getOllama().listModels(host);
});

// Pull Ollama Model
ipcMain.handle('pull-ollama-model', async (event, modelName) => {
    console.log('Pulling Ollama model:', modelName);
    const host = `http://${ollamaHost}:11434`;
    
    return await getOllama().pullModel(modelName, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ollama-pull-progress', { modelName, ...progress });
        }
    }, host);
});

// Delete Ollama Model
ipcMain.handle('delete-ollama-model', async (event, modelName) => {
    console.log('Deleting Ollama model:', modelName);
    const host = `http://${ollamaHost}:11434`;
    return await getOllama().deleteModel(modelName, host);
});

// Get Ollama Model Info
ipcMain.handle('get-ollama-model-info', async (event, modelName) => {
    const host = `http://${ollamaHost}:11434`;
    return await getOllama().showModel(modelName, host);
});

// Execute Ollama CLI Command (for terminal mode)
ipcMain.handle('execute-ollama-command', async (event, command) => {
    console.log('Executing Ollama command:', command);
    return await getOllama().executeCommand(command, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ollama-terminal-progress', progress);
        }
    });
});

// ============ Local LLM (node-llama-cpp) ============

// Get local GGUF models
ipcMain.handle('get-local-models', async () => {
    return getLocalLlama().listLocalModels();
});

// Load a local model
ipcMain.handle('load-local-model', async (event, modelPath) => {
    return await getLocalLlama().loadModel(modelPath, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('local-model-progress', progress);
        }
    });
});

// Unload local model
ipcMain.handle('unload-local-model', async () => {
    await getLocalLlama().unloadModel();
    return { success: true };
});

// Get local LLM status
ipcMain.handle('get-local-llm-status', async () => {
    return getLocalLlama().getStatus();
});

// Chat with local model
ipcMain.handle('send-local-message', async (event, { messages, modelName }) => {
    console.log('Sending to local LLM:', { messageCount: messages.length, modelName });
    
    try {
        // Check if using an OpenMind model config
        let options = {};
        let config = null;
        
        if (modelName) {
            config = getOpenmindModels().getModel(modelName);
            if (config) {
                options = { ...config.params } || {};
                options.systemPrompt = config.systemPrompt;
                
                // Check if model needs to be loaded
                const status = getLocalLlama().getStatus();
                const currentConfig = getLocalLlama().getCurrentConfig();
                
                if (!status.modelLoaded || currentConfig?.name !== modelName) {
                    console.log('Loading OpenMind model:', modelName);
                    
                    // Send progress to frontend
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('ollama-message-update', 'Loading model...');
                    }
                    
                    const loadResult = await getLocalLlama().loadModel(config.baseModel, (progress) => {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('local-model-progress', progress);
                        }
                    }, config);
                    
                    if (!loadResult.success) {
                        throw new Error(`Failed to load model: ${loadResult.error}`);
                    }
                }
            }
        }
        
        const response = await getLocalLlama().chat(
            messages,
            (content) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ollama-message-update', content);
                }
            },
            (thinking) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ollama-thinking-update', thinking);
                }
            },
            options
        );
        return response;
    } catch (error) {
        console.error('Local LLM error:', error);
        throw error;
    }
});

// ============ OpenMind Model Management ============

// List OpenMind custom models
ipcMain.handle('openmind-list-models', async () => {
    return getOpenmindModels().listModels();
});

// Get a specific OpenMind model
ipcMain.handle('openmind-get-model', async (event, name) => {
    return getOpenmindModels().getModel(name);
});

// Create OpenMind model
ipcMain.handle('openmind-create-model', async (event, config) => {
    console.log('Creating OpenMind model:', config.name);
    
    return await getOpenmindModels().createModel(config, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('openmind-create-progress', progress);
        }
    });
});

// Update OpenMind model
ipcMain.handle('openmind-update-model', async (event, { name, updates }) => {
    return getOpenmindModels().updateModel(name, updates);
});

// Delete OpenMind model
ipcMain.handle('openmind-delete-model', async (event, name) => {
    return getOpenmindModels().deleteModel(name);
});

// Scan available GGUF models
ipcMain.handle('openmind-scan-gguf', async () => {
    return getOpenmindModels().scanGGUFModels();
});

// Import GGUF model
ipcMain.handle('openmind-import-model', async (event, sourcePath) => {
    return await getOpenmindModels().importModel(sourcePath, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('openmind-import-progress', progress);
        }
    });
});

// Get model presets
ipcMain.handle('openmind-get-presets', async () => {
    return getOpenmindModels().getModelPresets();
});

// Get chat templates
ipcMain.handle('openmind-get-templates', async () => {
    return getOpenmindModels().getChatTemplates();
});

// Parse GGUF metadata
ipcMain.handle('openmind-parse-gguf', async (event, filePath) => {
    return await getOpenmindModels().parseGGUFMetadata(filePath);
});

// Select GGUF file via dialog
ipcMain.handle('openmind-select-gguf', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'GGUF Models', extensions: ['gguf'] }
        ]
    });
    
    if (result.canceled || result.filePaths.length === 0) {
        return { success: false };
    }
    
    return { success: true, path: result.filePaths[0] };
});

// Load OpenMind model for inference
ipcMain.handle('openmind-load-model', async (event, modelName) => {
    const config = getOpenmindModels().getModel(modelName);
    if (!config) {
        return { success: false, error: `Model "${modelName}" not found` };
    }
    
    return await getLocalLlama().loadModel(config.baseModel, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('local-model-progress', progress);
        }
    }, config);
});

// Send message to Ollama with streaming and reasoning support (using ollama-js library)
ipcMain.handle('send-ollama-message', async (event, { model, messages }) => {
    console.log('Sending to Ollama:', { model, messageCount: messages.length });

    const host = `http://${ollamaHost}:11434`;
    
    // Check if this is a custom model with a saved system prompt
    const customSystemPrompt = getModelSystemPrompt(model);
    let finalMessages = messages;
    
    if (customSystemPrompt) {
        console.log('Using custom system prompt for model:', model);
        // Check if there's already a system message
        const hasSystemMessage = messages.some(m => m.role === 'system');
        if (!hasSystemMessage) {
            // Prepend the custom system prompt
            finalMessages = [
                { role: 'system', content: customSystemPrompt },
                ...messages
            ];
        }
    }
    
    // Callbacks for streaming updates
    const onThinking = (thinking) => {
        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                mainWindow.webContents.send('ollama-thinking-update', thinking);
            }
        } catch (err) {
            console.error('Error sending thinking update:', err.message);
        }
    };
    
    const onContent = (content) => {
        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                mainWindow.webContents.send('ollama-message-update', content);
            }
        } catch (err) {
            console.error('Error sending message update:', err.message);
        }
    };

    try {
        const response = await getOllama().chat({ model, messages: finalMessages, host }, onThinking, onContent);
        console.log('Stream complete');
        return response;
    } catch (error) {
        console.error('Ollama chat error:', error);
        throw error;
    }
});

// DeepSearch message handler with tool use
// Compress messages to reduce token count
function compressMessages(messages, maxMessages = 10) {
    if (messages.length <= maxMessages) return messages;
    
    const compressed = [];
    
    // Always keep first message (often contains context)
    if (messages.length > 0) {
        compressed.push(messages[0]);
    }
    
    // Keep last N messages (most relevant)
    const recentMessages = messages.slice(-maxMessages + 1);
    
    // Summarize middle messages if there are many
    const middleCount = messages.length - maxMessages;
    if (middleCount > 0) {
        compressed.push({
            role: 'system',
            content: `[${middleCount} earlier messages summarized]`
        });
    }
    
    compressed.push(...recentMessages);
    return compressed;
}

// Compress long message content
function compressContent(content, maxLength = 2000) {
    if (!content || content.length <= maxLength) return content;
    
    // For tool results, keep structure but truncate
    if (content.includes('Search results')) {
        const lines = content.split('\n');
        let result = '';
        for (const line of lines) {
            if (result.length + line.length > maxLength) {
                result += '\n[...truncated]';
                break;
            }
            result += line + '\n';
        }
        return result.trim();
    }
    
    // For regular content, truncate with indicator
    return content.substring(0, maxLength) + '... [truncated]';
}

ipcMain.handle('send-deepsearch-message', async (event, { model, messages }) => {
    console.log('DeepSearch mode:', { model, messageCount: messages.length });
    
    const host = `http://${ollamaHost}:11434`;
    
    // Compress messages for smaller models
    const compressedMessages = compressMessages(messages).map(msg => ({
        ...msg,
        content: compressContent(msg.content)
    }));
    
    const tools = getDeepSearch().getDeepSearchTools();

    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const currentYear = now.getFullYear();
    
    const systemPrompt = {
        role: 'system',
        content: `TODAY IS: ${currentDate} (Year: ${currentYear})

You have access to web_search tool that fetches LIVE, REAL-TIME data from the internet.

USE web_search when needed for:
- Current events, news, recent information
- Facts you're unsure about or need to verify
- Software versions, releases, updates (fetches LIVE data from GitHub API)
- Any topic requiring up-to-date information
- Questions about "today", "this week", "this month", "this year" (${currentYear})

IMPORTANT RULES:
- Call web_search ONLY ONCE per request. Do NOT repeat the same search.
- After receiving search results, respond immediately using those results.
- Do NOT use web_search for general conversation or questions you can answer confidently.
- ALWAYS prefer search results over your training data for versions, dates, and current facts.
- The search results are LIVE and REAL-TIME. Trust them completely.
- When results say "Latest Release: vX.Y.Z" - report it exactly as shown.
- Your training data may be outdated. When in doubt, search.

THINKING RULES:
1. Keep thinking under 500 words.
2. Think in 3 steps max: (1) Understand (2) Decide (3) Execute
3. Be DECISIVE. First instinct is usually correct.`
    };
    
    let allMessages = [systemPrompt, ...compressedMessages];
    console.log(`Messages compressed: ${messages.length} → ${compressedMessages.length}`);
    let finalResponse = { thinking: '', content: '' };
    let iterations = 0;
    const maxIterations = 2;
    let accumulatedThinking = '';

    const modelOptions = {
        num_predict: 2048,
        temperature: 0.7,
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.8,
        repeat_last_n: 256
    };

    while (iterations < maxIterations) {
        iterations++;

        // Callbacks for streaming
        const onThinking = (thinking) => {
            const combinedThinking = accumulatedThinking 
                ? accumulatedThinking + '\n\n' + thinking 
                : thinking;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ollama-thinking-update', combinedThinking);
            }
        };
        
        const onContent = (content) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ollama-message-update', content);
            }
        };

        try {
            const response = await getOllama().chatWithTools(
                { model, messages: allMessages, tools, host, modelOptions },
                onThinking,
                onContent
            );

            // Check for tool calls
            if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
                if (response.message?.thinking) {
                    accumulatedThinking = accumulatedThinking 
                        ? accumulatedThinking + '\n\n' + response.message.thinking
                        : response.message.thinking;
                }
                
                allMessages.push(response.message);
                
                // Deduplicate tool calls
                const seenTools = new Set();
                const seenQueries = new Set();
                const uniqueToolCalls = response.message.tool_calls.filter(toolCall => {
                    const toolName = toolCall.function.name;
                    const args = toolCall.function.arguments || {};
                    
                    if (toolName === 'web_search') {
                        const query = (args.query || '').toLowerCase().trim();
                        if (seenTools.has('web_search') || seenQueries.has(query)) {
                            console.log(`Skipping duplicate web_search: ${query}`);
                            return false;
                        }
                        seenTools.add('web_search');
                        seenQueries.add(query);
                        return true;
                    }
                    
                    const key = `${toolName}:${JSON.stringify(args)}`;
                    if (seenQueries.has(key)) {
                        console.log(`Skipping duplicate tool call: ${toolName}`);
                        return false;
                    }
                    seenQueries.add(key);
                    return true;
                });
                
                console.log(`Tool calls: ${response.message.tool_calls.length} -> ${uniqueToolCalls.length} after dedup`);
                
                // Execute tools in parallel
                const toolPromises = uniqueToolCalls.map(async (toolCall) => {
                    const toolName = toolCall.function.name;
                    const toolArgs = toolCall.function.arguments;
                    
                    console.log(`Executing tool: ${toolName}`, toolArgs);
                    
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('deepsearch-tool-use', {
                            tool: toolName, args: toolArgs, status: 'executing'
                        });
                    }
                    
                    const result = await getDeepSearch().executeToolCall(toolName, toolArgs);
                    
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('deepsearch-tool-use', {
                            tool: toolName, args: toolArgs, status: 'complete', result
                        });
                    }
                    
                    let formattedContent = '';
                    if (result.success && result.results && result.results.length > 0) {
                        formattedContent = `Search results for "${toolArgs.query}":\n\n`;
                        result.results.forEach((r, i) => {
                            formattedContent += `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet || ''}\n\n`;
                        });
                    } else {
                        formattedContent = JSON.stringify(result);
                    }
                    
                    return { role: 'tool', content: formattedContent };
                });
                
                const toolResults = await Promise.all(toolPromises);
                allMessages.push(...toolResults);
                console.log('Tool results added to messages, continuing conversation...');
            } else {
                const finalThinking = accumulatedThinking 
                    ? (response.message?.thinking 
                        ? accumulatedThinking + '\n\n' + response.message.thinking
                        : accumulatedThinking)
                    : (response.message?.thinking || '');
                    
                finalResponse = {
                    thinking: finalThinking,
                    content: response.message?.content || 'No response',
                    stats: response.stats || {}
                };
                break;
            }
        } catch (error) {
            console.error('DeepSearch error:', error);
            finalResponse = {
                thinking: accumulatedThinking || '',
                content: `Error during DeepSearch: ${error.message}`
            };
            break;
        }
    }

    if (iterations >= maxIterations) {
        console.log('DeepSearch: Reached maximum tool iterations');
        if (!finalResponse.thinking && accumulatedThinking) {
            finalResponse.thinking = accumulatedThinking;
        }
    }

    return finalResponse;
});

// Chat Persistence IPC Handlers
ipcMain.handle('load-chats', async () => {
    return loadChats();
});

ipcMain.handle('save-chats', async (event, chats) => {
    return saveChats(chats);
});

ipcMain.handle('save-chat', async (event, chat) => {
    return saveChat(chat);
});

ipcMain.handle('delete-chat', async (event, chatId) => {
    return deleteChat(chatId);
});

// Model Scanner IPC Handlers
ipcMain.handle('scan-models-folder', async () => {
    return getModelScanner().scanModelsFolder();
});

ipcMain.handle('scan-diffusion-models', async () => {
    return getModelScanner().scanDiffusionModels();
});

ipcMain.handle('get-model-info', async (event, modelPath) => {
    return getModelScanner().getModelInfo(modelPath);
});

// Hugging Face IPC Handlers
ipcMain.handle('hf-set-token', async (event, token) => {
    return getHuggingface().setApiToken(token);
});

ipcMain.handle('hf-load-token', async () => {
    return getHuggingface().loadApiToken();
});

ipcMain.handle('hf-clear-token', async () => {
    return getHuggingface().clearApiToken();
});

ipcMain.handle('hf-search-models', async (event, query) => {
    return getHuggingface().searchModels(query);
});

ipcMain.handle('hf-get-model-info', async (event, modelId) => {
    return getHuggingface().getModelInfo(modelId);
});

ipcMain.handle('hf-download-model', async (event, modelId) => {
    return new Promise((resolve) => {
        getHuggingface().downloadModel(modelId, (progress) => {
            try {
                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                    mainWindow.webContents.send('hf-download-progress', { modelId, progress });
                }
            } catch (err) {
                console.error('Error sending download progress:', err.message);
            }
        }).then(resolve);
    });
});

ipcMain.handle('hf-download-gguf', async (event, modelId, filename) => {
    return new Promise((resolve, reject) => {
        getHuggingface().downloadGGUF(modelId, filename, (progress) => {
            try {
                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                    mainWindow.webContents.send('hf-gguf-download-progress', { modelId, filename, progress });
                }
            } catch (err) {
                console.error('Error sending GGUF download progress:', err.message);
            }
        }).then(resolve).catch(err => resolve({ success: false, error: err.message }));
    });
});

ipcMain.handle('hf-get-user-info', async () => {
    return getHuggingface().getUserInfo();
});

// Open external links in system browser
ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
    return { success: true };
});

// Reveal file/folder in system file explorer
ipcMain.handle('reveal-in-explorer', async (event, filePath) => {
    try {
        shell.showItemInFolder(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Image Selection for Vision Models
ipcMain.handle('select-images', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, images: [] };
    }

    // Read images and convert to base64
    const images = [];
    for (const filePath of result.filePaths) {
        try {
            const buffer = fs.readFileSync(filePath);
            const base64 = buffer.toString('base64');
            const ext = path.extname(filePath).toLowerCase().slice(1);
            const mimeType = ext === 'jpg' ? 'jpeg' : ext;
            images.push({
                path: filePath,
                name: path.basename(filePath),
                base64: base64,
                mimeType: `image/${mimeType}`,
                dataUrl: `data:image/${mimeType};base64,${base64}`
            });
        } catch (error) {
            console.error('Error reading image:', filePath, error);
        }
    }

    return { success: true, images };
});

// Local Image Generation via Diffusers
ipcMain.handle('generate-image', async (event, { prompt, negativePrompt, width, height, steps, guidance, model, localPath }) => {
    const displayName = localPath ? path.basename(localPath) : (model || 'sdxl-turbo');
    console.log('Generating image locally:', { prompt, model: displayName, localPath: !!localPath, width, height });

    try {
        // Send progress updates to renderer
        const onProgress = (message, progress) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('image-gen-progress', { message, progress });
            }
        };

        // Load model if specified and different from current
        const status = getImageGen().getStatus();
        const targetModel = localPath || model || 'stabilityai/sdxl-turbo';
        
        if (!status.running || status.currentModel !== targetModel) {
            onProgress(`Loading model: ${displayName}...`, 0);
            await getImageGen().loadModel(model || 'local-model', localPath, onProgress);
        }

        // Generate image
        const result = await getImageGen().generateImage({
            prompt,
            negativePrompt: negativePrompt || '',
            width: width || 512,
            height: height || 512,
            steps: steps || 4, // SDXL-Turbo needs only 4 steps
            guidance: guidance || 0.0 // SDXL-Turbo works best with 0 guidance
        }, onProgress);

        return {
            success: result.success,
            image: result.image
        };
    } catch (error) {
        console.error('Image generation error:', error);
        return { success: false, error: error.message };
    }
});

// Load image generation model (supports local path)
ipcMain.handle('load-image-model', async (event, { modelId, localPath }) => {
    try {
        const onProgress = (message) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('image-gen-progress', { message });
            }
        };
        await getImageGen().loadModel(modelId, localPath, onProgress);
        return { success: true, model: modelId, localPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Unload image model to free memory
ipcMain.handle('unload-image-model', async () => {
    try {
        await getImageGen().unloadModel();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Check image generation status
ipcMain.handle('check-image-gen-status', async () => {
    return getImageGen().getStatus();
});

// Check Python setup for image generation
ipcMain.handle('check-python-setup', async () => {
    return getImageGen().checkPythonSetup();
});

// Docker status check
ipcMain.handle('check-docker-status', async () => {
    return new Promise((resolve) => {
        exec('docker info', { timeout: 5000 }, (error, stdout) => {
            if (error) {
                resolve({ running: false, error: error.message });
            } else {
                // Parse Docker version from output
                const versionMatch = stdout.match(/Server Version:\s*(\S+)/);
                const version = versionMatch ? versionMatch[1] : 'unknown';
                resolve({ running: true, version });
            }
        });
    });
});

// Get running Docker containers with port mappings and OpenMind labels
ipcMain.handle('get-docker-containers', async () => {
    return new Promise((resolve) => {
        // Include labels in the format string
        exec('docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}|{{.State}}|{{.Labels}}"', { timeout: 10000 }, (error, stdout) => {
            if (error) {
                resolve({ success: false, error: error.message, containers: [] });
            } else {
                const lines = stdout.trim().split('\n').filter(line => line.trim());
                const containers = lines.map(line => {
                    const parts = line.split('|');
                    const [id, name, image, status, ports, state] = parts;
                    const labels = parts[6] || '';
                    // Parse ports like "0.0.0.0:8080->80/tcp, 0.0.0.0:443->443/tcp"
                    const portMappings = ports ? ports.split(',').map(p => p.trim()).filter(p => p) : [];
                    // Check if this is an OpenMind plugin (by label or namespace)
                    const isOpenMindPlugin = labels.includes('com.openmind.plugin=true') || 
                                            image.startsWith('teamaiko/openmindlabs-');
                    return { 
                        id, 
                        name, 
                        image, 
                        status, 
                        ports: portMappings, 
                        state: state || 'unknown',
                        isOpenMindPlugin
                    };
                });
                resolve({ success: true, containers });
            }
        });
    });
});

// Start a Docker container
ipcMain.handle('docker-start-container', async (event, containerId) => {
    return new Promise((resolve) => {
        exec(`docker start ${containerId}`, { timeout: 30000 }, (error) => {
            if (error) {
                resolve({ success: false, error: error.message });
            } else {
                resolve({ success: true });
            }
        });
    });
});

// Stop a Docker container
ipcMain.handle('docker-stop-container', async (event, containerId) => {
    return new Promise((resolve) => {
        exec(`docker stop ${containerId}`, { timeout: 30000 }, (error) => {
            if (error) {
                resolve({ success: false, error: error.message });
            } else {
                resolve({ success: true });
            }
        });
    });
});

// Restart a Docker container
ipcMain.handle('docker-restart-container', async (event, containerId) => {
    return new Promise((resolve) => {
        exec(`docker restart ${containerId}`, { timeout: 30000 }, (error) => {
            if (error) {
                resolve({ success: false, error: error.message });
            } else {
                resolve({ success: true });
            }
        });
    });
});

// Remove a Docker container
ipcMain.handle('docker-remove-container', async (event, containerId) => {
    return new Promise((resolve) => {
        exec(`docker rm -f ${containerId}`, { timeout: 30000 }, (error) => {
            if (error) {
                resolve({ success: false, error: error.message });
            } else {
                resolve({ success: true });
            }
        });
    });
});

// Pull and run a Docker container (dynamic plugin support)
ipcMain.handle('docker-pull-and-run', async (event, { image, name, ports, env, volumes, restart }) => {
    return new Promise((resolve) => {
        // First pull the image
        console.log(`Pulling Docker image: ${image}`);
        exec(`docker pull ${image}`, { timeout: 300000 }, (pullError) => {
            if (pullError) {
                resolve({ success: false, error: `Failed to pull image: ${pullError.message}` });
                return;
            }
            
            // Build docker run arguments dynamically
            let args = [];
            
            // Port mappings
            if (ports) {
                for (const [hostPort, containerPort] of Object.entries(ports)) {
                    args.push(`-p ${hostPort}:${containerPort}`);
                }
            }
            
            // Environment variables
            if (env) {
                for (const [key, value] of Object.entries(env)) {
                    args.push(`-e ${key}="${value}"`);
                }
            }
            
            // Volume mounts (named volumes for persistence)
            if (volumes) {
                for (const [volumeName, containerPath] of Object.entries(volumes)) {
                    // Use named volumes for better management
                    args.push(`-v openmind-${volumeName}:${containerPath}`);
                }
            }
            
            // Restart policy (default: unless-stopped for plugins)
            const restartPolicy = restart || 'unless-stopped';
            args.push(`--restart ${restartPolicy}`);
            
            // Add OpenMind plugin label for identification
            args.push('--label com.openmind.plugin=true');
            
            // Run the container
            const runCmd = `docker run -d --name ${name} ${args.join(' ')} ${image}`;
            console.log(`Running container: ${runCmd}`);
            
            exec(runCmd, { timeout: 60000 }, (runError) => {
                if (runError) {
                    resolve({ success: false, error: `Failed to run container: ${runError.message}` });
                } else {
                    resolve({ success: true });
                }
            });
        });
    });
});

// Start a service using docker-compose
ipcMain.handle('docker-compose-up', async (event, serviceName) => {
    return new Promise((resolve) => {
        const appPath = app.isPackaged 
            ? path.dirname(app.getPath('exe'))
            : path.join(__dirname, '..');
        
        // Run docker-compose up for the specific service
        const composeCmd = `docker-compose -f "${path.join(appPath, 'docker-compose.yml')}" up -d ${serviceName}`;
        
        exec(composeCmd, { timeout: 300000, cwd: appPath }, (error, stdout, stderr) => {
            if (error) {
                console.error('Docker compose error:', error.message);
                resolve({ success: false, error: error.message });
            } else {
                console.log('Docker compose output:', stdout);
                resolve({ success: true });
            }
        });
    });
});

// Stop a service using docker-compose
ipcMain.handle('docker-compose-down', async (event, serviceName) => {
    return new Promise((resolve) => {
        const appPath = app.isPackaged 
            ? path.dirname(app.getPath('exe'))
            : path.join(__dirname, '..');
        
        const composeCmd = serviceName 
            ? `docker-compose -f "${path.join(appPath, 'docker-compose.yml')}" stop ${serviceName}`
            : `docker-compose -f "${path.join(appPath, 'docker-compose.yml')}" down`;
        
        exec(composeCmd, { timeout: 60000, cwd: appPath }, (error) => {
            if (error) {
                resolve({ success: false, error: error.message });
            } else {
                resolve({ success: true });
            }
        });
    });
});

// Load plugin registry from plugins/registry.json
ipcMain.handle('load-plugin-registry', async () => {
    try {
        const appPath = app.isPackaged 
            ? path.dirname(app.getPath('exe'))
            : path.join(__dirname, '..');
        
        const registryPath = path.join(appPath, 'plugins', 'registry.json');
        
        if (!fs.existsSync(registryPath)) {
            console.log('Plugin registry not found at:', registryPath);
            return { success: true, plugins: [], categories: [] };
        }
        
        const registryData = fs.readFileSync(registryPath, 'utf8');
        const registry = JSON.parse(registryData);
        
        console.log(`Loaded ${registry.plugins?.length || 0} plugins from registry`);
        
        return {
            success: true,
            plugins: registry.plugins || [],
            categories: registry.categories || [],
            version: registry.version
        };
    } catch (error) {
        console.error('Error loading plugin registry:', error);
        return { success: false, error: error.message, plugins: [], categories: [] };
    }
});

// Load online plugin registry (from GitHub or fallback to local)
ipcMain.handle('load-online-plugin-registry', async () => {
    const https = require('https');
    
    // Use GitHub API instead of raw.githubusercontent.com to avoid CDN caching
    // The API returns fresh data every time
    const apiUrl = 'https://api.github.com/repos/OpenChatGit/OpenMindLabs-Plugins/contents/registry.json';
    
    return new Promise((resolve) => {
        const request = https.get(apiUrl, { 
            timeout: 8000,
            headers: {
                'User-Agent': 'OpenMind-App',
                'Accept': 'application/vnd.github.v3.raw', // Get raw content directly
                'Cache-Control': 'no-cache'
            }
        }, (res) => {
            if (res.statusCode !== 200) {
                console.log(`GitHub API returned ${res.statusCode}, trying raw URL...`);
                // Fallback to raw URL with random param
                fetchFromRaw(resolve);
                return;
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const registry = JSON.parse(data);
                    console.log(`Loaded ${registry.plugins?.length || 0} plugins from GitHub API`);
                    resolve({
                        success: true,
                        plugins: registry.plugins || [],
                        categories: registry.categories || [],
                        iconsBaseUrl: registry.iconsBaseUrl || '',
                        version: registry.version,
                        source: 'github-api'
                    });
                } catch (err) {
                    console.error('Failed to parse GitHub API response:', err);
                    fetchFromRaw(resolve);
                }
            });
        });
        
        request.on('error', (err) => {
            console.log('GitHub API error, trying raw URL:', err.message);
            fetchFromRaw(resolve);
        });
        
        request.on('timeout', () => {
            request.destroy();
            console.log('GitHub API timeout, trying raw URL');
            fetchFromRaw(resolve);
        });
    });
    
    // Fallback to raw.githubusercontent.com with cache-busting
    function fetchFromRaw(resolve) {
        const https = require('https');
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const rawUrl = `https://raw.githubusercontent.com/OpenChatGit/OpenMindLabs-Plugins/main/registry.json?nocache=${timestamp}-${randomStr}`;
        
        const request = https.get(rawUrl, { timeout: 5000 }, (res) => {
            if (res.statusCode !== 200) {
                console.log('Raw URL failed, using local registry');
                loadLocalRegistry(resolve);
                return;
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const registry = JSON.parse(data);
                    console.log(`Loaded ${registry.plugins?.length || 0} plugins from raw URL`);
                    resolve({
                        success: true,
                        plugins: registry.plugins || [],
                        categories: registry.categories || [],
                        iconsBaseUrl: registry.iconsBaseUrl || '',
                        version: registry.version,
                        source: 'raw-github'
                    });
                } catch (err) {
                    console.error('Failed to parse raw registry:', err);
                    loadLocalRegistry(resolve);
                }
            });
        });
        
        request.on('error', () => loadLocalRegistry(resolve));
        request.on('timeout', () => { request.destroy(); loadLocalRegistry(resolve); });
    }
    
    function loadLocalRegistry(resolve) {
        try {
            const appPath = app.isPackaged 
                ? path.dirname(app.getPath('exe'))
                : path.join(__dirname, '..');
            
            const registryPath = path.join(appPath, 'plugins', 'registry.json');
            
            if (!fs.existsSync(registryPath)) {
                resolve({ success: true, plugins: [], categories: [], source: 'none' });
                return;
            }
            
            const registryData = fs.readFileSync(registryPath, 'utf8');
            const registry = JSON.parse(registryData);
            
            resolve({
                success: true,
                plugins: registry.plugins || [],
                categories: registry.categories || [],
                version: registry.version,
                source: 'local'
            });
        } catch (error) {
            console.error('Error loading local registry:', error);
            resolve({ success: false, error: error.message, plugins: [], categories: [] });
        }
    }
});

// Model Creator - Create custom Ollama models
ipcMain.handle('create-ollama-model', async (event, { name, baseModel, systemPrompt, params }) => {
    console.log('Creating Ollama model:', { name, baseModel });
    console.log('System prompt received:', systemPrompt?.substring(0, 100) + '...');
    console.log('Params received:', params);
    
    const sendProgress = (type, message) => {
        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                mainWindow.webContents.send('model-create-progress', { type, message });
            }
        } catch (err) {
            console.error('Error sending progress:', err.message);
        }
    };
    
    try {
        sendProgress('info', `Erstelle Modelfile für "${name}"...`);
        
        // Build Modelfile content
        let modelfile = `# Custom model: ${name}\n`;
        modelfile += `# Created with OpenChat Model Creator\n\n`;
        modelfile += `FROM ${baseModel}\n\n`;
        
        // Add parameters
        if (params.temperature !== undefined) {
            modelfile += `PARAMETER temperature ${params.temperature}\n`;
        }
        if (params.top_p !== undefined) {
            modelfile += `PARAMETER top_p ${params.top_p}\n`;
        }
        if (params.top_k !== undefined) {
            modelfile += `PARAMETER top_k ${params.top_k}\n`;
        }
        if (params.repeat_penalty !== undefined) {
            modelfile += `PARAMETER repeat_penalty ${params.repeat_penalty}\n`;
        }
        if (params.num_ctx !== undefined) {
            modelfile += `PARAMETER num_ctx ${params.num_ctx}\n`;
        }
        
        modelfile += '\n';
        
        // Add system prompt
        if (systemPrompt && systemPrompt.trim()) {
            // SYSTEM instruction sets the default system message
            // Note: The system prompt is baked into the model and used automatically
            modelfile += `SYSTEM """${systemPrompt.trim()}"""\n`;
        }
        
        console.log('=== Generated Modelfile ===');
        console.log(modelfile);
        console.log('=== End Modelfile ===');
        sendProgress('info', `System prompt length: ${systemPrompt?.length || 0} chars`);
        sendProgress('info', 'Modelfile generiert, starte ollama create...');
        
        // Write temporary Modelfile
        const fs = require('fs');
        const os = require('os');
        const tempDir = os.tmpdir();
        const modelfilePath = path.join(tempDir, `Modelfile_${name}_${Date.now()}`);
        
        fs.writeFileSync(modelfilePath, modelfile, 'utf8');
        sendProgress('info', `Temporäre Modelfile erstellt: ${modelfilePath}`);
        
        // Run ollama create
        const { spawn } = require('child_process');
        
        return new Promise((resolve) => {
            const ollamaProcess = spawn('ollama', ['create', name, '-f', modelfilePath], {
                encoding: 'utf8'
            });
            
            let stdout = '';
            let stderr = '';
            
            ollamaProcess.stdout.on('data', (data) => {
                const text = data.toString();
                stdout += text;
                console.log('ollama create stdout:', text);
                
                // Parse progress from ollama output
                const lines = text.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    if (line.includes('transferring')) {
                        sendProgress('info', 'Übertrage Model-Daten...');
                    } else if (line.includes('creating')) {
                        sendProgress('info', 'Erstelle Model-Layer...');
                    } else if (line.includes('writing')) {
                        sendProgress('info', 'Schreibe Model...');
                    } else if (line.includes('success')) {
                        sendProgress('success', 'Model erfolgreich erstellt!');
                    } else if (line.trim()) {
                        sendProgress('info', line.trim());
                    }
                }
            });
            
            ollamaProcess.stderr.on('data', (data) => {
                const text = data.toString();
                stderr += text;
                console.error('ollama create stderr:', text);
                sendProgress('error', text);
            });
            
            ollamaProcess.on('close', (code) => {
                // Cleanup temp file
                try {
                    fs.unlinkSync(modelfilePath);
                } catch (e) {
                    // Ignore cleanup errors
                }
                
                if (code === 0) {
                    console.log('Model created successfully');
                    // Save the system prompt for this custom model
                    if (systemPrompt && systemPrompt.trim()) {
                        customModelPrompts[name] = systemPrompt.trim();
                        saveCustomModelPrompts();
                        console.log('Saved system prompt for model:', name);
                    }
                    resolve({ success: true, name });
                } else {
                    console.error('Model creation failed with code:', code);
                    resolve({ 
                        success: false, 
                        error: stderr || `ollama create failed with code ${code}` 
                    });
                }
            });
            
            ollamaProcess.on('error', (err) => {
                console.error('Failed to start ollama:', err);
                resolve({ 
                    success: false, 
                    error: `Failed to start ollama: ${err.message}` 
                });
            });
        });
        
    } catch (error) {
        console.error('Model creation error:', error);
        sendProgress('error', error.message);
        return { success: false, error: error.message };
    }
});

// Disable GPU acceleration to prevent network service crashes
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
    console.log('=== Electron App Starting ===');
    const startTime = Date.now();
    
    // CRITICAL PATH - Initialize only what's needed for window display
    auth.initPaths();
    console.log('✓ Secure auth storage initialized');
    
    initDatabase();
    console.log('✓ Database initialized');
    
    // Create window FIRST for faster perceived startup
    console.log('Creating window...');
    createWindow();
    console.log(`✓ Window created in ${Date.now() - startTime}ms`);
    
    // DEFERRED INITIALIZATION - Run after window is visible (use setTimeout to not block)
    setTimeout(async () => {
        console.log('Starting deferred initialization...');
        
        // Load custom model system prompts (fast, local file)
        loadCustomModelPrompts();
        
        // Check Ollama status (non-blocking) - only load module when needed
        setTimeout(() => {
            getOllamaManager().isServerRunning().then(ollamaRunning => {
                if (ollamaRunning) {
                    console.log('✓ Ollama server detected');
                } else {
                    console.log('ℹ Ollama not running');
                    if (getOllamaManager().hasBundledOllama()) {
                        console.log('✓ Bundled Ollama available');
                    }
                }
            });
        }, 100);
        
        // Setup SearXNG handlers (fast) - only load module when needed
        setTimeout(() => {
            getSearxng().setupSearXNGHandlers();
            getSearxng().checkSearXNGStatus().then(running => {
                if (running) console.log('✓ SearXNG detected');
            });
        }, 200);
        
        // Initialize DeepSearch browser LAZILY - only when first needed
        console.log('ℹ DeepSearch browser will init on first use');
        
        // Local LLM init deferred to first use
        console.log('ℹ Local LLM will init on first use');
        
        // Python check in background (don't block) - only load module when needed
        setTimeout(() => {
            getImageGen().checkPythonSetup().then(pythonStatus => {
                if (pythonStatus.available) {
                    console.log('✓ Python available for image generation');
                }
            });
        }, 300);
        
        console.log(`✓ Deferred init complete. Total startup: ${Date.now() - startTime}ms`);
    }, 50); // Small delay to let window render first

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

function checkOllamaStatus(win) {
    if (!win || win.isDestroyed()) return;
    
    const hosts = ['127.0.0.1', 'localhost'];
    let found = false;
    let checked = 0;

    const checkHost = (host) => {
        const req = http.get(`http://${host}:11434`, { timeout: 2000 }, (res) => {
            if (!found) {
                found = true;
                ollamaHost = host;
                const wasDisconnected = lastOllamaStatus === 'stopped';
                lastOllamaStatus = 'running';
                try {
                    if (win && !win.isDestroyed() && win.webContents) {
                        win.webContents.send('ollama-status', 'running');
                        // Notify to reload models when Ollama comes online
                        if (wasDisconnected) {
                            win.webContents.send('ollama-connected');
                        }
                    }
                } catch (err) {
                    console.error('Error sending ollama status:', err.message);
                }
            }
        });

        req.on('error', () => {
            checked++;
            if (checked >= hosts.length && !found) {
                lastOllamaStatus = 'stopped';
                try {
                    if (win && !win.isDestroyed() && win.webContents) {
                        win.webContents.send('ollama-status', 'stopped');
                    }
                } catch (err) {
                    console.error('Error sending ollama status:', err.message);
                }
            }
        });

        req.on('timeout', () => {
            req.destroy();
            checked++;
            if (checked >= hosts.length && !found) {
                lastOllamaStatus = 'stopped';
                try {
                    if (win && !win.isDestroyed() && win.webContents) {
                        win.webContents.send('ollama-status', 'stopped');
                    }
                } catch (err) {
                    console.error('Error sending ollama status:', err.message);
                }
            }
        });

        req.end();
    };

    hosts.forEach(checkHost);
}

// HuggingFace Inference API handlers
ipcMain.handle('hf-get-inference-models', async () => {
    return { success: true, models: getHuggingface().getInferenceModels() };
});

ipcMain.handle('hf-search-inference-models', async (event, query) => {
    return await getHuggingface().searchInferenceModels(query, 5);
});

ipcMain.handle('send-hf-message', async (event, { model, messages }) => {
    console.log('Sending to HuggingFace Inference:', { model, messageCount: messages.length });
    
    try {
        // Load API key from settings if not already set
        const settingsFile = path.join(app.getPath('userData'), 'settings.json');
        if (fs.existsSync(settingsFile)) {
            const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
            if (settings.hfApiKey) {
                getHuggingface().setApiToken(settings.hfApiKey);
            }
        }
        
        const response = await getHuggingface().sendInferenceMessage(model, messages, 
            // onChunk - stream content updates
            (content) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ollama-message-update', content);
                }
            },
            // onThinking - stream reasoning/thinking updates
            (thinking) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ollama-thinking-update', thinking);
                }
            }
        );
        
        return response;
    } catch (error) {
        console.error('HF Inference error:', error);
        throw error;
    }
});

// Settings file path
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Load settings
ipcMain.handle('load-settings', async () => {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            return { success: true, settings: JSON.parse(data) };
        }
        return { success: true, settings: {} };
    } catch (error) {
        console.error('Error loading settings:', error);
        return { success: false, error: error.message };
    }
});

// Save settings
ipcMain.handle('save-settings', async (event, settings) => {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        console.log('Settings saved:', settings);
        return { success: true };
    } catch (error) {
        console.error('Error saving settings:', error);
        return { success: false, error: error.message };
    }
});
// ============ Whisper ASR IPC Handler ============

ipcMain.handle('whisper-transcribe', async (event, { audioData, mimeType, endpoint }) => {
    try {
        const FormData = require('form-data');
        const fetch = require('node-fetch');
        
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        // Create form data
        const form = new FormData();
        const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
        form.append('audio_file', audioBuffer, {
            filename: `recording.${ext}`,
            contentType: mimeType
        });
        
        const url = `${endpoint}/asr?output=json`;
        console.log('[Whisper] Sending request to:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('[Whisper] Transcription result:', result);
            return { success: true, text: result.text || result.transcription || result.transcript || '' };
        } else {
            const errorText = await response.text();
            console.error('[Whisper] API error:', response.status, errorText);
            return { success: false, error: `API error: ${response.status}` };
        }
    } catch (error) {
        console.error('[Whisper] Error:', error);
        return { success: false, error: error.message };
    }
});

// ============ Auth IPC Handlers ============

ipcMain.handle('auth-register', async (event, { email, password, name }) => {
    return auth.register(email, password, name);
});

ipcMain.handle('auth-login', async (event, { email, password }) => {
    return auth.login(email, password);
});

ipcMain.handle('auth-logout', async () => {
    return auth.logout();
});

ipcMain.handle('auth-get-current-user', async () => {
    return auth.getCurrentUser();
});

ipcMain.handle('auth-update-profile', async (event, updates) => {
    return auth.updateProfile(updates);
});

ipcMain.handle('auth-connect-huggingface', async (event, { token, username }) => {
    return auth.connectHuggingFace(token, username);
});

ipcMain.handle('auth-disconnect-huggingface', async () => {
    return auth.disconnectHuggingFace();
});

ipcMain.handle('auth-change-password', async (event, { currentPassword, newPassword }) => {
    return auth.changePassword(currentPassword, newPassword);
});

// Secure token storage
ipcMain.handle('auth-store-token', async (event, { key, value }) => {
    return auth.storeToken(key, value);
});

ipcMain.handle('auth-get-token', async (event, key) => {
    return { success: true, value: auth.getToken(key) };
});

ipcMain.handle('auth-delete-token', async (event, key) => {
    return auth.deleteToken(key);
});

// ============ Training IPC Handlers ============

ipcMain.handle('training-check-org-membership', async (event, hfToken) => {
    return getTraining().checkOrgMembership(hfToken);
});

ipcMain.handle('training-get-base-models', async () => {
    return getTraining().getBaseModels();
});

ipcMain.handle('training-get-presets', async () => {
    return getTraining().getTrainingPresets();
});

ipcMain.handle('training-validate-data', async (event, { data, format }) => {
    return getTraining().validateTrainingData(data, format);
});

ipcMain.handle('training-get-subscription-tiers', async () => {
    return getTraining().getSubscriptionTiers();
});

ipcMain.handle('training-start', async (event, { config, hfToken }) => {
    return getTraining().startTraining(config, hfToken);
});

ipcMain.handle('training-check-status', async (event, { jobId, hfToken }) => {
    return getTraining().checkTrainingStatus(jobId, hfToken);
});

app.on('window-all-closed', async () => {
    // Kill PTY terminal (only if loaded)
    // Close DeepSearch browser (only if loaded)
    if (deepSearch) await getDeepSearch().closeBrowser();
    
    // Stop image generation process (only if loaded)
    if (imageGen) getImageGen().stopProcess();
    
    // Stop Ollama server if we started it (only if loaded)
    if (ollamaManager) getOllamaManager().stopServer();
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


