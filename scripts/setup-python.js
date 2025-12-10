#!/usr/bin/env node
/**
 * Setup script for Python dependencies (image generation)
 * Automatically detects CUDA and installs GPU-accelerated packages
 * 
 * Uses prebuilt wheels where available - no compilation needed!
 * 
 * Run with: node scripts/setup-python.js
 * Force CPU only: node scripts/setup-python.js --cpu
 * Force reinstall: node scripts/setup-python.js --force
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_DIR = path.join(__dirname, '..', 'python');
const VENV_DIR = path.join(PYTHON_DIR, '.venv');

// Prebuilt wheels repository for stable-diffusion-cpp with CUDA
// https://github.com/jllllll/stable-diffusion-cpp-python-cuBLAS-wheels
const PREBUILT_WHEELS_URL = 'https://github.com/jllllll/stable-diffusion-cpp-python-cuBLAS-wheels/releases/download/wheels';

function getPythonCmd() {
    const venvPython = process.platform === 'win32' 
        ? path.join(VENV_DIR, 'Scripts', 'python.exe')
        : path.join(VENV_DIR, 'bin', 'python');
    
    if (fs.existsSync(venvPython)) return venvPython;
    
    try {
        execSync('python3 --version', { stdio: 'pipe' });
        return 'python3';
    } catch {
        try {
            execSync('python --version', { stdio: 'pipe' });
            return 'python';
        } catch {
            return null;
        }
    }
}

function checkNvidiaGpu() {
    try {
        const output = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', { 
            encoding: 'utf8', stdio: 'pipe' 
        });
        const info = output.trim().split('\n')[0]?.trim();
        return info ? { found: true, info } : { found: false };
    } catch {
        return { found: false };
    }
}

function checkCudaVersion() {
    // Check CUDA version from nvidia-smi (more reliable than nvcc)
    try {
        const output = execSync('nvidia-smi', { encoding: 'utf8', stdio: 'pipe' });
        const match = output.match(/CUDA Version:\s*(\d+)\.(\d+)/);
        if (match) {
            return { major: parseInt(match[1]), minor: parseInt(match[2]) };
        }
    } catch {}
    
    // Fallback to nvcc
    try {
        const output = execSync('nvcc --version', { encoding: 'utf8', stdio: 'pipe' });
        const match = output.match(/release (\d+)\.(\d+)/);
        if (match) {
            return { major: parseInt(match[1]), minor: parseInt(match[2]) };
        }
    } catch {}
    
    return null;
}

function checkPackage(pythonCmd, pkg) {
    try {
        execSync(`"${pythonCmd}" -c "import ${pkg}"`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function checkTorchCuda(pythonCmd) {
    try {
        const result = execSync(
            `"${pythonCmd}" -c "import torch; print(torch.cuda.is_available())"`,
            { encoding: 'utf8', stdio: 'pipe' }
        ).trim();
        return result === 'True';
    } catch {
        return false;
    }
}

function checkSdCppCuda(pythonCmd) {
    try {
        const result = execSync(
            `"${pythonCmd}" -c "from stable_diffusion_cpp import sd_get_system_info; info = str(sd_get_system_info()).upper(); print('CUDA' in info or 'CUBLAS' in info)"`,
            { encoding: 'utf8', stdio: 'pipe' }
        ).trim();
        return result === 'True';
    } catch {
        return false;
    }
}

function createVenv(pythonCmd) {
    console.log('\n📦 Creating Python virtual environment...');
    try {
        execSync(`"${pythonCmd}" -m venv "${VENV_DIR}"`, { stdio: 'inherit' });
        return true;
    } catch (e) {
        console.error('Failed to create venv:', e.message);
        return false;
    }
}

async function runPip(pythonCmd, args, env = process.env) {
    return new Promise((resolve) => {
        console.log(`\n> pip ${args.join(' ')}\n`);
        const proc = spawn(pythonCmd, ['-m', 'pip', ...args], { stdio: 'inherit', env });
        proc.on('close', (code) => resolve(code === 0));
    });
}

function getCudaTag(cudaVersion) {
    if (!cudaVersion) return null;
    const { major, minor } = cudaVersion;
    
    // PyTorch CUDA tags
    if (major >= 12 && minor >= 4) return 'cu124';
    if (major >= 12) return 'cu121';
    if (major >= 11 && minor >= 8) return 'cu118';
    return 'cu118';
}

async function main() {
    const args = process.argv.slice(2);
    const forceCpu = args.includes('--cpu');
    const forceReinstall = args.includes('--force');
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║        OpenMind - Python Setup for Image Generation        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Detect GPU and CUDA
    const gpu = checkNvidiaGpu();
    const cudaVersion = checkCudaVersion();
    const useCuda = gpu.found && !forceCpu;
    
    if (gpu.found) {
        console.log(`✓ NVIDIA GPU: ${gpu.info}`);
        if (cudaVersion) {
            console.log(`✓ CUDA ${cudaVersion.major}.${cudaVersion.minor} detected`);
        }
    } else {
        console.log('ℹ No NVIDIA GPU detected - using CPU mode');
    }
    
    if (forceCpu) console.log('ℹ CPU mode forced via --cpu flag');
    
    // Setup Python venv
    let pythonCmd = getPythonCmd();
    if (!pythonCmd) {
        console.error('\n❌ Python not found! Install Python 3.8+ from https://python.org');
        process.exit(1);
    }
    
    const venvPython = process.platform === 'win32' 
        ? path.join(VENV_DIR, 'Scripts', 'python.exe')
        : path.join(VENV_DIR, 'bin', 'python');
    
    if (!fs.existsSync(venvPython)) {
        if (!createVenv(pythonCmd)) {
            console.error('❌ Failed to create virtual environment');
            process.exit(1);
        }
    }
    pythonCmd = venvPython;
    
    const version = execSync(`"${pythonCmd}" --version`, { encoding: 'utf8' }).trim();
    console.log(`✓ ${version} (venv)\n`);
    
    // Ensure pip is available
    try {
        execSync(`"${pythonCmd}" -m pip --version`, { stdio: 'pipe' });
    } catch {
        console.log('Installing pip...');
        execSync(`"${pythonCmd}" -m ensurepip --upgrade`, { stdio: 'inherit' });
    }
    
    // Upgrade pip
    await runPip(pythonCmd, ['install', '--upgrade', 'pip']);
    
    // ═══════════════════════════════════════════════════════════════
    // Install PyTorch
    // ═══════════════════════════════════════════════════════════════
    const torchInstalled = checkPackage(pythonCmd, 'torch');
    const torchHasCuda = torchInstalled ? checkTorchCuda(pythonCmd) : false;
    
    if (!torchInstalled || (useCuda && !torchHasCuda) || forceReinstall) {
        // Uninstall existing
        if (torchInstalled) {
            await runPip(pythonCmd, ['uninstall', 'torch', 'torchvision', 'torchaudio', '-y']);
        }
        
        if (useCuda && cudaVersion) {
            const cudaTag = getCudaTag(cudaVersion);
            console.log(`\n🎮 Installing PyTorch with CUDA (${cudaTag})...`);
            await runPip(pythonCmd, [
                'install', 'torch', 'torchvision', 'torchaudio',
                '--index-url', `https://download.pytorch.org/whl/${cudaTag}`
            ]);
        } else {
            console.log('\n📦 Installing PyTorch (CPU)...');
            await runPip(pythonCmd, ['install', 'torch', 'torchvision', 'torchaudio']);
        }
    } else {
        console.log(`✓ PyTorch already installed ${torchHasCuda ? '(CUDA)' : '(CPU)'}`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Install Diffusers and dependencies
    // ═══════════════════════════════════════════════════════════════
    const diffusersPkgs = ['diffusers', 'transformers', 'accelerate', 'safetensors'];
    const missingPkgs = diffusersPkgs.filter(pkg => !checkPackage(pythonCmd, pkg));
    
    if (missingPkgs.length > 0 || forceReinstall) {
        console.log(`\n📦 Installing: ${missingPkgs.length > 0 ? missingPkgs.join(', ') : 'diffusers packages'}...`);
        await runPip(pythonCmd, ['install', ...diffusersPkgs]);
    } else {
        console.log('✓ Diffusers packages installed');
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Install stable-diffusion-cpp-python (for GGUF models)
    // Uses prebuilt wheels with CUDA support!
    // ═══════════════════════════════════════════════════════════════
    const sdCppInstalled = checkPackage(pythonCmd, 'stable_diffusion_cpp');
    const sdCppHasCuda = sdCppInstalled ? checkSdCppCuda(pythonCmd) : false;
    
    if (!sdCppInstalled || (useCuda && !sdCppHasCuda) || forceReinstall) {
        if (sdCppInstalled) {
            await runPip(pythonCmd, ['uninstall', 'stable-diffusion-cpp-python', '-y']);
        }
        
        if (useCuda && cudaVersion) {
            // Try prebuilt CUDA wheel first
            console.log('\n🎮 Installing stable-diffusion-cpp with CUDA (prebuilt)...');
            
            // Determine wheel URL based on CUDA version
            // Available: cu121, cu122, cu123, cu124
            let cuVer = `cu${cudaVersion.major}${cudaVersion.minor}`;
            if (cudaVersion.major === 12) {
                if (cudaVersion.minor >= 4) cuVer = 'cu124';
                else if (cudaVersion.minor >= 3) cuVer = 'cu123';
                else if (cudaVersion.minor >= 2) cuVer = 'cu122';
                else cuVer = 'cu121';
            } else if (cudaVersion.major === 11) {
                cuVer = 'cu121'; // Fallback to cu121 for CUDA 11.x
            }
            
            // Try installing from prebuilt wheels repo
            const success = await runPip(pythonCmd, [
                'install', 'stable-diffusion-cpp-python',
                '--extra-index-url', `${PREBUILT_WHEELS_URL}/${cuVer}`,
                '--prefer-binary'
            ]);
            
            if (!success || !checkSdCppCuda(pythonCmd)) {
                console.log('⚠ Prebuilt CUDA wheel not available, installing CPU version...');
                await runPip(pythonCmd, ['install', 'stable-diffusion-cpp-python']);
            }
        } else {
            console.log('\n📦 Installing stable-diffusion-cpp (CPU)...');
            await runPip(pythonCmd, ['install', 'stable-diffusion-cpp-python']);
        }
    } else {
        console.log(`✓ stable-diffusion-cpp installed ${sdCppHasCuda ? '(CUDA)' : '(CPU)'}`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Final Status
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    console.log('                      SETUP COMPLETE');
    console.log('═'.repeat(60));
    
    const finalTorchCuda = checkTorchCuda(pythonCmd);
    const finalSdCppCuda = checkSdCppCuda(pythonCmd);
    
    console.log(`\n  PyTorch:              ${finalTorchCuda ? '✅ GPU (CUDA)' : '⚠️  CPU only'}`);
    console.log(`  stable-diffusion-cpp: ${finalSdCppCuda ? '✅ GPU (CUDA)' : '⚠️  CPU only'}`);
    
    if (gpu.found && !finalTorchCuda) {
        console.log('\n💡 PyTorch CUDA not working. Try:');
        console.log('   node scripts/setup-python.js --force');
    }
    
    if (gpu.found && !finalSdCppCuda) {
        console.log('\n💡 GGUF CUDA not available. GGUF models will use CPU.');
        console.log('   (Diffusers models still use GPU via PyTorch)');
    }
    
    console.log('\n✨ Ready for image generation!\n');
}

main().catch(console.error);
