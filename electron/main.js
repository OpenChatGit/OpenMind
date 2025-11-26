const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');
const { initDatabase, loadChats, saveChats, saveChat, deleteChat } = require('./database');
const { scanModelsFolder, getModelInfo } = require('./modelScanner');
const { setApiToken, loadApiToken, clearApiToken, searchModels, downloadModel, getUserInfo } = require('./huggingface');
const { initBrowser, closeBrowser, getDeepSearchTools, executeToolCall } = require('./deepSearch');
const { initMcpHandler, getTools, getEnabledTools, getOllamaToolDefinitions, toggleTool, refreshTools, executeTool, openToolsFolder } = require('./mcpHandler');

// Helper function to extract <think> tags from content (for models like Qwen3 that output thinking in content)
function extractThinkTags(content) {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
    let thinking = '';
    let cleanContent = content;
    
    let match;
    while ((match = thinkRegex.exec(content)) !== null) {
        thinking += match[1].trim() + '\n';
    }
    
    // Remove think tags from content
    cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    return { thinking: thinking.trim(), content: cleanContent };
}

let mainWindow;

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

// Fetch Ollama Models
ipcMain.handle('get-ollama-models', async () => {
    return new Promise((resolve) => {
        const req = http.get(`http://${ollamaHost}:11434/api/tags`, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.models || []);
                } catch (e) {
                    resolve([]);
                }
            });
        });
        req.on('error', () => resolve([]));
        req.on('timeout', () => {
            req.destroy();
            resolve([]);
        });
        req.end();
    });
});

// Send message to Ollama with streaming and reasoning support
ipcMain.handle('send-ollama-message', async (event, { model, messages }) => {
    console.log('Sending to Ollama:', { model, messageCount: messages.length });

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: model,
            messages: messages,
            stream: true
        });

        const options = {
            hostname: ollamaHost,
            port: 11434,
            path: '/api/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 60000
        };

        const req = http.request(options, (res) => {
            let buffer = '';
            let thinkingContent = '';
            let messageContent = '';
            let rawContent = ''; // Track raw content for <think> tag extraction

            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const parsed = JSON.parse(line);

                        // Handle native thinking field (some models)
                        if (parsed.message?.thinking) {
                            thinkingContent += parsed.message.thinking;
                            try {
                                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                                    mainWindow.webContents.send('ollama-thinking-update', thinkingContent);
                                }
                            } catch (err) {
                                console.error('Error sending thinking update:', err.message);
                            }
                        }

                        if (parsed.message?.content) {
                            rawContent += parsed.message.content;
                            
                            // Extract <think> tags from content (for Qwen3 and similar models)
                            const extracted = extractThinkTags(rawContent);
                            
                            // Update thinking if found in content
                            if (extracted.thinking && extracted.thinking !== thinkingContent) {
                                thinkingContent = extracted.thinking;
                                try {
                                    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                                        mainWindow.webContents.send('ollama-thinking-update', thinkingContent);
                                    }
                                } catch (err) {
                                    console.error('Error sending thinking update:', err.message);
                                }
                            }
                            
                            // Send clean content (without think tags)
                            messageContent = extracted.content;
                            try {
                                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                                    mainWindow.webContents.send('ollama-message-update', messageContent);
                                }
                            } catch (err) {
                                console.error('Error sending message update:', err.message);
                            }
                        }

                        if (parsed.done) {
                            console.log('Stream complete');
                            // Final extraction to ensure we got everything
                            const finalExtracted = extractThinkTags(rawContent);
                            resolve({
                                thinking: thinkingContent || finalExtracted.thinking,
                                content: finalExtracted.content || 'No response'
                            });
                        }
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                }
            });

            res.on('end', () => {
                if (rawContent || thinkingContent) {
                    const finalExtracted = extractThinkTags(rawContent);
                    resolve({
                        thinking: thinkingContent || finalExtracted.thinking,
                        content: finalExtracted.content || 'No response'
                    });
                }
            });
        });

        req.on('error', (err) => {
            console.error('Request error:', err);
            reject(err);
        });

        req.write(postData);
        req.end();
    });
});

