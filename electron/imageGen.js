/**
 * Image Generation Handler
 * Manages Python diffusers process for local image generation
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

let pythonProcess = null;
let messageCallback = null;
let isReady = false;
let currentModel = null;

/**
 * Get the Python executable path (prefers local venv)
 */
function getPythonPath() {
    // Check for local venv first
    const venvPaths = process.platform === 'win32'
        ? [
            path.join(__dirname, '..', 'python', '.venv', 'Scripts', 'python.exe'),
            path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe')
          ]
        : [
            path.join(__dirname, '..', 'python', '.venv', 'bin', 'python'),
            path.join(__dirname, '..', '.venv', 'bin', 'python')
          ];
    
    for (const venvPath of venvPaths) {
        if (fs.existsSync(venvPath)) {
            return venvPath;
        }
    }
    
    // Fall back to system Python
    return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Start the Python image generation process
 */
function startProcess() {
    return new Promise((resolve, reject) => {
        if (pythonProcess) {
            resolve(true);
            return;
        }

        const scriptPath = path.join(__dirname, '..', 'python', 'image_gen.py');
        
        // Use local venv if available, otherwise system Python
        const pythonCmd = getPythonPath();
        
        console.log('Starting image generation process...');
        console.log('Using Python:', pythonCmd);
        
        pythonProcess = spawn(pythonCmd, [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const rl = readline.createInterface({
            input: pythonProcess.stdout,
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            try {
                const data = JSON.parse(line);
                
                if (data.type === 'ready') {
                    isReady = true;
                    console.log('Image generation process ready');
                    if (data.cuda_available) {
                        console.log('  GPU available:', data.gpu_info);
                    } else {
                        console.log('  GPU not available:', data.gpu_info);
                    }
                    resolve(true);
                } else if (data.type === 'error' && data.install_cmd) {
                    // Missing dependencies
                    console.error('Missing Python dependencies:', data.error);
                    reject(new Error(data.error));
                } else if (messageCallback) {
                    messageCallback(data);
                }
            } catch (e) {
                console.error('Failed to parse Python output:', line);
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            // Filter out progress bars and info messages
            if (!msg.includes('Loading pipeline') && !msg.includes('%|')) {
                console.error('Python stderr:', msg);
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python process:', err);
            pythonProcess = null;
            isReady = false;
            reject(err);
        });

        pythonProcess.on('close', (code) => {
            console.log('Python process exited with code:', code);
            pythonProcess = null;
            isReady = false;
            currentModel = null;
        });

        // Timeout for startup
        setTimeout(() => {
            if (!isReady) {
                reject(new Error('Python process startup timeout'));
            }
        }, 30000);
    });
}

/**
 * Send command to Python process
 */
function sendCommand(cmd) {
    if (!pythonProcess || !isReady) {
        throw new Error('Image generation process not running');
    }
    pythonProcess.stdin.write(JSON.stringify(cmd) + '\n');
}

/**
 * Load a diffusion model (from HuggingFace or local path)
 * @param {string} modelId - HuggingFace model ID or display name
 * @param {string} localPath - Optional local path to model directory
 * @param {function} onProgress - Progress callback
 */
async function loadModel(modelId, localPath = null, onProgress = null) {
    // Handle case where localPath is actually the callback (backwards compat)
    if (typeof localPath === 'function') {
        onProgress = localPath;
        localPath = null;
    }
    
    await startProcess();
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Model loading timeout'));
        }, 300000); // 5 min timeout for large models

        messageCallback = (data) => {
            if (data.type === 'progress' && onProgress) {
                onProgress(data.message, data.progress);
            } else if (data.type === 'loaded') {
                clearTimeout(timeout);
                currentModel = data.model;
                resolve({ success: true, model: data.model, localPath: data.local_path });
            } else if (data.type === 'error') {
                clearTimeout(timeout);
                reject(new Error(data.error));
            }
        };

        sendCommand({ action: 'load', model: modelId, local_path: localPath });
    });
}

/**
 * Generate an image
 */
async function generateImage(params, onProgress) {
    if (!isReady) {
        await startProcess();
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Image generation timeout'));
        }, 600000); // 10 min timeout for CPU generation

        messageCallback = (data) => {
            if (data.type === 'progress' && onProgress) {
                onProgress(data.message, data.progress);
            } else if (data.type === 'result') {
                clearTimeout(timeout);
                resolve(data);
            } else if (data.type === 'error') {
                clearTimeout(timeout);
                reject(new Error(data.error));
            }
        };

        sendCommand({
            action: 'generate',
            prompt: params.prompt,
            negative_prompt: params.negativePrompt || '',
            width: params.width || 512,
            height: params.height || 512,
            steps: params.steps || 20,
            guidance: params.guidance || 7.5,
            seed: params.seed
        });
    });
}

