/**
 * Setup script for LLMLingua prompt compression
 * Downloads and initializes the LLMLingua model
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_DIR = path.join(__dirname, '..', 'python');
const VENV_DIR = path.join(PYTHON_DIR, '.venv');
const MODELS_CACHE_DIR = path.join(__dirname, '..', 'models', 'llmlingua');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function getPythonCmd() {
    const isWin = process.platform === 'win32';
    const venvPython = isWin 
        ? path.join(VENV_DIR, 'Scripts', 'python.exe')
        : path.join(VENV_DIR, 'bin', 'python');
    
    if (fs.existsSync(venvPython)) {
        return venvPython;
    }
    
    // Try system python
    const commands = isWin ? ['python', 'python3', 'py'] : ['python3', 'python'];
    for (const cmd of commands) {
        try {
            execSync(`${cmd} --version`, { stdio: 'ignore' });
            return cmd;
        } catch {
            continue;
        }
    }
    return null;
}

function ensureModelCacheDir() {
    if (!fs.existsSync(MODELS_CACHE_DIR)) {
        fs.mkdirSync(MODELS_CACHE_DIR, { recursive: true });
        log(`✓ Created model cache directory: ${MODELS_CACHE_DIR}`, 'green');
    }
}

async function installLLMLingua(pythonCmd) {
    log('\n📦 Installing LLMLingua...', 'cyan');
    
    return new Promise((resolve, reject) => {
        const proc = spawn(pythonCmd, ['-m', 'pip', 'install', 'llmlingua', '--quiet'], {
            stdio: 'inherit'
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                log('✓ LLMLingua installed', 'green');
                resolve();
            } else {
                reject(new Error('Failed to install LLMLingua'));
            }
        });
        
        proc.on('error', reject);
    });
}

async function downloadModel(pythonCmd) {
    log('\n📥 Downloading LLMLingua-2 model (this may take a few minutes)...', 'cyan');
    log('   Model: microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank (~500MB)', 'yellow');
    
    // Set cache directory for HuggingFace
    const cacheDir = MODELS_CACHE_DIR.replace(/\\/g, '/');
    
    const downloadScript = `
import sys
import os

# Set HuggingFace cache to our models folder
os.environ['HF_HOME'] = '${cacheDir}'
os.environ['TRANSFORMERS_CACHE'] = '${cacheDir}'

try:
    from llmlingua import PromptCompressor
    print("Downloading LLMLingua-2 model to: ${cacheDir}")
    print("This will download ~500MB on first run...")
    
    compressor = PromptCompressor(
        model_name="microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
        use_llmlingua2=True,
        device_map="cpu"
    )
    
    # Test compression to verify
    test_text = "This is a test prompt to verify the model works correctly."
    result = compressor.compress_prompt(test_text)
    
    print("")
    print("✓ Model downloaded and verified!")
    print(f"  Test: {len(test_text)} chars -> {len(result['compressed_prompt'])} chars")
    print(f"  Compression ratio: {len(result['compressed_prompt'])/len(test_text)*100:.1f}%")
    
except ImportError:
    print("ERROR: LLMLingua not installed")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;
    
    return new Promise((resolve, reject) => {
        const proc = spawn(pythonCmd, ['-c', downloadScript], {
            stdio: 'inherit',
            env: {
                ...process.env,
                HF_HOME: MODELS_CACHE_DIR,
                TRANSFORMERS_CACHE: MODELS_CACHE_DIR
            }
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                log('✓ Model ready!', 'green');
                resolve();
            } else {
                reject(new Error('Failed to download model'));
            }
        });
        
        proc.on('error', reject);
    });
}

async function checkModelExists() {
    // Check if model files exist in cache
    if (!fs.existsSync(MODELS_CACHE_DIR)) return false;
    
    const files = fs.readdirSync(MODELS_CACHE_DIR, { recursive: true });
    // Look for model files (pytorch_model.bin or model.safetensors)
    return files.some(f => 
        f.includes('pytorch_model') || 
        f.includes('model.safetensors') ||
        f.includes('llmlingua')
    );
}

async function main() {
    log('🔧 LLMLingua Setup', 'cyan');
    log('==================\n', 'cyan');
    
    // Ensure model cache directory exists
    ensureModelCacheDir();
    
    // Find Python
    const pythonCmd = getPythonCmd();
    if (!pythonCmd) {
        log('❌ Python not found! Please install Python 3.8+', 'red');
        process.exit(1);
    }
    log(`✓ Using Python: ${pythonCmd}`, 'green');
    
    try {
        // Check if LLMLingua is already installed
        try {
            execSync(`${pythonCmd} -c "import llmlingua"`, { stdio: 'ignore' });
            log('✓ LLMLingua already installed', 'green');
        } catch {
            await installLLMLingua(pythonCmd);
        }
        
        // Check if model already downloaded
        const modelExists = await checkModelExists();
        if (modelExists) {
            log('✓ Model already downloaded', 'green');
            log('  Verifying model...', 'yellow');
        }
        
        // Download/verify model
        await downloadModel(pythonCmd);
        
        log('\n✅ LLMLingua setup complete!', 'green');
        log('   Prompt compression is now available.', 'green');
        log(`   Model cached at: ${MODELS_CACHE_DIR}\n`, 'cyan');
        
    } catch (error) {
        log(`\n❌ Setup failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

main();
