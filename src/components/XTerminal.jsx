import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// Persistent terminal component - stays alive when hidden
const XTerminal = forwardRef(({ isDark, height = 150, isVisible = true }, ref) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const isInitializedRef = useRef(false);
  const ptyCreatedRef = useRef(false);
  const waitingForRestartRef = useRef(false);
  const hasBeenVisibleRef = useRef(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => xtermRef.current?.focus(),
    isInitialized: () => isInitializedRef.current,
    killPty: () => {
      window.electronAPI?.ptyKill?.();
      ptyCreatedRef.current = false;
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
      
      // Create xterm instance
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 13,
        fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
        theme: isDark ? {
          background: '#1e1e1e',
          foreground: '#e0e0e0',
          cursor: '#ffffff',
          selectionBackground: 'rgba(255, 255, 255, 0.3)',
        } : {
          background: '#f5f5f5',
          foreground: '#1a1a1a',
          cursor: '#1a1a1a',
          selectionBackground: 'rgba(0, 0, 0, 0.2)',
        },
        allowProposedApi: true,
        scrollback: 5000,
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
        } catch (e) {
          console.log('Initial fit error:', e);
        }
      }, 50);

      // Create PTY process
      if (!ptyCreatedRef.current && window.electronAPI?.ptyCreate) {
        const result = await window.electronAPI.ptyCreate({
          cols: term.cols || 80,
          rows: term.rows || 10
        });
        
        if (result.success) {
          ptyCreatedRef.current = true;
        } else {
          term.writeln(`\x1b[31mFailed to create terminal: ${result.error}\x1b[0m`);
        }
      }

      // Function to restart PTY
      const restartPty = async () => {
        if (ptyCreatedRef.current) return;
        
        waitingForRestartRef.current = false;
        xtermRef.current?.writeln('\x1b[32mRestarting terminal...\x1b[0m\r\n');
        
        const result = await window.electronAPI?.ptyCreate?.({
          cols: xtermRef.current?.cols || 80,
          rows: xtermRef.current?.rows || 10
        });
        
        if (result?.success) {
          ptyCreatedRef.current = true;
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
        if (ptyCreatedRef.current) {
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
          ptyCreatedRef.current = false;
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
        background: '#1e1e1e',
        foreground: '#e0e0e0',
        cursor: '#ffffff',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
      } : {
        background: '#f5f5f5',
        foreground: '#1a1a1a',
        cursor: '#1a1a1a',
        selectionBackground: 'rgba(0, 0, 0, 0.2)',
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

  // Cleanup ONLY on full unmount (component destroyed)
  useEffect(() => {
    return () => {
      // Only cleanup when component is truly unmounting
      window.electronAPI?.removePtyListeners?.();
      window.electronAPI?.ptyKill?.();
      
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
      isInitializedRef.current = false;
      ptyCreatedRef.current = false;
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
