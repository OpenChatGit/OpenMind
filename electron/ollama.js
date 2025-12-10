const { Ollama } = require('ollama');

let ollamaClient = null;
let currentHost = 'http://127.0.0.1:11434';

// Helper function to extract <think> tags from content
function extractThinkTags(content) {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
    let thinking = '';
    let cleanContent = content;
    
    let match;
    while ((match = thinkRegex.exec(content)) !== null) {
        thinking += match[1].trim() + '\n';
    }
    
    cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    return { thinking: thinking.trim(), content: cleanContent };
}

// Initialize or get Ollama client
function getClient(host = currentHost) {
    if (!ollamaClient || host !== currentHost) {
        currentHost = host;
        ollamaClient = new Ollama({ host });
    }
    return ollamaClient;
}

// Update host configuration
function setHost(host) {
    currentHost = host;
    ollamaClient = new Ollama({ host });
    return ollamaClient;
}

// Check if Ollama is running
async function checkStatus(host = currentHost) {
    try {
        const client = getClient(host);
        await client.list();
        return { running: true, host };
    } catch (error) {
        return { running: false, host, error: error.message };
    }
}

// Get available models
async function listModels(host = currentHost) {
    try {
        const client = getClient(host);
        const response = await client.list();
        return response.models || [];
    } catch (error) {
        console.error('Error listing models:', error);
        return [];
    }
}


// Chat with streaming support
async function chat(options, onThinking, onContent) {
    const { model, messages, host = currentHost } = options;
    const client = getClient(host);
    
    // Transform messages for Ollama (handle images)
    const ollamaMessages = messages.map(msg => {
        if (msg.images && msg.images.length > 0) {
            return {
                role: msg.role,
                content: msg.content,
                images: msg.images.map(img => img.base64 || img)
            };
        }
        return { role: msg.role, content: msg.content };
    });

    let thinkingContent = '';
    let messageContent = '';
    let rawContent = '';
    let stats = {};

    try {
        const response = await client.chat({
            model,
            messages: ollamaMessages,
            stream: true
        });

        for await (const part of response) {
            // Handle native thinking field
            if (part.message?.thinking) {
                thinkingContent += part.message.thinking;
                if (onThinking) onThinking(thinkingContent);
            }

            if (part.message?.content) {
                rawContent += part.message.content;
                
                // Extract <think> tags from content (Qwen3 style)
                const extracted = extractThinkTags(rawContent);
                
                if (extracted.thinking && extracted.thinking !== thinkingContent) {
                    thinkingContent = extracted.thinking;
                    if (onThinking) onThinking(thinkingContent);
                }
                
                messageContent = extracted.content;
                if (onContent) onContent(messageContent);
            }

            // Capture stats when done
            if (part.done) {
                stats = {
                    total_duration: part.total_duration,
                    load_duration: part.load_duration,
                    prompt_eval_count: part.prompt_eval_count,
                    prompt_eval_duration: part.prompt_eval_duration,
                    eval_count: part.eval_count,
                    eval_duration: part.eval_duration,
                    model: part.model
                };
            }
        }

        const finalExtracted = extractThinkTags(rawContent);
        return {
            thinking: thinkingContent || finalExtracted.thinking,
            content: finalExtracted.content || messageContent || 'No response',
            stats
        };
    } catch (error) {
        console.error('Ollama chat error:', error);
        throw error;
    }
}

// Chat with tools support (for DeepSearch)
async function chatWithTools(options, onThinking, onContent) {
    const { model, messages, tools, host = currentHost, modelOptions = {} } = options;
    const client = getClient(host);

    let thinkingContent = '';
    let messageContent = '';
    let rawContent = '';
    let toolCalls = null;

    try {
        const response = await client.chat({
            model,
            messages,
            tools,
            stream: true,
            options: modelOptions
        });

        for await (const part of response) {
            if (part.message?.thinking) {
                thinkingContent += part.message.thinking;
                if (onThinking) onThinking(thinkingContent);
            }

            if (part.message?.content) {
                rawContent += part.message.content;
                const extracted = extractThinkTags(rawContent);
                
                if (extracted.thinking && extracted.thinking !== thinkingContent) {
                    thinkingContent = extracted.thinking;
                    if (onThinking) onThinking(thinkingContent);
                }
                
                messageContent = extracted.content;
                if (onContent) onContent(messageContent);
            }

            if (part.message?.tool_calls) {
                toolCalls = part.message.tool_calls;
            }
        }

        const finalExtracted = extractThinkTags(rawContent);
        return {
            message: {
                thinking: thinkingContent || finalExtracted.thinking,
                content: finalExtracted.content || messageContent,
                tool_calls: toolCalls
            }
        };
    } catch (error) {
        console.error('Ollama chat with tools error:', error);
        throw error;
    }
}

// Pull a model
async function pullModel(modelName, onProgress, host = currentHost) {
    const client = getClient(host);
    
    try {
        const response = await client.pull({
            model: modelName,
            stream: true
        });

        for await (const part of response) {
            if (onProgress) {
                onProgress({
                    status: part.status,
                    digest: part.digest,
                    total: part.total,
                    completed: part.completed
                });
            }
        }
        return { success: true };
    } catch (error) {
        console.error('Error pulling model:', error);
        return { success: false, error: error.message };
    }
}

