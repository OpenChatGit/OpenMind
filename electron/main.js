const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { initDatabase, loadChats, saveChats, saveChat, deleteChat } = require('./database');
const { scanModelsFolder, scanDiffusionModels, getModelInfo } = require('./modelScanner');
const { setApiToken, loadApiToken, clearApiToken, searchModels, downloadModel, getUserInfo, sendInferenceMessage, getInferenceModels, searchInferenceModels } = require('./huggingface');
const { initBrowser, closeBrowser, getDeepSearchTools, executeToolCall } = require('./deepSearch');
const { initMcpHandler, getTools, getEnabledTools, getOllamaToolDefinitions, toggleTool, refreshTools, executeTool, openToolsFolder } = require('./mcpHandler');
const imageGen = require('./imageGen');

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

// Send message to Ollama with streaming and reasoning support (including vision)
ipcMain.handle('send-ollama-message', async (event, { model, messages }) => {
    console.log('Sending to Ollama:', { model, messageCount: messages.length });

    // Transform messages to Ollama format (handle images for vision models)
    const ollamaMessages = messages.map(msg => {
        if (msg.images && msg.images.length > 0) {
            // Vision message with images - Ollama expects base64 strings in 'images' array
            return {
                role: msg.role,
                content: msg.content,
                images: msg.images.map(img => img.base64 || img)
            };
        }
        return {
            role: msg.role,
            content: msg.content
        };
    });

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: model,
            messages: ollamaMessages,
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
                            
                            // Extract inference stats from Ollama response
                            const stats = {
                                total_duration: parsed.total_duration, // nanoseconds
                                load_duration: parsed.load_duration,
                                prompt_eval_count: parsed.prompt_eval_count,
                                prompt_eval_duration: parsed.prompt_eval_duration,
                                eval_count: parsed.eval_count,
                                eval_duration: parsed.eval_duration,
                                model: parsed.model
                            };
                            
                            resolve({
                                thinking: thinkingContent || finalExtracted.thinking,
                                content: finalExtracted.content || 'No response',
                                stats: stats
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
                        content: finalExtracted.content || 'No response',
                        stats: {} // No stats available in this case
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
    console.log('Initializing database...');
    initDatabase();
    console.log('Initializing MCP handler...');
    initMcpHandler();
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

// IDE File System Handlers
const projectsFolder = path.join(__dirname, '..', 'projects');

// Ensure projects folder exists
if (!fs.existsSync(projectsFolder)) {
    fs.mkdirSync(projectsFolder, { recursive: true });
}

ipcMain.handle('ide-get-projects-folder', async () => {
    return { success: true, folderPath: projectsFolder };
});

ipcMain.handle('ide-create-project', async (event, projectName) => {
    try {
        const projectPath = path.join(projectsFolder, projectName);
        if (fs.existsSync(projectPath)) {
            return { success: false, error: 'Project already exists' };
        }
        fs.mkdirSync(projectPath, { recursive: true });
        // Create basic files
        fs.writeFileSync(path.join(projectPath, 'README.md'), `# ${projectName}\n\nNew project created with OpenMind IDE.`);
        return { success: true, projectPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ide-list-projects', async () => {
    try {
        if (!fs.existsSync(projectsFolder)) {
            return { success: true, projects: [] };
        }
        const entries = fs.readdirSync(projectsFolder, { withFileTypes: true });
        const projects = entries
            .filter(e => e.isDirectory())
            .map(e => ({
                name: e.name,
                path: path.join(projectsFolder, e.name)
            }));
        return { success: true, projects };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ide-select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
        return { success: false };
    }
    return { success: true, folderPath: result.filePaths[0] };
});

ipcMain.handle('ide-read-directory', async (event, folderPath) => {
    try {
        const items = [];
        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(folderPath, entry.name);
            const stats = fs.statSync(fullPath);
            items.push({
                name: entry.name,
                path: fullPath,
                isDirectory: entry.isDirectory(),
                size: stats.size,
                modified: stats.mtime
            });
        }
        
        // Sort: folders first, then files, alphabetically
        items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        
        return { success: true, items };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ide-create-file', async (event, { filePath, content = '' }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ide-create-folder', async (event, folderPath) => {
    try {
        fs.mkdirSync(folderPath, { recursive: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ide-get-stats', async (event, filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return { 
            success: true, 
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            size: stats.size,
            modified: stats.mtime
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ide-read-file', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ide-save-file', async (event, { filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ide-delete-file', async (event, filePath) => {
    try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true });
        } else {
            fs.unlinkSync(filePath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ide-rename-file', async (event, { oldPath, newPath }) => {
    try {
        fs.renameSync(oldPath, newPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Check if folder is a git repository
ipcMain.handle('ide-git-status', async (event, rootPath) => {
    try {
        const gitDir = path.join(rootPath, '.git');
        if (!fs.existsSync(gitDir)) {
            return { success: true, isRepo: false };
        }
        
        // Read HEAD to get current branch
        const headPath = path.join(gitDir, 'HEAD');
        const headContent = fs.readFileSync(headPath, 'utf8').trim();
        let branch = 'HEAD';
        if (headContent.startsWith('ref: refs/heads/')) {
            branch = headContent.replace('ref: refs/heads/', '');
        }
        
        return { success: true, isRepo: true, branch };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Search in files
ipcMain.handle('ide-search-files', async (event, { rootPath, query, options = {} }) => {
    try {
        const results = [];
        const { caseSensitive = false, wholeWord = false, useRegex = false } = options;
        
        // Build search pattern
        let pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (wholeWord) {
            pattern = `\\b${pattern}\\b`;
        }
        const flags = caseSensitive ? 'g' : 'gi';
        let searchRegex;
        try {
            searchRegex = new RegExp(pattern, flags);
        } catch (e) {
            return { success: false, error: 'Invalid search pattern' };
        }
        
        const searchDir = async (dirPath) => {
            let entries;
            try {
                entries = fs.readdirSync(dirPath, { withFileTypes: true });
            } catch (e) {
                return;
            }
            
            for (const entry of entries) {
                // Skip hidden folders, node_modules, dist, build
                if (entry.name.startsWith('.') || 
                    entry.name === 'node_modules' || 
                    entry.name === 'dist' ||
                    entry.name === 'build' ||
                    entry.name === '.git') continue;
                
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    await searchDir(fullPath);
                } else {
                    // Skip binary and large files
                    const ext = entry.name.split('.').pop()?.toLowerCase();
                    const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf', 'eot', 'mp3', 'mp4', 'zip', 'tar', 'gz', 'pdf'];
                    if (binaryExts.includes(ext)) continue;
                    
                    try {
                        const stats = fs.statSync(fullPath);
                        if (stats.size > 1024 * 1024) continue; // Skip files > 1MB
                        
                        const content = fs.readFileSync(fullPath, 'utf8');
                        const lines = content.split('\n');
                        
                        lines.forEach((line, index) => {
                            searchRegex.lastIndex = 0;
                            if (searchRegex.test(line)) {
                                results.push({
                                    file: fullPath,
                                    fileName: entry.name,
                                    line: index + 1,
                                    content: line.trim().substring(0, 300),
                                    relativePath: path.relative(rootPath, path.dirname(fullPath))
                                });
                            }
                        });
                    } catch (e) {
                        // Skip unreadable files
                    }
                }
                
                // Limit results
                if (results.length >= 500) return;
            }
        };
        
        await searchDir(rootPath);
        return { success: true, results };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

app.on('window-all-closed', async () => {
    // Close DeepSearch browser
    await closeBrowser();
    
    // Stop image generation process
    imageGen.stopProcess();
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