// MCP Tools message handler (separate from DeepSearch)
ipcMain.handle('send-mcp-message', async (event, { model, messages, enabledToolIds }) => {
    console.log('MCP Tools mode:', { model, messageCount: messages.length, tools: enabledToolIds });
    
    // Get only the enabled MCP tools
    const mcpTools = getOllamaToolDefinitions().filter(t => {
        const toolId = t.function.name.replace('mcp_', '');
        return enabledToolIds.includes(toolId);
    });
    
    if (mcpTools.length === 0) {
        // No tools enabled, fall back to normal message
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ model, messages, stream: false });
            const options = {
                hostname: ollamaHost,
                port: 11434,
                path: '/api/chat',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
                timeout: 60000
            };
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ thinking: parsed.message?.thinking || '', content: parsed.message?.content || 'No response' });
                    } catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }
    
    // Build tool descriptions for system prompt
    const toolDescriptions = mcpTools.map(t => `- **${t.function.name}**: ${t.function.description}`).join('\n');
    
    const systemPrompt = {
        role: 'system',
        content: `You are a helpful AI assistant with access to the following tools:

${toolDescriptions}

IMPORTANT: When the user asks about topics these tools can help with, USE THEM. For example:
- Weather questions → use mcp_weather tool
- Always use the actual data from tool results, never make up information.
- After using a tool, present the information in a clear, helpful way.`
    };
    
    let allMessages = [systemPrompt, ...messages];
    let finalResponse = { thinking: '', content: '' };
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
        iterations++;
        
        const postData = JSON.stringify({
            model: model,
            messages: allMessages,
            tools: mcpTools,
            stream: false
        });

        try {
            const response = await new Promise((resolve, reject) => {
                const options = {
                    hostname: ollamaHost,
                    port: 11434,
                    path: '/api/chat',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
                    timeout: 120000
                };
                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                    });
                });
                req.on('error', reject);
                req.write(postData);
                req.end();
            });

            if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
                allMessages.push(response.message);
                
                for (const toolCall of response.message.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolArgs = toolCall.function.arguments;
                    const toolId = toolName.replace('mcp_', '');
                    
                    console.log(`Executing MCP tool: ${toolId}`, toolArgs);
                    
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('mcp-tool-use', { tool: toolName, args: toolArgs, status: 'executing' });
                    }
                    
                    const result = await executeTool(toolId, toolArgs);
                    
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('mcp-tool-use', { tool: toolName, args: toolArgs, status: 'complete', result });
                    }
                    
                    allMessages.push({ role: 'tool', content: JSON.stringify(result) });
                }
            } else {
                finalResponse = {
                    thinking: response.message?.thinking || '',
                    content: response.message?.content || 'No response'
                };
                break;
            }
        } catch (error) {
            console.error('MCP Tools error:', error);
            finalResponse = { thinking: '', content: `Error: ${error.message}` };
            break;
        }
    }

    if (iterations >= maxIterations) {
        console.log('MCP: Reached maximum tool iterations');
    }

    return finalResponse;
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
    
    // Compress messages for smaller models
    const compressedMessages = compressMessages(messages).map(msg => ({
        ...msg,
        content: compressContent(msg.content)
    }));
    
    const tools = getDeepSearchTools();
    
    // Build dynamic system prompt based on available tools
    const mcpToolsList = tools
        .filter(t => t.function.name.startsWith('mcp_'))
        .map(t => `- **${t.function.name}**: ${t.function.description}`)
        .join('\n');
    
    const mcpSection = mcpToolsList ? `

Additionally, you have access to these MCP tools:
${mcpToolsList}

Use MCP tools when the user asks about topics they cover (e.g., use mcp_weather for weather questions).` : '';

    const systemPrompt = {
        role: 'system',
        content: `You have tools: web_search, system_search, list_directory, read_file.${mcpSection ? ' ' + mcpSection : ''}

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
    const maxIterations = 2; // Usually 1 tool call + 1 response is enough
    
    // Accumulate thinking across all iterations
    let accumulatedThinking = '';

    while (iterations < maxIterations) {
        iterations++;
        
        const postData = JSON.stringify({
            model: model,
            messages: allMessages,
            tools: tools,
            stream: true,
            options: {
                num_predict: 2048,      // Enough for full response
                temperature: 0.7,       // Balanced
                top_k: 40,
                top_p: 0.9,
                repeat_penalty: 1.8,    // Very strong penalty for loops
                repeat_last_n: 256      // Look back far
            }
        });

        try {
            const response = await new Promise((resolve, reject) => {
                const options = {
                    hostname: ollamaHost,
                    port: 11434,
                    path: '/api/chat',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    },
                    timeout: 60000
                };

                let thinkingContent = '';
                let messageContent = '';
                let rawContent = ''; // Track raw content for <think> tag extraction
                let toolCalls = null;
                let finalMessage = null;

                const req = http.request(options, (res) => {
                    let buffer = '';
                    
                    res.on('data', chunk => {
                        buffer += chunk.toString();
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        
                        for (const line of lines) {
                            if (!line.trim()) continue;
                            try {
                                const json = JSON.parse(line);
                                
                                // Handle native thinking field
                                if (json.message?.thinking) {
                                    thinkingContent += json.message.thinking;
                                    const combinedThinking = accumulatedThinking 
                                        ? accumulatedThinking + '\n\n' + thinkingContent 
                                        : thinkingContent;
                                    if (mainWindow && !mainWindow.isDestroyed()) {
                                        mainWindow.webContents.send('ollama-thinking-update', combinedThinking);
                                    }
                                }
                                
                                // Stream content updates with <think> tag extraction
                                if (json.message?.content) {
                                    rawContent += json.message.content;
                                    
                                    // Extract <think> tags from content
                                    const extracted = extractThinkTags(rawContent);
                                    
                                    // Update thinking if found in content
                                    if (extracted.thinking && extracted.thinking !== thinkingContent) {
                                        thinkingContent = extracted.thinking;
                                        const combinedThinking = accumulatedThinking 
                                            ? accumulatedThinking + '\n\n' + thinkingContent 
                                            : thinkingContent;
                                        if (mainWindow && !mainWindow.isDestroyed()) {
                                            mainWindow.webContents.send('ollama-thinking-update', combinedThinking);
                                        }
                                    }
                                    
                                    // Send clean content
                                    messageContent = extracted.content;
                                    if (mainWindow && !mainWindow.isDestroyed()) {
                                        mainWindow.webContents.send('ollama-message-update', messageContent);
                                    }
                                }
                                
                                // Capture tool calls
                                if (json.message?.tool_calls) {
                                    toolCalls = json.message.tool_calls;
                                }
                                
                                // Final message
                                if (json.done) {
                                    const finalExtracted = extractThinkTags(rawContent);
                                    finalMessage = {
                                        message: {
                                            thinking: thinkingContent || finalExtracted.thinking,
                                            content: finalExtracted.content,
                                            tool_calls: toolCalls
                                        }
                                    };
                                }
                            } catch (e) {
                                // Skip invalid JSON lines
                            }
                        }
                    });
                    
                    res.on('end', () => {
                        resolve(finalMessage || { message: { thinking: thinkingContent, content: messageContent, tool_calls: toolCalls } });
                    });
                });

                req.on('error', reject);
                req.write(postData);
                req.end();
            });

            // Check for tool calls
            if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
                // Accumulate thinking from this iteration before processing tools
                if (response.message?.thinking) {
                    accumulatedThinking = accumulatedThinking 
                        ? accumulatedThinking + '\n\n' + response.message.thinking
                        : response.message.thinking;
                }
                
                // Add assistant message with tool calls
                allMessages.push(response.message);
                
                // Aggressively deduplicate tool calls - only keep first of each tool type
                const seenTools = new Set();
                const seenQueries = new Set();
                const uniqueToolCalls = response.message.tool_calls.filter(toolCall => {
                    const toolName = toolCall.function.name;
                    const args = toolCall.function.arguments || {};
                    
                    // For web_search, only allow ONE call total (first one wins)
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
                    
                    // For other tools, dedupe by tool+args
                    const key = `${toolName}:${JSON.stringify(args)}`;
                    if (seenQueries.has(key)) {
                        console.log(`Skipping duplicate tool call: ${toolName}`);
                        return false;
                    }
                    seenQueries.add(key);
                    return true;
                });
                
                console.log(`Tool calls: ${response.message.tool_calls.length} -> ${uniqueToolCalls.length} after dedup`);
                
                // Execute unique tool calls in PARALLEL for speed
                const toolPromises = uniqueToolCalls.map(async (toolCall) => {
                    const toolName = toolCall.function.name;
                    const toolArgs = toolCall.function.arguments;
                    
                    console.log(`Executing tool: ${toolName}`, toolArgs);
                    
                    // Send tool use update to frontend
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('deepsearch-tool-use', {
                            tool: toolName,
                            args: toolArgs,
                            status: 'executing'
                        });
                    }
                    
                    const result = await executeToolCall(toolName, toolArgs);
                    
                    // Send tool result update
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('deepsearch-tool-use', {
                            tool: toolName,
                            args: toolArgs,
                            status: 'complete',
                            result: result
                        });
                    }
                    
                    // Format result for better model understanding
                    let formattedContent = '';
                    if (result.success && result.results && result.results.length > 0) {
                        formattedContent = `Search results for "${toolArgs.query}":\n\n`;
                        result.results.forEach((r, i) => {
                            formattedContent += `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet || ''}\n\n`;
                        });
                    } else {
                        formattedContent = JSON.stringify(result);
                    }
                    
                    return {
                        role: 'tool',
                        content: formattedContent
                    };
                });
                
                // Wait for all tools to complete
                const toolResults = await Promise.all(toolPromises);
                allMessages.push(...toolResults);
                
                console.log('Tool results added to messages, continuing conversation...');
            } else {
                // No tool calls, we have the final response
                // Combine accumulated thinking with final thinking
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
        // If we hit max iterations, make sure we have the accumulated thinking
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

// MCP Tools IPC Handlers
ipcMain.handle('mcp-get-tools', async () => {
    return getTools();
});

ipcMain.handle('mcp-toggle-tool', async (event, { toolId, enabled }) => {
    return toggleTool(toolId, enabled);
});

ipcMain.handle('mcp-refresh-tools', async () => {
    return refreshTools();
});

ipcMain.handle('mcp-execute-tool', async (event, { toolId, input }) => {
    return executeTool(toolId, input);
});

ipcMain.handle('mcp-open-tools-folder', async () => {
    openToolsFolder();
    return { success: true };
});

// Open external links in system browser
ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
    return { success: true };
});

app.whenReady().then(async () => {
    console.log('=== Electron App Starting ===');
    console.log('Initializing database...');
    initDatabase();
    console.log('Initializing MCP handler...');
    initMcpHandler();
    console.log('Initializing DeepSearch browser...');
    await initBrowser(); // Pre-start browser for faster searches
    console.log('IPC Handlers registered:');
    console.log('- Chat handlers: load-chats, save-chats, save-chat, delete-chat');
    console.log('- Model scanner handlers: scan-models-folder, get-model-info');
    console.log('- Hugging Face handlers: hf-set-token, hf-load-token, hf-clear-token, hf-search-models, hf-download-model, hf-get-user-info');
    console.log('- MCP handlers: mcp-get-tools, mcp-toggle-tool, mcp-refresh-tools, mcp-execute-tool, mcp-open-tools-folder');
    console.log('Creating window...');
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

let ollamaHost = '127.0.0.1';
let lastOllamaStatus = 'stopped';

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

app.on('window-all-closed', async () => {
    // Close DeepSearch browser
    await closeBrowser();
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
