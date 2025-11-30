import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import {
  Plus,
  SplitSquareHorizontal,
  Trash2,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  X,
  ChevronDown,
  Terminal as TerminalIcon,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Circle,
  Play,
  Square,
  RefreshCw,
  Filter,
  Trash,
  Globe,
  Lock,
  Copy
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import FileIcon from './FileIcon';

const TerminalPanel = ({
  isOpen,
  onClose,
  workspaceFolder,
  onMaximize,
  isMaximized = false,
  problems = [],
  outputLogs = [],
  debugLogs = [],
  forwardedPorts = [],
  onPortForward,
  onPortClose,
  onClearOutput,
  onClearDebug
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('terminal');
  const [terminals, setTerminals] = useState([]);
  const [activeTerminalId, setActiveTerminalId] = useState(null);
  const [showShellDropdown, setShowShellDropdown] = useState(false);
  const [panelHeight, setPanelHeight] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const [problemFilter, setProblemFilter] = useState('all'); // all, errors, warnings
  const [outputFilter, setOutputFilter] = useState('all');
  const [expandedProblemFiles, setExpandedProblemFiles] = useState(new Set());

  const terminalContainerRef = useRef(null);
  const panelRef = useRef(null);
  const hasCreatedInitialTerminal = useRef(false);
  const xtermInstances = useRef(new Map());
  const outputRef = useRef(null);
  const debugRef = useRef(null);

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const windowHeight = window.innerHeight;
      const newHeight = windowHeight - e.clientY;
      const clampedHeight = Math.max(100, Math.min(windowHeight - 100, newHeight));
      setPanelHeight(clampedHeight);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Fit terminal when panel resizes
  useEffect(() => {
    if (activeTerminalId && xtermInstances.current.has(activeTerminalId)) {
      const { fitAddon } = xtermInstances.current.get(activeTerminalId);
      setTimeout(() => {
        try { fitAddon.fit(); } catch (e) { /* ignore */ }
      }, 100);
    }
  }, [panelHeight, isMaximized, activeTerminalId]);

  // Auto-scroll output and debug
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [outputLogs]);

  useEffect(() => {
    if (debugRef.current) debugRef.current.scrollTop = debugRef.current.scrollHeight;
  }, [debugLogs]);

  // Create xterm instance for a terminal
  const createXtermInstance = useCallback((terminalId) => {
    if (xtermInstances.current.has(terminalId)) return xtermInstances.current.get(terminalId);

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: 'Consolas, "Cascadia Code", "Fira Code", Monaco, "Courier New", monospace',
      lineHeight: 1.2,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#1e1e1e',
        selectionBackground: 'rgba(99, 102, 241, 0.4)',
        black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
        blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
        brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b',
        brightYellow: '#f5f543', brightBlue: '#3b8eea', brightMagenta: '#d670d6',
        brightCyan: '#29b8db', brightWhite: '#ffffff'
      },
      allowProposedApi: true,
      scrollback: 1000,
      convertEol: false,
      scrollOnUserInput: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.onData((data) => window.electronAPI?.terminalWrite(terminalId, data));

    xtermInstances.current.set(terminalId, { terminal: term, fitAddon });
    return { terminal: term, fitAddon };
  }, []);

  // Mount xterm to DOM when terminal becomes active
  useEffect(() => {
    // Only mount when terminal tab is active
    if (activeTab !== 'terminal') {
      // Hide all terminal elements when not on terminal tab
      xtermInstances.current.forEach(({ terminal }) => {
        if (terminal.element) {
          terminal.element.style.display = 'none';
        }
      });
      return;
    }

    if (!activeTerminalId || !terminalContainerRef.current) return;

    const container = terminalContainerRef.current;
    let instance = xtermInstances.current.get(activeTerminalId);
    if (!instance) instance = createXtermInstance(activeTerminalId);

    if (instance) {
      const { terminal, fitAddon } = instance;
      
      // Show the terminal element
      if (terminal.element) {
        terminal.element.style.display = '';
      }
      
      if (!terminal.element) {
        container.innerHTML = '';
        terminal.open(container);
      } else if (terminal.element.parentElement !== container) {
        container.innerHTML = '';
        container.appendChild(terminal.element);
      }

      const fitAndFocus = () => {
        try {
          fitAddon.fit();
          terminal.focus();
          const dims = fitAddon.proposeDimensions();
          if (dims?.cols && dims?.rows) {
            window.electronAPI?.terminalResize(activeTerminalId, dims.cols, dims.rows);
          }
        } catch (e) { /* ignore */ }
      };
      setTimeout(fitAndFocus, 0);
      setTimeout(fitAndFocus, 50);
      setTimeout(fitAndFocus, 150);
    }
  }, [activeTerminalId, activeTab, createXtermInstance]);

  // Create new terminal
  const createTerminal = useCallback(async () => {
    try {
      const result = await window.electronAPI?.terminalCreate(workspaceFolder);
      if (result?.success) {
        const folderName = result.cwd ? result.cwd.split(/[/\\]/).pop() : '';
        const instance = createXtermInstance(result.terminalId);
        setTerminals(prev => [...prev, {
          id: result.terminalId, name: result.shell, shell: result.shell,
          cwd: result.cwd, folderName, isPty: result.isPty
        }]);
        setActiveTerminalId(result.terminalId);
        if (instance) {
          setTimeout(() => {
            try {
              const dims = instance.fitAddon.proposeDimensions();
              if (dims?.cols && dims?.rows) {
                window.electronAPI?.terminalResize(result.terminalId, dims.cols, dims.rows);
              }
            } catch (e) { /* ignore */ }
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error creating terminal:', error);
    }
  }, [workspaceFolder, createXtermInstance]);

  // Create initial terminal when panel opens
  useEffect(() => {
    if (isOpen && terminals.length === 0 && !hasCreatedInitialTerminal.current) {
      hasCreatedInitialTerminal.current = true;
      createTerminal();
    }
    if (!isOpen) hasCreatedInitialTerminal.current = false;
  }, [isOpen, terminals.length, createTerminal]);

  // Listen for terminal output
  useEffect(() => {
    const handleOutput = (data) => {
      const instance = xtermInstances.current.get(data.terminalId);
      if (instance) instance.terminal.write(data.data);
    };
    const handleExit = (data) => {
      const instance = xtermInstances.current.get(data.terminalId);
      if (instance) instance.terminal.write('\r\n\x1b[33m[Process exited]\x1b[0m\r\n');
    };
    const removeOutput = window.electronAPI?.onTerminalOutput(handleOutput);
    const removeExit = window.electronAPI?.onTerminalExit(handleExit);
    return () => { removeOutput?.(); removeExit?.(); };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (activeTerminalId && xtermInstances.current.has(activeTerminalId)) {
        const { fitAddon } = xtermInstances.current.get(activeTerminalId);
        setTimeout(() => {
          try {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) window.electronAPI?.terminalResize(activeTerminalId, dims.cols, dims.rows);
          } catch (e) { /* ignore */ }
        }, 100);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTerminalId]);

  // Kill terminal
  const killTerminal = async (terminalId) => {
    await window.electronAPI?.terminalKill(terminalId);
    const instance = xtermInstances.current.get(terminalId);
    if (instance) { instance.terminal.dispose(); xtermInstances.current.delete(terminalId); }
    setTerminals(prev => prev.filter(t => t.id !== terminalId));
    if (activeTerminalId === terminalId) {
      const remaining = terminals.filter(t => t.id !== terminalId);
      setActiveTerminalId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      xtermInstances.current.forEach(({ terminal }) => terminal.dispose());
      xtermInstances.current.clear();
    };
  }, []);

  // Track if we've done initial expansion
  const hasInitialExpandedRef = useRef(false);
  
  // Auto-expand files with problems on first load only
  useEffect(() => {
    if (problems.length > 0 && !hasInitialExpandedRef.current) {
      hasInitialExpandedRef.current = true;
      const files = [...new Set(problems.map(p => p.file).filter(Boolean))];
      setExpandedProblemFiles(new Set(files.slice(0, 5))); // Expand first 5 files
    }
  }, [problems.length]);

  // Filter problems
  const filteredProblems = problems.filter(p => {
    if (problemFilter === 'errors') return p.severity === 'error';
    if (problemFilter === 'warnings') return p.severity === 'warning';
    return true;
  });

  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;
  const infoCount = problems.filter(p => p.severity === 'info').length;

  // UI Components
  const TabButton = ({ id, label, isActive, badge }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        background: 'transparent', border: 'none',
        color: isActive ? theme.text : theme.textMuted,
        fontSize: '0.7rem', padding: '6px 12px', cursor: 'pointer',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        fontWeight: isActive ? '600' : '400',
        borderBottom: isActive ? `1px solid ${theme.accent}` : '1px solid transparent',
        marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px'
      }}
    >
      {label}
      {badge > 0 && (
        <span style={{
          background: id === 'problems' && errorCount > 0 ? '#f14c4c' : theme.accent,
          color: 'white', fontSize: '0.6rem', padding: '1px 5px',
          borderRadius: '8px', minWidth: '16px', textAlign: 'center'
        }}>{badge}</span>
      )}
    </button>
  );

  const ActionButton = ({ icon: Icon, title, onClick, disabled }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        background: 'transparent', border: 'none',
        color: disabled ? theme.textMuted : theme.textSecondary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '4px', borderRadius: '4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.5 : 1
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = theme.text; }}}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = disabled ? theme.textMuted : theme.textSecondary; }}
    >
      <Icon size={14} />
    </button>
  );

  const ProblemIcon = ({ severity }) => {
    if (severity === 'error') return <AlertCircle size={14} color="#f14c4c" />;
    if (severity === 'warning') return <AlertTriangle size={14} color="#cca700" />;
    return <Info size={14} color="#3794ff" />;
  };

  if (!isOpen) return null;
  const activeTerminal = terminals.find(t => t.id === activeTerminalId);

  // Group problems by file
  const groupedProblems = filteredProblems.reduce((acc, problem) => {
    const key = problem.file || 'Unknown';
    if (!acc[key]) {
      // Get relative path like "src\components" or "src/components"
      const fullPath = problem.file || '';
      const parts = fullPath.replace(/\//g, '\\').split('\\');
      const fileName = parts.pop() || 'Unknown';
      const folderPath = parts.slice(-2).join('\\'); // Last 2 folders
      
      acc[key] = {
        file: problem.file,
        fileName: problem.fileName || fileName,
        relativePath: folderPath,
        problems: []
      };
    }
    acc[key].problems.push(problem);
    return acc;
  }, {});

  // Toggle file expansion
  const toggleProblemFile = (file) => {
    setExpandedProblemFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(file)) {
        newSet.delete(file);
      } else {
        newSet.add(file);
      }
      return newSet;
    });
  };

  // Render Problems Tab - VS Code Style
  const renderProblemsTab = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Problems Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => setProblemFilter('all')} style={{
          background: problemFilter === 'all' ? 'rgba(99,102,241,0.2)' : 'transparent',
          border: 'none', color: theme.text, fontSize: '0.75rem', padding: '2px 8px',
          borderRadius: '4px', cursor: 'pointer'
        }}>All ({problems.length})</button>
        <button onClick={() => setProblemFilter('errors')} style={{
          background: problemFilter === 'errors' ? 'rgba(241,76,76,0.2)' : 'transparent',
          border: 'none', color: '#f14c4c', fontSize: '0.75rem', padding: '2px 8px',
          borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
        }}><AlertCircle size={12} /> {errorCount}</button>
        <button onClick={() => setProblemFilter('warnings')} style={{
          background: problemFilter === 'warnings' ? 'rgba(204,167,0,0.2)' : 'transparent',
          border: 'none', color: '#cca700', fontSize: '0.75rem', padding: '2px 8px',
          borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
        }}><AlertTriangle size={12} /> {warningCount}</button>
      </div>
      {/* Problems List - Grouped by File */}
      <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.8rem' }}>
        {Object.keys(groupedProblems).length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>
            <CheckCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p>No problems detected in the workspace.</p>
          </div>
        ) : (
          Object.entries(groupedProblems).map(([file, group]) => {
            const isExpanded = expandedProblemFiles.has(file);
            const errorCount = group.problems.filter(p => p.severity === 'error').length;
            const warningCount = group.problems.filter(p => p.severity === 'warning').length;
            
            return (
              <div key={file}>
                {/* File Header - Collapsible */}
                <div
                  onClick={() => toggleProblemFile(file)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Chevron */}
                  <ChevronDown 
                    size={16} 
                    style={{ 
                      color: theme.textMuted,
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.15s ease',
                      flexShrink: 0
                    }} 
                  />
                  {/* File Icon - based on file extension */}
                  <FileIcon filename={group.fileName} size={16} />
                  {/* File Name */}
                  <span style={{ color: theme.text, fontWeight: 500 }}>{group.fileName}</span>
                  {/* Relative Path */}
                  <span style={{ color: theme.textMuted, fontSize: '0.75rem', marginLeft: '4px' }}>{group.relativePath}</span>
                  {/* Problem Count Badge - right after path */}
                  <span style={{
                    background: errorCount > 0 ? '#f14c4c' : '#cca700',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    minWidth: '18px',
                    textAlign: 'center',
                    marginLeft: '8px'
                  }}>
                    {group.problems.length}
                  </span>
                </div>
                
                {/* Problems List for this File */}
                {isExpanded && (
                  <div style={{ paddingLeft: '24px' }}>
                    {group.problems.map((problem, i) => (
                      <div
                        key={i}
                        onClick={() => problem.onClick?.()}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          padding: '3px 8px 3px 16px',
                          cursor: problem.onClick ? 'pointer' : 'default',
                          background: 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Problem Icon - Lightbulb for suggestions, Circle for others */}
                        <span style={{ 
                          color: problem.severity === 'error' ? '#f14c4c' : problem.severity === 'warning' ? '#cca700' : '#3794ff',
                          flexShrink: 0,
                          marginTop: '1px'
                        }}>
                          <Circle size={10} fill="currentColor" />
                        </span>
                        {/* Message + Source Code + Position - all in one line */}
                        <span style={{ 
                          color: theme.text, 
                          flex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {problem.message}
                          {problem.source && (
                            <span style={{ color: theme.textMuted, marginLeft: '6px' }}>
                              {problem.source === 'Monaco' ? 'ts' : problem.source}({problem.code || problem.line || ''})
                            </span>
                          )}
                          {problem.line && (
                            <span style={{ color: theme.textMuted, marginLeft: '6px' }}>
                              [Ln {problem.line}, Col {problem.column || 1}]
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Render Output Tab
  const renderOutputTab = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: `1px solid ${theme.border}` }}>
        <select value={outputFilter} onChange={(e) => setOutputFilter(e.target.value)} style={{
          background: theme.bgSecondary, border: `1px solid ${theme.border}`, color: theme.text,
          fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px'
        }}>
          <option value="all">All Output</option>
          <option value="tasks">Tasks</option>
          <option value="extensions">Extensions</option>
          <option value="git">Git</option>
        </select>
        <ActionButton icon={Trash} title="Clear Output" onClick={onClearOutput} />
      </div>
      <div ref={outputRef} style={{
        flex: 1, overflowY: 'auto', padding: '8px 12px',
        fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px',
        whiteSpace: 'pre-wrap', color: theme.text, background: '#1e1e1e'
      }}>
        {outputLogs.length === 0 ? (
          <div style={{ color: theme.textMuted, textAlign: 'center', padding: '20px' }}>No output available.</div>
        ) : (
          outputLogs.map((log, i) => (
            <div key={i} style={{ marginBottom: '2px', color: log.type === 'error' ? '#f14c4c' : log.type === 'warning' ? '#cca700' : theme.text }}>
              {log.timestamp && <span style={{ color: theme.textMuted }}>[{log.timestamp}] </span>}
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render Debug Console Tab
  const renderDebugTab = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, gap: '4px' }}>
        <ActionButton icon={Play} title="Start Debugging" onClick={() => {}} />
        <ActionButton icon={Square} title="Stop" onClick={() => {}} disabled />
        <ActionButton icon={RefreshCw} title="Restart" onClick={() => {}} disabled />
        <ActionButton icon={Trash} title="Clear Console" onClick={onClearDebug} />
      </div>
      <div ref={debugRef} style={{
        flex: 1, overflowY: 'auto', padding: '8px 12px',
        fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px',
        whiteSpace: 'pre-wrap', color: theme.text, background: '#1e1e1e'
      }}>
        {debugLogs.length === 0 ? (
          <div style={{ color: theme.textMuted, textAlign: 'center', padding: '20px' }}>
            <p>Debug console is empty.</p>
            <p style={{ fontSize: '0.7rem', marginTop: '8px' }}>Start a debug session to see output here.</p>
          </div>
        ) : (
          debugLogs.map((log, i) => (
            <div key={i} style={{ marginBottom: '2px', color: log.type === 'error' ? '#f14c4c' : log.type === 'warn' ? '#cca700' : log.type === 'info' ? '#3794ff' : theme.text }}>
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render Ports Tab
  const renderPortsTab = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>Forwarded Ports</span>
        <ActionButton icon={Plus} title="Forward a Port" onClick={onPortForward} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {forwardedPorts.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: theme.textMuted, fontSize: '0.85rem' }}>
            <Globe size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p>No forwarded ports.</p>
            <p style={{ fontSize: '0.7rem', marginTop: '8px' }}>Forward a port to access a service running in your workspace.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <th style={{ textAlign: 'left', padding: '6px 12px', color: theme.textMuted, fontWeight: 'normal' }}>Port</th>
                <th style={{ textAlign: 'left', padding: '6px 12px', color: theme.textMuted, fontWeight: 'normal' }}>Address</th>
                <th style={{ textAlign: 'left', padding: '6px 12px', color: theme.textMuted, fontWeight: 'normal' }}>Visibility</th>
                <th style={{ textAlign: 'left', padding: '6px 12px', color: theme.textMuted, fontWeight: 'normal' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forwardedPorts.map((port, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '6px 12px', color: theme.text }}>{port.port}</td>
                  <td style={{ padding: '6px 12px' }}>
                    <a href={port.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.accent, textDecoration: 'none' }}>
                      {port.url || `localhost:${port.port}`}
                    </a>
                  </td>
                  <td style={{ padding: '6px 12px', color: theme.textMuted }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {port.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                      {port.visibility || 'Private'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <ActionButton icon={Copy} title="Copy Address" onClick={() => navigator.clipboard.writeText(port.url || `localhost:${port.port}`)} />
                      <ActionButton icon={Globe} title="Open in Browser" onClick={() => window.open(port.url || `http://localhost:${port.port}`, '_blank')} />
                      <ActionButton icon={X} title="Stop Forwarding" onClick={() => onPortClose?.(port.port)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // Render Terminal Tab
  const renderTerminalTab = () => (
    <div ref={terminalContainerRef} style={{ flex: 1, padding: '4px', background: '#1e1e1e', overflow: 'hidden' }}>
      {terminals.length === 0 && (
        <div style={{ color: theme.textMuted, padding: '20px', textAlign: 'center' }}>
          <p>Starting terminal...</p>
          <button onClick={createTerminal} style={{
            marginTop: '12px', padding: '8px 16px', background: theme.accent,
            border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer'
          }}>Create Terminal</button>
        </div>
      )}
    </div>
  );

  return (
    <div ref={panelRef} style={{
      height: isMaximized ? 'calc(100vh - 32px)' : `${panelHeight}px`,
      background: '#1e1e1e', borderTop: `1px solid ${theme.border}`,
      position: 'relative', display: 'flex', flexDirection: 'column'
    }}>
      {/* Resize Handle */}
      {!isMaximized && (
        <div onMouseDown={handleResizeStart} style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          cursor: 'ns-resize', background: isResizing ? 'rgba(99,102,241,0.5)' : 'transparent', zIndex: 10
        }}
        onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; }}
        onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = 'transparent'; }} />
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: theme.bgSecondary, borderBottom: `1px solid ${theme.border}`,
        height: '35px', paddingRight: '8px', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <TabButton id="problems" label="Problems" isActive={activeTab === 'problems'} badge={errorCount + warningCount} />
          <TabButton id="output" label="Output" isActive={activeTab === 'output'} />
          <TabButton id="debug" label="Debug Console" isActive={activeTab === 'debug'} />
          <TabButton id="terminal" label="Terminal" isActive={activeTab === 'terminal'} />
          <TabButton id="ports" label="Ports" isActive={activeTab === 'ports'} badge={forwardedPorts.length} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {activeTab === 'terminal' && (
            <>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowShellDropdown(!showShellDropdown)} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'transparent', border: 'none', color: theme.textSecondary,
                  fontSize: '0.75rem', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <TerminalIcon size={12} />
                  <span>{activeTerminal?.folderName || 'powershell'}</span>
                  <ChevronDown size={12} />
                </button>
                {showShellDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, background: '#2d2d2d',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px',
                    padding: '4px 0', minWidth: '200px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    {terminals.map((term, i) => (
                      <button key={term.id} onClick={() => { setActiveTerminalId(term.id); setShowShellDropdown(false); }} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 12px',
                        background: term.id === activeTerminalId ? 'rgba(99,102,241,0.2)' : 'transparent',
                        border: 'none', color: theme.text, fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left'
                      }}>
                        <TerminalIcon size={14} />
                        <span style={{ flex: 1 }}>{i + 1}: {term.shell}</span>
                        {term.folderName && <span style={{ color: theme.textMuted, fontSize: '0.7rem' }}>{term.folderName}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ActionButton icon={Plus} title="New Terminal" onClick={createTerminal} />
              <ActionButton icon={SplitSquareHorizontal} title="Split Terminal" onClick={() => {}} />
              <ActionButton icon={Trash2} title="Kill Terminal" onClick={() => activeTerminalId && killTerminal(activeTerminalId)} />
              <ActionButton icon={MoreHorizontal} title="More Actions" onClick={() => {}} />
            </>
          )}
          <div style={{ width: '1px', height: '16px', background: theme.border, margin: '0 4px' }} />
          <ActionButton icon={isMaximized ? Minimize2 : Maximize2} title={isMaximized ? "Restore" : "Maximize"} onClick={onMaximize} />
          <ActionButton icon={X} title="Close Panel" onClick={onClose} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'problems' && renderProblemsTab()}
        {activeTab === 'output' && renderOutputTab()}
        {activeTab === 'debug' && renderDebugTab()}
        {activeTab === 'terminal' && renderTerminalTab()}
        {activeTab === 'ports' && renderPortsTab()}
      </div>
    </div>
  );
};

export default TerminalPanel;
