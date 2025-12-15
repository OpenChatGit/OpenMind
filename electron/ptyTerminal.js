// PTY Terminal Manager - Real terminal using node-pty
const pty = require('@homebridge/node-pty-prebuilt-multiarch');
const os = require('os');

let ptyProcess = null;
let mainWindow = null;

// Get default shell based on OS
function getDefaultShell() {
    if (process.platform === 'win32') {
        // Prefer PowerShell on Windows for better compatibility
        return 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
}

// Initialize PTY terminal
function createPty(window, options = {}) {
    mainWindow = window;
    
    // Kill existing process if any
    if (ptyProcess) {
        try {
            ptyProcess.kill();
        } catch (e) {
            console.log('Error killing existing PTY:', e.message);
        }
        ptyProcess = null;
    }
    
    const shell = options.shell || getDefaultShell();
    const cwd = options.cwd || os.homedir();
    
    // Determine shell args based on shell type
    let shellArgs = [];
    if (process.platform === 'win32') {
        if (shell.toLowerCase().includes('powershell')) {
            // Add aliases for common Unix commands
            shellArgs = [
                '-NoLogo', 
                '-NoExit',
                '-Command',
                // Set up aliases for Unix compatibility
                'Set-Alias -Name clear -Value Clear-Host -Option AllScope; ' +
                'Set-Alias -Name ls -Value Get-ChildItem -Option AllScope; ' +
                'Set-Alias -Name cat -Value Get-Content -Option AllScope; ' +
                'Set-Alias -Name rm -Value Remove-Item -Option AllScope; ' +
                'Set-Alias -Name cp -Value Copy-Item -Option AllScope; ' +
                'Set-Alias -Name mv -Value Move-Item -Option AllScope; ' +
                'Set-Alias -Name pwd -Value Get-Location -Option AllScope; ' +
                'Set-Alias -Name touch -Value New-Item -Option AllScope; ' +
                'function which($cmd) { Get-Command $cmd -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source }; ' +
                'Clear-Host'
            ];
        } else if (shell.toLowerCase().includes('cmd')) {
            shellArgs = ['/K'];
        }
    } else {
        shellArgs = [];
    }
    
    try {
        const cols = Math.max(options.cols || 80, 20);
        const rows = Math.max(options.rows || 10, 4);
        
        ptyProcess = pty.spawn(shell, shellArgs, {
            name: 'xterm-256color',
            cols: cols,
            rows: rows,
            cwd: cwd,
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                // Force English output on Windows
                LANG: 'en_US.UTF-8',
                LC_ALL: 'en_US.UTF-8'
            },
            useConpty: true // Use Windows ConPTY for better compatibility
        });
        
        // Forward PTY output to renderer
        ptyProcess.onData((data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('pty-data', data);
            }
        });
        
        // Handle PTY exit
        ptyProcess.onExit(({ exitCode, signal }) => {
            console.log(`PTY exited with code ${exitCode}, signal ${signal}`);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('pty-exit', { exitCode, signal });
            }
            ptyProcess = null;
        });
        
        console.log(`PTY created: ${shell} (${cols}x${rows}) in ${cwd}`);
        return { success: true, shell, cwd };
        
    } catch (error) {
        console.error('Failed to create PTY:', error);
        return { success: false, error: error.message };
    }
}

// Write data to PTY (user input)
function writeToPty(data) {
    if (ptyProcess) {
        ptyProcess.write(data);
        return true;
    }
    return false;
}

// Resize PTY
function resizePty(cols, rows) {
    if (ptyProcess) {
        try {
            ptyProcess.resize(cols, rows);
            return true;
        } catch (error) {
            console.error('Failed to resize PTY:', error);
        }
    }
    return false;
}

// Kill PTY process
function killPty() {
    if (ptyProcess) {
        try {
            // On Windows, we need to kill the process tree
            if (process.platform === 'win32') {
                const pid = ptyProcess.pid;
                // Kill the process tree using taskkill
                require('child_process').exec(`taskkill /pid ${pid} /T /F`, (err) => {
                    if (err) {
                        console.log('taskkill error (may be already dead):', err.message);
                    }
                });
            }
            // Also call the normal kill
            ptyProcess.kill();
        } catch (e) {
            console.log('Error killing PTY:', e.message);
        }
        ptyProcess = null;
        return true;
    }
    return false;
}

// Check if PTY is running
function isPtyRunning() {
    return ptyProcess !== null;
}

// Get PTY info
function getPtyInfo() {
    if (ptyProcess) {
        return {
            running: true,
            pid: ptyProcess.pid
        };
    }
    return { running: false };
}

module.exports = {
    createPty,
    writeToPty,
    resizePty,
    killPty,
    isPtyRunning,
    getPtyInfo
};
