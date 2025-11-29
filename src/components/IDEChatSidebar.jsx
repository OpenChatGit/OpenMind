import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, MessageSquare, ChevronDown } from 'lucide-react';

const IDEChatSidebar = ({ inferenceSettings, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [width, setWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const sidebarRef = useRef(null);

  // Load models - only once on mount
  useEffect(() => {
    const fetchModels = async () => {
      if (window.electronAPI?.getOllamaModels) {
        const models = await window.electronAPI.getOllamaModels();
        if (models && models.length > 0) {
          setAvailableModels(models.map(m => m.name));
          setSelectedModel(prev => prev || models[0].name);
        }
      }
    };
    fetchModels();
  }, []); // Empty dependency - only run once on mount

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Resize handling
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(280, Math.min(600, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !selectedModel) return;

    const userMessage = { role: 'user', content: input.trim(), id: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    const assistantMessage = { role: 'assistant', content: '', isStreaming: true, id: Date.now() + 1 };
    setMessages(prev => [...prev, assistantMessage]);

    let currentContent = '';

    try {
      const allMessages = [...messages, userMessage];
      
      const messageListener = (content) => {
        currentContent = content;
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = { ...updated[lastIdx], content: currentContent };
          return updated;
        });
      };

      window.electronAPI?.onMessageUpdate(messageListener);
      await window.electronAPI?.sendOllamaMessage(selectedModel, allMessages);
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = { 
          ...updated[lastIdx], 
          content: 'Error: Could not connect to Ollama.',
          isStreaming: false 
        };
        return updated;
      });
    } finally {
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]) {
          updated[lastIdx] = { ...updated[lastIdx], isStreaming: false };
        }
        return updated;
      });
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      ref={sidebarRef}
      style={{
        width: `${width}px`,
        height: '100%',
        background: '#1b1b1c',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          cursor: 'ew-resize',
          background: isResizing ? 'rgba(99, 102, 241, 0.5)' : 'transparent',
          transition: 'background 0.2s',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          if (!isResizing) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
        }}
        onMouseLeave={(e) => {
          if (!isResizing) e.currentTarget.style.background = 'transparent';
        }}
      />

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            color: '#555',
            fontSize: '0.8rem',
            textAlign: 'center',
            padding: '40px 20px'
          }}>
            <MessageSquare size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p>Ask anything about your code...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: '12px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: msg.role === 'user' ? '#2f2f2f' : 'rgba(99, 102, 241, 0.08)',
                color: '#ececec',
                fontSize: '0.82rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {msg.content}
              {msg.isStreaming && !msg.content && (
                <span style={{ color: '#666' }}>Thinking...</span>
              )}
              {msg.isStreaming && msg.content && (
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '14px',
                  background: '#6366f1',
                  marginLeft: '2px',
                  animation: 'blink 1s infinite'
                }} />
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - ChatGPT Style */}
      <div style={{
        padding: '12px'
      }}>
        <div style={{
          background: '#2c2c2e',
          borderRadius: '16px',
          padding: '10px 12px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#ececec',
              fontSize: '0.85rem',
              resize: 'none',
              outline: 'none',
              minHeight: '32px',
              maxHeight: '100px',
              fontFamily: 'inherit',
              lineHeight: '1.4'
            }}
            rows={1}
          />
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px'
          }}>
            {/* Model Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ 
                  maxWidth: '120px', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedModel || 'Select Model'}
                </span>
                <ChevronDown size={12} />
              </button>
              
              {isModelMenuOpen && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '4px',
                  background: '#2f2f2f',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '4px',
                  minWidth: '180px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 100,
                  boxShadow: '0 -4px 12px rgba(0,0,0,0.3)'
                }}>
                  {availableModels.map(model => (
                    <button
                      key={model}
                      onClick={() => {
                        setSelectedModel(model);
                        setIsModelMenuOpen(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 10px',
                        background: selectedModel === model ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                        border: 'none',
                        color: selectedModel === model ? '#6366f1' : '#ececec',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        textAlign: 'left',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedModel !== model) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedModel !== model) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || !selectedModel}
              style={{
                background: input.trim() && !isStreaming && selectedModel ? '#ececec' : '#3f3f3f',
                border: 'none',
                borderRadius: '8px',
                width: '28px',
                height: '28px',
                cursor: input.trim() && !isStreaming && selectedModel ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              <ArrowUp size={16} color={input.trim() && !isStreaming && selectedModel ? '#1b1b1c' : '#666'} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default IDEChatSidebar;
