const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { initDatabase, loadChats, saveChats, saveChat, deleteChat } = require('./database');
const { scanModelsFolder, scanDiffusionModels, getModelInfo } = require('./modelScanner');
const { setApiToken, loadApiToken, clearApiToken, searchModels, downloadModel, getUserInfo, sendInferenceMessage, getInferenceModels, searchInferenceModels } = require('./huggingface');
const { initBrowser, closeBrowser, getDeepSearchTools, executeToolCall } = require('./deepSearch');
const imageGen = require('./imageGen');
const ollama = require('./ollama');
const ollamaManager = require('./ollamaManager');
const localLlama = require('./localLlama');
const ptyTerminal = require('./ptyTerminal');

let mainWindow;
let ollamaHost = '127.0.0.1';
let lastOllamaStatus = 'stopped';

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
        backgroundColor: '#0a0a0a'
    });

    const isDev = !app.isPackaged;

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
    const status = ollamaManager.getStatus();
    const running = await ollamaManager.isServerRunning();
    return { ...status, running };
});

ipcMain.handle('start-ollama-server', async () => {
    return await ollamaManager.startServer((log) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ollama-server-log', log);
        }
    });
});

ipcMain.handle('stop-ollama-server', async () => {
    ollamaManager.stopServer();
    return { success: true };
});

ipcMain.handle('download-ollama', async () => {
    return await ollamaManager.downloadOllama((progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ollama-download-progress', progress);
        }
    });
});

ipcMain.handle('check-ollama-updates', async () => {
    return await ollamaManager.checkForUpdates();
});

// Fetch Ollama Models (using ollama-js library)
ipcMain.handle('get-ollama-models', async () => {
    const host = `http://${ollamaHost}:11434`;
    return await ollama.listModels(host);
});

// Pull Ollama Model
ipcMain.handle('pull-ollama-model', async (event, modelName) => {
    console.log('Pulling Ollama model:', modelName);
    const host = `http://${ollamaHost}:11434`;
    
    return await ollama.pullModel(modelName, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ollama-pull-progress', { modelName, ...progress });
        }
    }, host);
});

// Delete Ollama Model
ipcMain.handle('delete-ollama-model', async (event, modelName) => {
    console.log('Deleting Ollama model:', modelName);
    const host = `http://${ollamaHost}:11434`;
    return await ollama.deleteModel(modelName, host);
});

// Get Ollama Model Info
ipcMain.handle('get-ollama-model-info', async (event, modelName) => {
    const host = `http://${ollamaHost}:11434`;
    return await ollama.showModel(modelName, host);
});

// Execute Ollama CLI Command (for terminal mode)
ipcMain.handle('execute-ollama-command', async (event, command) => {
    console.log('Executing Ollama command:', command);
    return await ollama.executeCommand(command, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ollama-terminal-progress', progress);
        }
    });
});

// ============ Local LLM (node-llama-cpp) ============

// Get local GGUF models
ipcMain.handle('get-local-models', async () => {
    return localLlama.listLocalModels();
});

// Load a local model
ipcMain.handle('load-local-model', async (event, modelPath) => {
    return await localLlama.loadModel(modelPath, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('local-model-progress', progress);
        }
    });
});

// Unload local model
ipcMain.handle('unload-local-model', async () => {
    await localLlama.unloadModel();
    return { success: true };
});

// Get local LLM status
ipcMain.handle('get-local-llm-status', async () => {
    return localLlama.getStatus();
});

// Chat with local model
ipcMain.handle('send-local-message', async (event, { messages }) => {
    console.log('Sending to local LLM:', { messageCount: messages.length });
    
    try {
        const response = await localLlama.chat(
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
            }
        );
        return response;
    } catch (error) {
        console.error('Local LLM error:', error);
        throw error;
    }
});

