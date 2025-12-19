const { Ollama } = require('ollama');

let ollamaClient = null;
let currentHost = 'http://127.0.0.1:11434';

// Helper function to extract <think> tags from content
function extractThinkTags(content) {
    if (!content) return { thinking: '', content: '' };
    
    let thinking = '';
    let cleanContent = content;
    
    // Handle complete <think>...</think> blocks
    const completeThinkRegex = /<think>([\s\S]*?)<\/think>/gi;
    const matches = content.match(completeThinkRegex);
    
    if (matches) {
        matches.forEach(match => {
            // Extract content between tags
            const innerMatch = match.match(/<think>([\s\S]*?)<\/think>/i);
            if (innerMatch && innerMatch[1]) {
                thinking += innerMatch[1].trim() + '\n';
            }
        });
        // Remove complete think blocks from content
        cleanContent = content.replace(completeThinkRegex, '').trim();
    }
    
    // Handle incomplete/streaming <think> tag (opened but not closed yet)
    // This happens during streaming when we have "<think>..." but no "</think>" yet
    const incompleteThinkMatch = cleanContent.match(/<think>([\s\S]*)$/i);
    if (incompleteThinkMatch) {
        // There's an unclosed <think> tag - the content after it is still thinking
        thinking += incompleteThinkMatch[1].trim();
        // Remove the incomplete think tag from content
        cleanContent = cleanContent.replace(/<think>[\s\S]*$/i, '').trim();
    }
    
    // Clean up any stray </think> tags that might appear at the start
    cleanContent = cleanContent.replace(/^<\/think>\s*/i, '').trim();
    
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

    let nativeThinking = '';  // From Ollama's native thinking field
    let tagThinking = '';     // From <think> tags in content
    let messageContent = '';
    let rawContent = '';
    let stats = {};
    let usesNativeThinking = false;  // Track if model uses native thinking

    try {
        const response = await client.chat({
            model,
            messages: ollamaMessages,
            stream: true
        });

        for await (const part of response) {
            // Handle native thinking field (new Ollama API)
            if (part.message?.thinking) {
                usesNativeThinking = true;
                nativeThinking += part.message.thinking;
                if (onThinking) onThinking(nativeThinking);
            }

            if (part.message?.content) {
                rawContent += part.message.content;
                
                // Only extract <think> tags if model doesn't use native thinking
                if (!usesNativeThinking) {
                    const extracted = extractThinkTags(rawContent);
                    
                    if (extracted.thinking) {
                        tagThinking = extracted.thinking;
                        if (onThinking) onThinking(tagThinking);
                    }
                    
                    messageContent = extracted.content;
                } else {
                    // Model uses native thinking, content is clean
                    messageContent = rawContent;
                }
                
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

        // Final processing
        let finalThinking = nativeThinking;
        let finalContent = messageContent;
        
        if (!usesNativeThinking) {
            const finalExtracted = extractThinkTags(rawContent);
            finalThinking = finalExtracted.thinking;
            finalContent = finalExtracted.content;
        }
        
        return {
            thinking: finalThinking,
            content: finalContent || 'No response',
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

    let nativeThinking = '';
    let tagThinking = '';
    let messageContent = '';
    let rawContent = '';
    let toolCalls = null;
    let stats = {};
    let usesNativeThinking = false;

    try {
        const response = await client.chat({
            model,
            messages,
            tools,
            stream: true,
            options: modelOptions
        });

        for await (const part of response) {
            // Handle native thinking field (new Ollama API)
            if (part.message?.thinking) {
                usesNativeThinking = true;
                nativeThinking += part.message.thinking;
                if (onThinking) onThinking(nativeThinking);
            }

            if (part.message?.content) {
                rawContent += part.message.content;
                
                if (!usesNativeThinking) {
                    const extracted = extractThinkTags(rawContent);
                    
                    if (extracted.thinking) {
                        tagThinking = extracted.thinking;
                        if (onThinking) onThinking(tagThinking);
                    }
                    
                    messageContent = extracted.content;
                } else {
                    messageContent = rawContent;
                }
                
                if (onContent) onContent(messageContent);
            }

            if (part.message?.tool_calls) {
                toolCalls = part.message.tool_calls;
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

        // Final processing
        let finalThinking = nativeThinking;
        let finalContent = messageContent;
        
        if (!usesNativeThinking) {
            const finalExtracted = extractThinkTags(rawContent);
            finalThinking = finalExtracted.thinking;
            finalContent = finalExtracted.content;
        }
        
        return {
            message: {
                thinking: finalThinking,
                content: finalContent,
                tool_calls: toolCalls
            },
            stats
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

// Super verbose API test - logs EVERYTHING from Ollama response
async function verboseApiTest(options) {
    const { model, prompt = "What is 2+2? Think step by step.", host = currentHost } = options;
    const client = getClient(host);
    
    console.log('\n' + '='.repeat(80));
    console.log('[VERBOSE API TEST] Starting test with model:', model);
    console.log('[VERBOSE API TEST] Prompt:', prompt);
    console.log('[VERBOSE API TEST] Host:', host);
    console.log('='.repeat(80) + '\n');
    
    const messages = [{ role: 'user', content: prompt }];
    
    let allParts = [];
    let partIndex = 0;
    
    try {
        const response = await client.chat({
            model,
            messages,
            stream: true
        });
        
        console.log('[VERBOSE] Starting stream...\n');
        
        for await (const part of response) {
            partIndex++;
            
            // Log EVERY part with full detail
            console.log(`\n--- PART ${partIndex} ---`);
            console.log('[VERBOSE] Full part object:');
            console.log(JSON.stringify(part, null, 2));
            
            // Specifically check for thinking
            if (part.message) {
                console.log('\n[VERBOSE] Message object keys:', Object.keys(part.message));
                
                if (part.message.thinking !== undefined) {
                    console.log('[VERBOSE] ✅ THINKING FIELD EXISTS!');
                    console.log('[VERBOSE] Thinking value:', JSON.stringify(part.message.thinking));
                    console.log('[VERBOSE] Thinking length:', part.message.thinking?.length || 0);
                }
                
                if (part.message.content !== undefined) {
                    console.log('[VERBOSE] Content value:', JSON.stringify(part.message.content));
                    console.log('[VERBOSE] Content length:', part.message.content?.length || 0);
                    
                    // Check for <think> tags in content
                    if (part.message.content.includes('<think>') || part.message.content.includes('</think>')) {
                        console.log('[VERBOSE] ⚠️ THINK TAGS FOUND IN CONTENT!');
                    }
                }
                
                if (part.message.role) {
                    console.log('[VERBOSE] Role:', part.message.role);
                }
            }
            
            if (part.done) {
                console.log('\n[VERBOSE] ✅ STREAM DONE');
                console.log('[VERBOSE] Stats:', {
                    total_duration: part.total_duration,
                    eval_count: part.eval_count,
                    model: part.model
                });
            }
            
            allParts.push(part);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('[VERBOSE API TEST] SUMMARY');
        console.log('='.repeat(80));
        console.log('[VERBOSE] Total parts received:', allParts.length);
        
        // Aggregate all thinking and content
        let totalThinking = '';
        let totalContent = '';
        let hasNativeThinking = false;
        let hasThinkTags = false;
        
        for (const p of allParts) {
            if (p.message?.thinking) {
                totalThinking += p.message.thinking;
                hasNativeThinking = true;
            }
            if (p.message?.content) {
                totalContent += p.message.content;
                if (p.message.content.includes('<think>') || p.message.content.includes('</think>')) {
                    hasThinkTags = true;
                }
            }
        }
        
        console.log('\n[VERBOSE] AGGREGATED RESULTS:');
        console.log('[VERBOSE] Has native thinking field:', hasNativeThinking);
        console.log('[VERBOSE] Has <think> tags in content:', hasThinkTags);
        console.log('[VERBOSE] Total thinking length:', totalThinking.length);
        console.log('[VERBOSE] Total content length:', totalContent.length);
        
        if (totalThinking) {
            console.log('\n[VERBOSE] FULL THINKING:');
            console.log('---');
            console.log(totalThinking);
            console.log('---');
        }
        
        console.log('\n[VERBOSE] FULL CONTENT:');
        console.log('---');
        console.log(totalContent);
        console.log('---');
        
        console.log('\n' + '='.repeat(80));
        console.log('[VERBOSE API TEST] TEST COMPLETE');
        console.log('='.repeat(80) + '\n');
        
        return {
            success: true,
            partsCount: allParts.length,
            hasNativeThinking,
            hasThinkTags,
            thinking: totalThinking,
            content: totalContent,
            allParts
        };
        
    } catch (error) {
        console.error('[VERBOSE API TEST] ERROR:', error);
        return {
            success: false,
            error: error.message
        };
    }
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
    executeCommand,
    verboseApiTest
};
