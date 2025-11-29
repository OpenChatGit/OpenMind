#!/usr/bin/env node
/**
 * Setup script for Python dependencies (image generation)
 * Run with: node scripts/setup-python.js
 * For CUDA support: node scripts/setup-python.js --cuda
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const REQUIRED_PACKAGES = ['torch', 'diffusers', 'transformers', 'accelerate', 'safetensors'];

function getPythonCmd() {
    // Try python3 first (Linux/Mac), then python (Windows)
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

function getPipCmd(pythonCmd) {
    // Use python -m pip for reliability
    return `${pythonCmd} -m pip`;
}

function checkPackage(pythonCmd, pkg) {
    try {
        execSync(`${pythonCmd} -c "import ${pkg}"`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function checkCudaAvailable() {
    // Check if NVIDIA CUDA toolkit is installed
    try {
        const nvccOutput = execSync('nvcc --version', { encoding: 'utf8', stdio: 'pipe' });
        const match = nvccOutput.match(/release (\d+\.\d+)/);
        return match ? match[1] : true;
    } catch {
        return false;
    }
}

function checkSdCppCuda(pythonCmd) {
    // Check if stable-diffusion-cpp-python is compiled with CUDA
    try {
        const result = execSync(
            `${pythonCmd} -c "from stable_diffusion_cpp import sd_get_system_info; info = sd_get_system_info(); print('CUDA' in str(info).upper() or 'CUBLAS' in str(info).upper())"`,
            { encoding: 'utf8', stdio: 'pipe' }
        ).trim();
        return result === 'True';
    } catch {
        return false;
    }
}

async function installSdCppWithCuda(pythonCmd) {
    console.log('\n🔧 Installing stable-diffusion-cpp-python with CUDA support...');
    console.log('   This requires CUDA toolkit and CMake to be installed.\n');
    
    // First uninstall existing version
    try {
        console.log('   Removing existing installation...');
        execSync(`${pythonCmd} -m pip uninstall stable-diffusion-cpp-python -y`, { stdio: 'pipe' });
    } catch {
        // Ignore if not installed
    }
    
    // Install with CUDA support
    // Use SD_CUDA=ON for stable-diffusion-cpp-python
    console.log('   Building with CUDA (SD_CUDA=ON)...');
    console.log('   This may take 5-10 minutes...\n');
    
    const installProcess = spawn(pythonCmd, [
        '-m', 'pip', 'install',
        'stable-diffusion-cpp-python',
        '--force-reinstall',
        '--no-cache-dir',
        '-v'
    ], {
        stdio: 'inherit',
        env: {
            ...process.env,
            CMAKE_ARGS: '-DSD_CUDA=ON'
        }
    });
    
    return new Promise((resolve) => {
        installProcess.on('close', (code) => {
            resolve(code === 0);
        });
    });
}

async function main() {
    const args = process.argv.slice(2);
    const installCuda = args.includes('--cuda');
    const forceReinstall = args.includes('--force');
    
    console.log('🔧 OpenMind Python Setup\n');
    
    if (installCuda) {
        console.log('🎮 CUDA mode enabled - will install GPU support for GGUF models\n');
    }
    
    // Check Python
    const pythonCmd = getPythonCmd();
    if (!pythonCmd) {
        console.error('❌ Python not found!');
        console.log('\nPlease install Python 3.8+ from https://python.org');
        process.exit(1);
    }
    
    const version = execSync(`${pythonCmd} --version`, { encoding: 'utf8' }).trim();
    console.log(`✓ Found ${version}`);
    
    // Check CUDA availability
    const cudaVersion = checkCudaAvailable();
    if (cudaVersion) {
        console.log(`✓ CUDA toolkit found (version ${cudaVersion})`);
    } else {
        console.log('⚠ CUDA toolkit not found (nvcc not in PATH)');
        if (installCuda) {
            console.log('\n❌ Cannot install CUDA support without CUDA toolkit!');
            console.log('   Please install NVIDIA CUDA Toolkit first:');
            console.log('   https://developer.nvidia.com/cuda-downloads\n');
            console.log('   Make sure nvcc is in your PATH after installation.');
            process.exit(1);
        }
    }
    
    // Check packages
    console.log('\nChecking required packages...');
    const missing = [];
    
    for (const pkg of REQUIRED_PACKAGES) {
        const installed = checkPackage(pythonCmd, pkg);
        if (installed) {
            console.log(`  ✓ ${pkg}`);
        } else {
            console.log(`  ✗ ${pkg} (missing)`);
            missing.push(pkg);
        }
    }
    
    // Check stable-diffusion-cpp-python
    const sdCppInstalled = checkPackage(pythonCmd, 'stable_diffusion_cpp');
    const sdCppHasCuda = sdCppInstalled ? checkSdCppCuda(pythonCmd) : false;
    
    if (sdCppInstalled) {
        if (sdCppHasCuda) {
            console.log(`  ✓ stable-diffusion-cpp-python (CUDA enabled)`);
        } else {
            console.log(`  ⚠ stable-diffusion-cpp-python (CPU only - no CUDA)`);
        }
    } else {
        console.log(`  ✗ stable-diffusion-cpp-python (not installed)`);
    }
    
    // Install missing base packages first
    if (missing.length > 0) {
        console.log(`\n📦 Installing ${missing.length} missing package(s)...`);
        console.log('   This may take a few minutes (especially torch).\n');
        
        const pipCmd = getPipCmd(pythonCmd);
        const installCmd = `${pipCmd} install ${missing.join(' ')}`;
        
        console.log(`Running: ${installCmd}\n`);
        
        try {
            execSync(`${pythonCmd} -m pip install ${missing.join(' ')}`, { stdio: 'inherit' });
            console.log('\n✅ Base packages installed!');
        } catch (error) {
            console.error('❌ Installation failed:', error.message);
            console.log('\nTry installing manually:');
            console.log(`  ${installCmd}`);
            process.exit(1);
        }
    }
    
    // Handle stable-diffusion-cpp-python with CUDA
    if (installCuda || forceReinstall) {
        if (!sdCppHasCuda || forceReinstall) {
            const success = await installSdCppWithCuda(pythonCmd);
            if (success) {
                // Verify CUDA support
                const nowHasCuda = checkSdCppCuda(pythonCmd);
                if (nowHasCuda) {
                    console.log('\n✅ stable-diffusion-cpp-python installed with CUDA support!');
                } else {
                    console.log('\n⚠ Installation completed but CUDA support not detected.');
                    console.log('   This might be a build issue. Check the output above for errors.');
                    console.log('\n   Manual installation:');
                    console.log('   set CMAKE_ARGS=-DSD_CUBLAS=ON');
                    console.log('   pip install stable-diffusion-cpp-python --force-reinstall --no-cache-dir');
                }
            } else {
                console.log('\n❌ Failed to install stable-diffusion-cpp-python with CUDA.');
                console.log('\n   Prerequisites:');
                console.log('   1. NVIDIA CUDA Toolkit (nvcc in PATH)');
                console.log('   2. CMake (cmake in PATH)');
                console.log('   3. Visual Studio Build Tools (Windows) or GCC (Linux)');
                console.log('\n   Manual installation:');
                console.log('   set CMAKE_ARGS=-DSD_CUBLAS=ON');
                console.log('   pip install stable-diffusion-cpp-python --force-reinstall --no-cache-dir -v');
            }
        } else {
            console.log('\n✅ stable-diffusion-cpp-python already has CUDA support!');
        }
    } else if (!sdCppInstalled) {
        // Install without CUDA (CPU only)
        console.log('\n📦 Installing stable-diffusion-cpp-python (CPU only)...');
        console.log('   For GPU support, run: node scripts/setup-python.js --cuda\n');
        
        try {
            execSync(`${pythonCmd} -m pip install stable-diffusion-cpp-python`, { stdio: 'inherit' });
            console.log('\n✅ stable-diffusion-cpp-python installed (CPU only)');
        } catch {
            console.log('\n⚠ Could not install stable-diffusion-cpp-python');
            console.log('   GGUF model support will not be available.');
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Setup complete!\n');
    
    if (!installCuda && cudaVersion && !sdCppHasCuda) {
        console.log('💡 Tip: You have CUDA installed. For GPU-accelerated GGUF models, run:');
        console.log('   node scripts/setup-python.js --cuda\n');
    }
}

main();
