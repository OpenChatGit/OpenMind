/**
 * Ollama Manager - Connects to Ollama if available
 * 
 * This is now OPTIONAL - the app works without Ollama using node-llama-cpp.
 * If Ollama Desktop is installed and running, we can use it.
 * If not, users can use local GGUF models directly.
 */

const http = require('http');

let serverReady = false;

// Check if Ollama server is running
async function isServerRunning(host = '127.0.0.1', port = 11434) {
    return new Promise((resolve) => {
        const req = http.get(`http://${host}:${port}`, { timeout: 2000 }, () => {
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.end();
    });
}

// Get status
function getStatus() {
    return {
        serverRunning: serverReady,
        optional: true,
        message: 'Ollama is optional. Use local GGUF models with node-llama-cpp if Ollama is not installed.'
    };
}

// Initialize - just check if Ollama is available
async function initialize(onProgress) {
    if (onProgress) onProgress({ status: 'checking', message: 'Checking for Ollama...' });
    
    serverReady = await isServerRunning();
    
    if (serverReady) {
        if (onProgress) onProgress({ status: 'ready', message: 'Ollama server detected' });
        return { success: true };
    } else {
        if (onProgress) {
            onProgress({ 
                status: 'info', 
                message: 'Ollama not running. Use local GGUF models or install Ollama Desktop.' 
            });
        }
        return { success: false, optional: true, message: 'Ollama not running' };
    }
}

// No-op functions for compatibility
function stopServer() {
    // We don't manage the Ollama process anymore
    serverReady = false;
}

module.exports = {
    initialize,
    stopServer,
    getStatus,
    isServerRunning
};