// Send message to Ollama with streaming and reasoning support (using ollama-js library)
ipcMain.handle('send-ollama-message', async (event, { model, messages }) => {
    console.log('Sending to Ollama:', { model, messageCount: messages.length });

    const host = `http://${ollamaHost}:11434`;
    
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
        const response = await ollama.chat({ model, messages, host }, onThinking, onContent);
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
    
    const tools = getDeepSearchTools();

    const systemPrompt = {
        role: 'system',
        content: `You have tools: web_search, system_search, list_directory, read_file.

USE tools when needed:
- web_search: Current events, news, facts you're unsure about
- list_directory: Show what's in a folder (Desktop, Documents, etc.)
- system_search: Find files by name
- read_file: Read file contents

IMPORTANT RULES:
- Call each tool ONLY ONCE per request. Do NOT repeat the same tool call.
- After receiving tool results, respond to the user immediately using those results.
- Do NOT use tools for general conversation, greetings, or questions you can answer.
- When you use a tool, you MUST use the results in your response.

CRITICAL - THINKING/REASONING RULES:
You MUST follow these rules for your internal thinking:
1. Your thinking MUST be under 500 words. This is a HARD LIMIT.
2. Think in 3 steps maximum: (1) Understand the question (2) Decide action (3) Execute
3. FORBIDDEN phrases in thinking: "But wait", "Actually", "Let me reconsider", "Hmm", "On second thought", "Wait", "However, I should"
4. Once you decide something, DO IT. No going back. No reconsidering.
5. If you catch yourself about to write "But wait" - STOP and give your answer instead.
6. Be DECISIVE. First instinct is usually correct. Trust it.
7. Your thinking is for YOU, not the user. Keep it minimal and efficient.`
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
            const response = await ollama.chatWithTools(
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
                    
                    const result = await executeToolCall(toolName, toolArgs);
                    
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
                    content: response.message?.content || 'No response'
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
    return scanModelsFolder();
});

ipcMain.handle('scan-diffusion-models', async () => {
    return scanDiffusionModels();
});

ipcMain.handle('get-model-info', async (event, modelPath) => {
    return getModelInfo(modelPath);
});

// Hugging Face IPC Handlers
ipcMain.handle('hf-set-token', async (event, token) => {
    return setApiToken(token);
});

ipcMain.handle('hf-load-token', async () => {
    return loadApiToken();
});

ipcMain.handle('hf-clear-token', async () => {
    return clearApiToken();
});

ipcMain.handle('hf-search-models', async (event, query) => {
    return searchModels(query);
});

ipcMain.handle('hf-download-model', async (event, modelId) => {
    return new Promise((resolve) => {
        downloadModel(modelId, (progress) => {
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

ipcMain.handle('hf-get-user-info', async () => {
    return getUserInfo();
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
        const status = imageGen.getStatus();
        const targetModel = localPath || model || 'stabilityai/sdxl-turbo';
        
        if (!status.running || status.currentModel !== targetModel) {
            onProgress(`Loading model: ${displayName}...`, 0);
            await imageGen.loadModel(model || 'local-model', localPath, onProgress);
        }

        // Generate image
        const result = await imageGen.generateImage({
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
        await imageGen.loadModel(modelId, localPath, onProgress);
        return { success: true, model: modelId, localPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Unload image model to free memory
ipcMain.handle('unload-image-model', async () => {
    try {
        await imageGen.unloadModel();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Check image generation status
ipcMain.handle('check-image-gen-status', async () => {
    return imageGen.getStatus();
});

// Check Python setup for image generation
ipcMain.handle('check-python-setup', async () => {
    return imageGen.checkPythonSetup();
});

// Model Creator - Create custom Ollama models
ipcMain.handle('create-ollama-model', async (event, { name, baseModel, systemPrompt, params }) => {
    console.log('Creating Ollama model:', { name, baseModel });
    
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
            // Escape quotes in system prompt
            const escapedPrompt = systemPrompt.replace(/"/g, '\\"');
            modelfile += `SYSTEM """${systemPrompt}"""\n`;
        }
        
        console.log('Generated Modelfile:\n', modelfile);
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

app.whenReady().then(async () => {
    console.log('=== Electron App Starting ===');
    
    // Try to connect to Ollama (optional - app works without it)
    console.log('Checking for Ollama...');
    const ollamaRunning = await ollamaManager.isServerRunning();
    if (ollamaRunning) {
        console.log('✓ Ollama server detected');
    } else {
        console.log('ℹ Ollama not running - local GGUF models available via node-llama-cpp');
    }
    
    // Initialize local LLM support
    console.log('Initializing local LLM support (node-llama-cpp)...');
    try {
        await localLlama.initLlama();
        console.log('✓ Local LLM ready');
    } catch (error) {
        console.log('⚠ Local LLM init deferred (will init on first use)');
    }
    
    console.log('Initializing database...');
    initDatabase();
    console.log('Initializing DeepSearch browser...');
    await initBrowser(); // Pre-start browser for faster searches
    
    // Check Python setup for image generation
    console.log('Checking Python setup for image generation...');
    const pythonStatus = await imageGen.checkPythonSetup();
    if (pythonStatus.available) {
        console.log('✓ Python and dependencies available for image generation');
        if (pythonStatus.pythonCmd) {
            console.log('  Using:', pythonStatus.pythonCmd);
        }
    } else if (pythonStatus.missing && pythonStatus.missing.length > 0) {
        console.log('⚠ Missing Python packages:', pythonStatus.missing.join(', '));
        console.log('  Install with:', pythonStatus.installCmd);
        if (pythonStatus.pythonCmd) {
            console.log('  Python found:', pythonStatus.pythonCmd);
        }
    } else if (pythonStatus.error) {
        console.log('⚠ Python issue:', pythonStatus.error);
        console.log('  Fix:', pythonStatus.installCmd);
    } else {
        console.log('⚠ Python not found. Install Python 3.8+ from python.org');
    }
    
    console.log('IPC Handlers registered:');
    console.log('- Chat handlers: load-chats, save-chats, save-chat, delete-chat');
    console.log('- Model scanner handlers: scan-models-folder, scan-diffusion-models, get-model-info');
    console.log('- Image generation handlers: generate-image, load-image-model, check-python-setup');
    console.log('- Hugging Face handlers: hf-set-token, hf-load-token, hf-clear-token, hf-search-models, hf-download-model, hf-get-user-info');
    console.log('Creating window...');
    createWindow();

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
    return { success: true, models: getInferenceModels() };
});

ipcMain.handle('hf-search-inference-models', async (event, query) => {
    return await searchInferenceModels(query, 5);
});

ipcMain.handle('send-hf-message', async (event, { model, messages }) => {
    console.log('Sending to HuggingFace Inference:', { model, messageCount: messages.length });
    
    try {
        // Load API key from settings if not already set
        const settingsFile = path.join(app.getPath('userData'), 'settings.json');
        if (fs.existsSync(settingsFile)) {
            const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
            if (settings.hfApiKey) {
                setApiToken(settings.hfApiKey);
            }
        }
        
        const response = await sendInferenceMessage(model, messages, 
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

// ============ PTY Terminal IPC Handlers ============

// Create/start PTY terminal
ipcMain.handle('pty-create', async (event, options = {}) => {
    return ptyTerminal.createPty(mainWindow, options);
});

// Write to PTY (user input)
ipcMain.handle('pty-write', async (event, data) => {
    return ptyTerminal.writeToPty(data);
});

// Resize PTY
ipcMain.handle('pty-resize', async (event, { cols, rows }) => {
    return ptyTerminal.resizePty(cols, rows);
});

// Kill PTY
ipcMain.handle('pty-kill', async () => {
    return ptyTerminal.killPty();
});

// Get PTY status
ipcMain.handle('pty-status', async () => {
    return ptyTerminal.getPtyInfo();
});

app.on('window-all-closed', async () => {
    // Kill PTY terminal
    ptyTerminal.killPty();
    
    // Close DeepSearch browser
    await closeBrowser();
    
    // Stop image generation process
    imageGen.stopProcess();
    
    // Stop Ollama server if we started it
    ollamaManager.stopServer();
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


