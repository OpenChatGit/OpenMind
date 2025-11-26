import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal as TerminalIcon } from 'lucide-react';

const Terminal = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const terminalRef = useRef(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Simulate terminal output
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  // Expose addLog function globally for testing
  useEffect(() => {
    window.terminalAddLog = addLog;
    return () => {
      delete window.terminalAddLog;
    };
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      height: '100%',
      width: isOpen ? '400px' : '0px',
      background: '#0a0a0b',
      borderLeft: isOpen ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100
    }}>
      {/* Terminal Header */}
      <div style={{
        padding: '12px 16px',
        background: '#1a1a1a',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '48px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ececec',
          fontSize: '0.9rem',
          fontWeight: '600'
        }}>
          <TerminalIcon size={18} />
          <span>Assimilation Terminal</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#ececec';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#888';
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          lineHeight: '1.6',
          color: '#e0e0e0'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Terminal ready. Waiting for assimilation process...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: '4px',
                color: log.type === 'error' ? '#ff6b6b' : 
                       log.type === 'success' ? '#4ecdc4' : 
                       log.type === 'warning' ? '#ffd93d' : '#e0e0e0'
              }}
            >
              <span style={{ color: '#666', marginRight: '8px' }}>
                [{log.timestamp}]
              </span>
              {log.message}
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer */}
      <div style={{
        padding: '8px 16px',
        background: '#1a1a1a',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '0.75rem',
        color: '#666',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Status: {logs.length > 0 ? 'Active' : 'Idle'}</span>
        <span>Lines: {logs.length}</span>
      </div>
    </div>
  );
};

export default Terminal;