/**
 * Unload current model to free memory
 */
async function unloadModel() {
    if (!pythonProcess || !isReady) return;
    
    return new Promise((resolve) => {
        messageCallback = (data) => {
            if (data.type === 'unloaded') {
                currentModel = null;
                resolve({ success: true });
            }
        };
        sendCommand({ action: 'unload' });
    });
}

/**
 * Get current status
 */
function getStatus() {
    return {
        running: isReady,
        currentModel: currentModel
    };
}

/**
 * Stop the Python process
 */
function stopProcess() {
    if (pythonProcess) {
        try {
            sendCommand({ action: 'quit' });
        } catch (e) {
            // Ignore
        }
        pythonProcess.kill();
        pythonProcess = null;
        isReady = false;
        currentModel = null;
    }
}

/**
 * Check if Python and dependencies are available
 */
async function checkPythonSetup() {
    const { spawnSync } = require('child_process');
    
    // Try local venv first, then system Python
    let pythonCmd = getPythonPath();
    
    // Verify Python works
    try {
        const result = spawnSync(pythonCmd, ['--version'], { encoding: 'utf8', timeout: 5000 });
        if (result.status !== 0) {
            // Try system Python as fallback
            const fallbackCmds = process.platform === 'win32' 
                ? ['python', 'python3', 'py'] 
                : ['python3', 'python'];
            
            pythonCmd = null;
            for (const cmd of fallbackCmds) {
                try {
                    const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', timeout: 5000 });
                    if (r.status === 0) {
                        pythonCmd = cmd;
                        break;
                    }
                } catch (e) {}
            }
        }
    } catch (e) {
        pythonCmd = null;
    }
    
    if (!pythonCmd) {
        return { 
            available: false, 
            error: 'Python not found',
            installCmd: 'Install Python 3.8+ from python.org'
        };
    }
    
    try {
        // Check each package individually (more reliable on Windows)
        const packages = ['torch', 'diffusers', 'transformers', 'accelerate'];
        const missing = [];
        
        for (const pkg of packages) {
            const result = spawnSync(pythonCmd, ['-c', `import ${pkg}`], { 
                encoding: 'utf8', 
                timeout: 60000  // 60 seconds - some packages are slow to import
            });
            if (result.status !== 0) {
                missing.push(pkg);
            }
        }
        
        if (missing.length === 0) {
            return { available: true, pythonCmd: pythonCmd };
        } else {
            return { 
                available: false, 
                missing: missing,
                installCmd: `pip install ${missing.join(' ')}`,
                pythonCmd: pythonCmd
            };
        }
    } catch (e) {
        return { 
            available: false, 
            error: `Python check failed: ${e.message}`,
            installCmd: 'pip install torch diffusers transformers accelerate safetensors',
            pythonCmd: pythonCmd
        };
    }
}

module.exports = {
    startProcess,
    loadModel,
    generateImage,
    unloadModel,
    getStatus,
    stopProcess,
    checkPythonSetup
};
