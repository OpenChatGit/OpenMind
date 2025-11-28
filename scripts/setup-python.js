#!/usr/bin/env node
/**
 * Setup script for Python dependencies (image generation)
 * Run with: node scripts/setup-python.js
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

async function main() {
    console.log('🔧 OpenMind Python Setup\n');
    
    // Check Python
    const pythonCmd = getPythonCmd();
    if (!pythonCmd) {
        console.error('❌ Python not found!');
        console.log('\nPlease install Python 3.8+ from https://python.org');
        process.exit(1);
    }
    
    const version = execSync(`${pythonCmd} --version`, { encoding: 'utf8' }).trim();
    console.log(`✓ Found ${version}`);
    
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
    
    if (missing.length === 0) {
        console.log('\n✅ All dependencies installed! Image generation is ready.');
        return;
    }
    
    // Install missing packages
    console.log(`\n📦 Installing ${missing.length} missing package(s)...`);
    console.log('   This may take a few minutes (especially torch).\n');
    
    const pipCmd = getPipCmd(pythonCmd);
    const installCmd = `${pipCmd} install ${missing.join(' ')}`;
    
    console.log(`Running: ${installCmd}\n`);
    
    try {
        // Use spawn for real-time output
        const child = spawn(pythonCmd, ['-m', 'pip', 'install', ...missing], {
            stdio: 'inherit'
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log('\n✅ Installation complete! Image generation is ready.');
            } else {
                console.error(`\n❌ Installation failed with code ${code}`);
                console.log('\nTry installing manually:');
                console.log(`  ${installCmd}`);
            }
        });
    } catch (error) {
        console.error('❌ Installation failed:', error.message);
        console.log('\nTry installing manually:');
        console.log(`  ${installCmd}`);
    }
}

main();