// Get model info
async function showModel(modelName, host = currentHost) {
    try {
        const client = getClient(host);
        return await client.show({ model: modelName });
    } catch (error) {
        console.error('Error showing model:', error);
        return null;
    }
}

// Delete a model
async function deleteModel(modelName, host = currentHost) {
    try {
        const client = getClient(host);
        await client.delete({ model: modelName });
        return { success: true };
    } catch (error) {
        console.error('Error deleting model:', error);
        return { success: false, error: error.message };
    }
}

// Get running models
async function listRunning(host = currentHost) {
    try {
        const client = getClient(host);
        return await client.ps();
    } catch (error) {
        console.error('Error listing running models:', error);
        return { models: [] };
    }
}

// Strip ANSI escape codes from text
function stripAnsi(text) {
    // Remove all ANSI escape sequences comprehensively
    return text
        // ESC sequences
        .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/\x1B\][^\x07]*\x07/g, '')
        .replace(/\x1B[PX^_].*?\x1B\\/g, '')
        .replace(/\x1B\[[\?]?[0-9;]*[a-zA-Z]/g, '')
        // Remaining escape chars
        .replace(/\x1B/g, '')
        // Control characters (except newline and tab)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        // Leftover bracket sequences
        .replace(/\[\??\d*[a-zA-Z]/g, '')
        .replace(/\[K/g, '')
        .replace(/\[1G/g, '')
        .replace(/\[A/g, '')
        // Progress bar characters we want to keep readable
        .replace(/[▕▏█ ]+/g, ' ')
        .replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, '')
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

// Execute arbitrary ollama CLI command with progress callback for pull
async function executeCommand(command, onProgress = null, host = currentHost) {
    const { spawn } = require('child_process');
    
    // Parse the command - support common ollama commands
    let trimmedCmd = command.trim();
    
    // Normalize command - remove 'ollama' prefix if present
    if (trimmedCmd.toLowerCase().startsWith('ollama ')) {
        trimmedCmd = trimmedCmd.substring(7).trim();
    }
    
    const parts = trimmedCmd.split(/\s+/);
    const subCommand = parts[0]?.toLowerCase();
    const args = parts.slice(1);
    
    return new Promise((resolve) => {
        const proc = spawn('ollama', [subCommand, ...args], {
            shell: true
        });
        
        let output = '';
        let lastProgress = 0;
        
        const processData = (data) => {
            const rawText = data.toString();
            const text = stripAnsi(rawText);
            output += text + '\n';
            
            // Parse progress for pull commands
            if (subCommand === 'pull' && onProgress) {
                // Ollama outputs progress like: "pulling abc123... 45% ▕████      ▏ 1.2 GB/2.5 GB"
                const percentMatch = rawText.match(/(\d+)%/);
                if (percentMatch) {
                    const percent = parseInt(percentMatch[1], 10);
                    if (percent !== lastProgress) {
                        lastProgress = percent;
                        onProgress({ percent, status: `Downloading... ${percent}%` });
                    }
                }
                
                // Check for status messages
                if (text.includes('verifying')) {
                    onProgress({ status: 'Verifying...', percent: 100 });
                } else if (text.includes('writing manifest')) {
                    onProgress({ status: 'Writing manifest...', percent: 100 });
                } else if (text.includes('success')) {
                    onProgress({ status: 'Complete!', percent: 100, done: true });
                }
            }
        };
        
        proc.stdout.on('data', processData);
        proc.stderr.on('data', processData);
        
        proc.on('close', (code) => {
            // Always send done signal on close for pull commands
            if (subCommand === 'pull' && onProgress) {
                onProgress({ percent: 0, done: true, status: code === 0 ? 'Complete!' : 'Failed' });
            }
            
            // Clean up output - remove empty lines and duplicates
            const cleanOutput = output
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .filter((line, index, arr) => arr.indexOf(line) === index)
                .join('\n');
            
            if (code === 0) {
                resolve({ success: true, output: cleanOutput || 'Command completed' });
            } else {
                resolve({ success: false, error: cleanOutput || 'Command failed' });
            }
        });
        
        proc.on('error', (error) => {
            if (subCommand === 'pull' && onProgress) {
                onProgress({ percent: 0, done: true, status: 'Error' });
            }
            resolve({ success: false, error: error.message });
        });
        
        // Timeout after 10 minutes for pull commands
        setTimeout(() => {
            proc.kill();
            if (subCommand === 'pull' && onProgress) {
                onProgress({ percent: 0, done: true, status: 'Timeout' });
            }
            resolve({ success: false, error: 'Command timed out' });
        }, 600000);
    });
}

module.exports = {
    getClient,
    setHost,
    checkStatus,
    listModels,
    chat,
    chatWithTools,
    pullModel,
    showModel,
    deleteModel,
    listRunning,
    extractThinkTags,
    executeCommand
};
