import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// Custom scrollbar styles for terminal
const terminalStyles = `
  .xterm-viewport::-webkit-scrollbar {
    width: 8px;
    background: transparent;
  }
  .xterm-viewport::-webkit-scrollbar-track {
    background: transparent;
  }
  .xterm-viewport::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
  .xterm-viewport::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }
  .xterm-screen {
    padding: 4px 0;
  }
`;

// Persistent terminal component - stays alive when hidden
// PTY is managed globally to survive component remounts
let globalPtyCreated = false;

const XTerminal = forwardRef(({ isDark, height = 150, isVisible = true }, ref) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const isInitializedRef = useRef(false);
  const waitingForRestartRef = useRef(false);
  const hasBeenVisibleRef = useRef(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => xtermRef.current?.focus(),
    isInitialized: () => isInitializedRef.current,
    killPty: () => {
      window.electronAPI?.ptyKill?.();
      globalPtyCreated = false;
      waitingForRestartRef.current = true;
    }
  }));

  // Initialize terminal when it becomes visible for the first time
  useEffect(() => {
    // Only initialize when visible and not already initialized
    if (!isVisible || !terminalRef.current || isInitializedRef.current) return;
    
    hasBeenVisibleRef.current = true;
    
    const initTimeout = setTimeout(async () => {
      if (!terminalRef.current || isInitializedRef.current) return;
      
      // Create xterm instance with modern theme
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 13,
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
        lineHeight: 1.2,
        letterSpacing: 0,
        theme: isDark ? {
          background: '#0d0d0d',
          foreground: '#e4e4e4',
          cursor: '#ffffff',
          cursorAccent: '#0d0d0d',
          selectionBackground: 'rgba(255, 255, 255, 0.25)',
          selectionForeground: '#ffffff',
          // ANSI Colors - Modern palette
          black: '#1d1f21',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#fbbf24',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#22d3ee',
          white: '#e4e4e4',
          brightBlack: '#5c5c5c',
          brightRed: '#fca5a5',
          brightGreen: '#86efac',
          brightYellow: '#fde047',
          brightBlue: '#93c5fd',
          brightMagenta: '#d8b4fe',
          brightCyan: '#67e8f9',
          brightWhite: '#ffffff',
        } : {
          background: '#fafafa',
          foreground: '#1a1a1a',
          cursor: '#1a1a1a',
          cursorAccent: '#fafafa',
          selectionBackground: 'rgba(0, 0, 0, 0.15)',
          selectionForeground: '#000000',
          // ANSI Colors - Light theme
          black: '#1a1a1a',
          red: '#dc2626',
          green: '#16a34a',
          yellow: '#ca8a04',
          blue: '#2563eb',
          magenta: '#9333ea',
          cyan: '#0891b2',
          white: '#f5f5f5',
          brightBlack: '#737373',
          brightRed: '#ef4444',
          brightGreen: '#22c55e',
          brightYellow: '#eab308',
          brightBlue: '#3b82f6',
          brightMagenta: '#a855f7',
          brightCyan: '#06b6d4',
          brightWhite: '#ffffff',
        },
        allowProposedApi: true,
        scrollback: 1000,
        convertEol: true
      });

      // Add fit addon
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;

      // Open terminal in container
      term.open(terminalRef.current);
      xtermRef.current = term;
      isInitializedRef.current = true;

      // Fit after opening (with small delay to ensure DOM is ready)
      setTimeout(() => {
        try {
          fitAddon.fit();
          // Scroll to bottom to ensure cursor is visible at the top of a fresh terminal
          term.scrollToBottom();
        } catch (e) {
          console.log('Initial fit error:', e);
        }
      }, 50);

      // Create PTY process (only if not already created globally)
      if (!globalPtyCreated && window.electronAPI?.ptyCreate) {
        // Clear terminal before starting PTY to ensure clean state
        term.clear();
        
        const result = await window.electronAPI.ptyCreate({
          cols: term.cols || 80,
          rows: term.rows || 10
        });
        
        if (result.success) {
          globalPtyCreated = true;
        } else {
          term.writeln(`\x1b[31mFailed to create terminal: ${result.error}\x1b[0m`);
        }
      }

      // Function to restart PTY
      const restartPty = async () => {
        if (globalPtyCreated) return;
        
        waitingForRestartRef.current = false;
        xtermRef.current?.writeln('\x1b[32mRestarting terminal...\x1b[0m\r\n');
        
        const result = await window.electronAPI?.ptyCreate?.({
          cols: xtermRef.current?.cols || 80,
          rows: xtermRef.current?.rows || 10
        });
        
        if (result?.success) {
          globalPtyCreated = true;
        } else {
          xtermRef.current?.writeln(`\x1b[31mFailed to restart: ${result?.error}\x1b[0m`);
          waitingForRestartRef.current = true;
        }
      };

      // Handle user input -> send to PTY or restart
      term.onData(async (data) => {
        // If waiting for restart and Enter is pressed
        if (waitingForRestartRef.current && (data === '\r' || data === '\n')) {
          await restartPty();
          return;
        }
        
        // Normal input - send to PTY
        if (globalPtyCreated) {
          window.electronAPI?.ptyWrite?.(data);
        }
      });

      // Handle PTY output -> display in terminal
      if (window.electronAPI?.onPtyData) {
        window.electronAPI.onPtyData((data) => {
          xtermRef.current?.write(data);
        });
      }

      // Handle PTY exit - offer to restart
      if (window.electronAPI?.onPtyExit) {
        window.electronAPI.onPtyExit(({ exitCode }) => {
          globalPtyCreated = false;
          waitingForRestartRef.current = true;
          xtermRef.current?.writeln(`\r\n\x1b[33mProcess exited (${exitCode}). Press Enter to restart...\x1b[0m`);
        });
      }

      // Focus terminal
      setTimeout(() => term.focus(), 100);
      
    }, 50);

    return () => {
      clearTimeout(initTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]); // Run when visibility changes

  // Update theme when isDark changes
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = isDark ? {
        background: '#0d0d0d',
        foreground: '#e4e4e4',
        cursor: '#ffffff',
        cursorAccent: '#0d0d0d',
        selectionBackground: 'rgba(255, 255, 255, 0.25)',
        selectionForeground: '#ffffff',
        black: '#1d1f21',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e4e4e4',
        brightBlack: '#5c5c5c',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      } : {
        background: '#fafafa',
        foreground: '#1a1a1a',
        cursor: '#1a1a1a',
        cursorAccent: '#fafafa',
        selectionBackground: 'rgba(0, 0, 0, 0.15)',
        selectionForeground: '#000000',
        black: '#1a1a1a',
        red: '#dc2626',
        green: '#16a34a',
        yellow: '#ca8a04',
        blue: '#2563eb',
        magenta: '#9333ea',
        cyan: '#0891b2',
        white: '#f5f5f5',
        brightBlack: '#737373',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#eab308',
        brightBlue: '#3b82f6',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#ffffff',
      };
    }
  }, [isDark]);

  // Handle visibility changes - refit and focus when becoming visible
  useEffect(() => {
    if (isVisible && isInitializedRef.current) {
      // Multiple refit attempts to ensure proper sizing after CSS transition
      const refitTimeout1 = setTimeout(() => {
        if (fitAddonRef.current && xtermRef.current) {
          try {
            fitAddonRef.current.fit();
            window.electronAPI?.ptyResize?.(xtermRef.current.cols, xtermRef.current.rows);
          } catch (e) {
            // Ignore fit errors
          }
        }
      }, 50);
      
      const refitTimeout2 = setTimeout(() => {
        if (fitAddonRef.current && xtermRef.current) {
          try {
            fitAddonRef.current.fit();
            window.electronAPI?.ptyResize?.(xtermRef.current.cols, xtermRef.current.rows);
            xtermRef.current.focus();
          } catch (e) {
            // Ignore fit errors
          }
        }
      }, 250);
      
      return () => {
        clearTimeout(refitTimeout1);
        clearTimeout(refitTimeout2);
      };
    }
  }, [isVisible]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current && isInitializedRef.current && isVisible) {
        try {
          fitAddonRef.current.fit();
          window.electronAPI?.ptyResize?.(xtermRef.current.cols, xtermRef.current.rows);
        } catch (e) {
          // Ignore fit errors during transitions
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, height]);

  // Refit when height changes (for popout window resizing)
  useEffect(() => {
    if (fitAddonRef.current && xtermRef.current && isInitializedRef.current && isVisible) {
      const refitTimeout = setTimeout(() => {
        try {
          fitAddonRef.current.fit();
          window.electronAPI?.ptyResize?.(xtermRef.current.cols, xtermRef.current.rows);
        } catch (e) {
          // Ignore fit errors
        }
      }, 50);
      return () => clearTimeout(refitTimeout);
    }
  }, [height, isVisible]);

  // Inject custom scrollbar styles
  useEffect(() => {
    const styleId = 'xterm-custom-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = terminalStyles;
      document.head.appendChild(style);
    }
  }, []);

  // Cleanup terminal UI on unmount (but keep PTY alive for other instances)
  useEffect(() => {
    return () => {
      // Only dispose the xterm UI, don't kill PTY or remove listeners
      // Listeners will be re-registered by the next terminal instance
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
      isInitializedRef.current = false;
      // Note: Don't reset globalPtyCreated or remove listeners - PTY stays alive
    };
  }, []);

  // Don't render anything if not visible (saves space in layout)
  if (!isVisible && !isInitializedRef.current) {
    return null;
  }

  return (
    <div 
      ref={terminalRef}
      style={{
        width: '100%',
        height: isVisible ? `${height}px` : '0px',
        minHeight: isVisible ? `${height}px` : '0px',
        maxHeight: isVisible ? `${height}px` : '0px',
        overflow: 'hidden',
        borderRadius: '8px',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        display: isVisible ? 'block' : 'none'
      }}
    />
  );
});

XTerminal.displayName = 'XTerminal';

export default XTerminal;
