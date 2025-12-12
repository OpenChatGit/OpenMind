/**
 * Ollama Manager - Manages bundled Ollama binary
 * 
 * Supports bundled ollama.exe for Windows (amd64)
 * Falls back to system-installed Ollama if bundled version not available
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { app } = require('electron');

let ollamaProcess = null;
let serverReady = false;
let isStarting = false;
let usingBundled = false;

// Get the path to bundled Ollama binary
function getBundledOllamaPath() {
    const platform = process.platform;
    const arch = process.arch;
    
    // Determine base path (works in dev and production)
    const isDev = !app.isPackaged;
    let basePath;
    
    if (isDev) {
        basePath = path.join(__dirname, '..');
    } else {
        basePath = path.join(process.resourcesPath, 'app');
    }
    
    // Currently only Windows amd64 is supported
    if (platform === 'win32' && arch === 'x64') {
        const ollamaPath = path.join(basePath, 'ollama', 'windows-amd64', 'ollama.exe');
        console.log('[OllamaManager] Checking bundled path:', ollamaPath);
        return ollamaPath;
    }
    
    // Linux support (future)
    if (platform === 'linux' && arch === 'x64') {
        return path.join(basePath, 'ollama', 'linux-amd64', 'ollama');
    }
    
    // macOS support (future)
    if (platform === 'darwin') {
        const macArch = arch === 'arm64' ? 'darwin-arm64' : 'darwin-amd64';
        return path.join(basePath, 'ollama', macArch, 'ollama');
    }
    
    return null;
}

// Check if bundled Ollama exists
function hasBundledOllama() {
    const ollamaPath = getBundledOllamaPath();
    if (!ollamaPath) return false;
    
    const exists = fs.existsSync(ollamaPath);
    console.log('[OllamaManager] Bundled Ollama exists:', exists, ollamaPath);
    return exists;
}

// Check if Ollama server is running
async function isServerRunning(host = '127.0.0.1', port = 11434) {
    return new Promise((resolve) => {
        const req = http.get(`http://${host}:${port}`, { timeout: 2000 }, (res) => {
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
        processRunning: ollamaProcess !== null,
        usingBundled: usingBundled,
        hasBundled: hasBundledOllama(),
        isStarting: isStarting,
        platform: process.platform,
        arch: process.arch
    };
}

// Start the bundled Ollama server
async function startServer(onLog) {
    // Check if already running
    if (await isServerRunning()) {
        serverReady = true;
        if (onLog) onLog({ type: 'info', message: 'Ollama server already running' });
        return { success: true, message: 'Server already running' };
    }
    
    // Check if already starting
    if (isStarting) {
        return { success: false, message: 'Server is already starting' };
    }
    
    // Check for bundled binary
    const bundledPath = getBundledOllamaPath();
    const hasBundled = bundledPath && fs.existsSync(bundledPath);
    
    if (!hasBundled) {
        if (onLog) onLog({ type: 'error', message: 'Bundled Ollama not found for this platform' });
        return { 
            success: false, 
            message: `Bundled Ollama not available for ${process.platform}-${process.arch}` 
        };
    }
    
    isStarting = true;
    usingBundled = true;
    
    if (onLog) onLog({ type: 'info', message: `Starting bundled Ollama: ${bundledPath}` });
    
    try {
        // Set environment variables for Ollama
        const env = { ...process.env };
        
        // Set OLLAMA_HOST to ensure it binds to localhost
        env.OLLAMA_HOST = '127.0.0.1:11434';
        
        // Set models directory in user data
        const modelsDir = path.join(app.getPath('userData'), 'ollama-models');
        if (!fs.existsSync(modelsDir)) {
            fs.mkdirSync(modelsDir, { recursive: true });
        }
        env.OLLAMA_MODELS = modelsDir;
        
        if (onLog) onLog({ type: 'info', message: `Models directory: ${modelsDir}` });
        
        // Start Ollama serve
        ollamaProcess = spawn(bundledPath, ['serve'], {
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        });
        
        ollamaProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            console.log('[Ollama]', message);
            if (onLog) onLog({ type: 'stdout', message });
        });
        
        ollamaProcess.stderr.on('data', (data) => {
            const message = data.toString().trim();
            console.log('[Ollama stderr]', message);
            if (onLog) onLog({ type: 'stderr', message });
            
            // Check for ready message
            if (message.includes('Listening on')) {
                serverReady = true;
                isStarting = false;
                if (onLog) onLog({ type: 'ready', message: 'Ollama server is ready' });
            }
        });
        
        ollamaProcess.on('error', (error) => {
            console.error('[OllamaManager] Process error:', error);
            if (onLog) onLog({ type: 'error', message: `Process error: ${error.message}` });
            isStarting = false;
            serverReady = false;
            ollamaProcess = null;
        });
        
        ollamaProcess.on('exit', (code, signal) => {
            console.log('[OllamaManager] Process exited:', code, signal);
            if (onLog) onLog({ type: 'exit', message: `Process exited with code ${code}` });
            isStarting = false;
            serverReady = false;
            ollamaProcess = null;
        });
        
        // Wait for server to be ready (max 30 seconds)
        const maxWait = 30000;
        const checkInterval = 500;
        let waited = 0;
        
        while (waited < maxWait) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
            
            if (await isServerRunning()) {
                serverReady = true;
                isStarting = false;
                if (onLog) onLog({ type: 'ready', message: 'Ollama server is ready!' });
                return { success: true, message: 'Server started successfully' };
            }
        }
        
        // Timeout
        isStarting = false;
        if (onLog) onLog({ type: 'error', message: 'Server startup timeout' });
        return { success: false, message: 'Server startup timeout' };
        
    } catch (error) {
        console.error('[OllamaManager] Start error:', error);
        isStarting = false;
        if (onLog) onLog({ type: 'error', message: error.message });
        return { success: false, message: error.message };
    }
}

// Stop the Ollama server
function stopServer() {
    if (ollamaProcess) {
        console.log('[OllamaManager] Stopping Ollama server...');
        
        if (process.platform === 'win32') {
            // On Windows, use taskkill to ensure child processes are also killed
            spawn('taskkill', ['/pid', ollamaProcess.pid, '/f', '/t'], { windowsHide: true });
        } else {
            ollamaProcess.kill('SIGTERM');
        }
        
        ollamaProcess = null;
    }
    
    serverReady = false;
    isStarting = false;
    usingBundled = false;
}

// Initialize - check if Ollama is available (either bundled or system)
async function initialize(onProgress) {
    if (onProgress) onProgress({ status: 'checking', message: 'Checking for Ollama...' });
    
    // First check if server is already running (system Ollama)
    serverReady = await isServerRunning();
    
    if (serverReady) {
        if (onProgress) onProgress({ status: 'ready', message: 'Ollama server detected' });
        return { success: true, source: 'system' };
    }
    
    // Check if we have bundled Ollama
    if (hasBundledOllama()) {
        if (onProgress) {
            onProgress({ 
                status: 'available', 
                message: 'Bundled Ollama available. Click "Start Server" to begin.' 
            });
        }
        return { success: true, source: 'bundled', needsStart: true };
    }
    
    // No Ollama available
    if (onProgress) {
        onProgress({ 
            status: 'info', 
            message: 'Ollama not available. Use local GGUF models or install Ollama.' 
        });
    }
    return { success: false, optional: true, message: 'Ollama not available' };
}

module.exports = {
    initialize,
    startServer,
    stopServer,
    getStatus,
    isServerRunning,
    hasBundledOllama,
    getBundledOllamaPath
};
