/**
 * LLMLingua Prompt Compression Module
 * Calls Python script to compress prompts using Microsoft's LLMLingua
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let pythonCmd = null;
let isAvailable = null;

/**
 * Find Python command (python or python3)
 */
function findPython() {
    if (pythonCmd) return pythonCmd;
    
    const commands = process.platform === 'win32' 
        ? ['python', 'python3', 'py']
        : ['python3', 'python'];
    
    for (const cmd of commands) {
        try {
            const { execSync } = require('child_process');
            execSync(`${cmd} --version`, { stdio: 'ignore' });
            pythonCmd = cmd;
            return cmd;
        } catch {
            continue;
        }
    }
    return null;
}

/**
 * Get path to the compression script
 */
function getScriptPath() {
    const scriptPath = path.join(__dirname, '..', 'python', 'prompt_compress.py');
    if (fs.existsSync(scriptPath)) {
        return scriptPath;
    }
    return null;
}

/**
 * Check if LLMLingua is available
 */
async function checkAvailable() {
    if (isAvailable !== null) return isAvailable;
    
    const python = findPython();
    const script = getScriptPath();
    
    if (!python || !script) {
        isAvailable = false;
        return false;
    }
    
    return new Promise((resolve) => {
        const proc = spawn(python, [script, '--mode', 'check'], {
            timeout: 30000
        });
        
        let output = '';
        proc.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        proc.on('close', (code) => {
            try {
                const result = JSON.parse(output);
                isAvailable = result.available === true;
            } catch {
                isAvailable = false;
            }
            resolve(isAvailable);
        });
        
        proc.on('error', () => {
            isAvailable = false;
            resolve(false);
        });
    });
}

/**
 * Compress a single text prompt
 * @param {string} text - Text to compress
 * @param {number} ratio - Target compression ratio (0.5 = 50%)
 * @returns {Promise<string>} Compressed text
 */
async function compressText(text, ratio = 0.5) {
    const python = findPython();
    const script = getScriptPath();
    
    if (!python || !script) {
        console.log('LLMLingua not available, returning original text');
        return text;
    }
    
    return new Promise((resolve) => {
        const proc = spawn(python, [
            script,
            '--mode', 'text',
            '--ratio', ratio.toString(),
            '--input', text
        ], {
            timeout: 60000
        });
        
        let output = '';
        let error = '';
        
        proc.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        proc.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        proc.on('close', (code) => {
            if (code === 0 && output) {
                try {
                    const result = JSON.parse(output);
                    resolve(result.result || text);
                } catch {
                    resolve(text);
                }
            } else {
                console.error('Compression error:', error);
                resolve(text);
            }
        });
        
        proc.on('error', (err) => {
            console.error('Failed to run compression:', err);
            resolve(text);
        });
    });
}

/**
 * Compress chat messages
 * @param {Array} messages - Array of {role, content} messages
 * @param {number} ratio - Target compression ratio
 * @returns {Promise<Array>} Compressed messages
 */
async function compressMessages(messages, ratio = 0.6) {
    const python = findPython();
    const script = getScriptPath();
    
    if (!python || !script) {
        console.log('LLMLingua not available, returning original messages');
        return messages;
    }
    
    return new Promise((resolve) => {
        const proc = spawn(python, [
            script,
            '--mode', 'messages',
            '--ratio', ratio.toString()
        ], {
            timeout: 120000
        });
        
        let output = '';
        
        // Send messages as JSON to stdin
        proc.stdin.write(JSON.stringify(messages));
        proc.stdin.end();
        
        proc.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        proc.on('close', (code) => {
            if (code === 0 && output) {
                try {
                    const result = JSON.parse(output);
                    resolve(result.result || messages);
                } catch {
                    resolve(messages);
                }
            } else {
                resolve(messages);
            }
        });
        
        proc.on('error', () => {
            resolve(messages);
        });
    });
}

/**
 * Simple fallback compression (no Python needed)
 * Uses basic heuristics to reduce message size
 */
function simpleCompress(messages, maxTokensPerMessage = 500) {
    return messages.map(msg => {
        if (msg.role === 'system') return msg;
        
        let content = msg.content || '';
        
        // Skip short messages
        if (content.length < 200) return msg;
        
        // Remove excessive whitespace
        content = content.replace(/\s+/g, ' ').trim();
        
        // Truncate very long messages
        if (content.length > maxTokensPerMessage * 4) {
            const half = Math.floor(maxTokensPerMessage * 2);
            content = content.substring(0, half) + '\n...[truncated]...\n' + 
                     content.substring(content.length - half);
        }
        
        return { ...msg, content };
    });
}

module.exports = {
    checkAvailable,
    compressText,
    compressMessages,
    simpleCompress,
    findPython
};
