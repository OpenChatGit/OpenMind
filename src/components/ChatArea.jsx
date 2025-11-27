import { useState, useCallback, useEffect } from 'react';
import { Paperclip, ArrowUp, ChevronDown, ChevronRight, Radar, Wrench, FolderOpen, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import ChartRenderer from './ChartRenderer';

const ChatArea = ({ activeChatId, messages, onUpdateMessages, onFirstMessage }) => {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState({});
  const [expandedToolCalls, setExpandedToolCalls] = useState({});
  const [deepSearchEnabled, setDeepSearchEnabled] = useState(false);
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [isMcpProcessing, setIsMcpProcessing] = useState(false);
  const [searchSources, setSearchSources] = useState([]); // URLs from web search
  const [currentSources, setCurrentSources] = useState([]); // Sources for current streaming message
  const [currentPreviews, setCurrentPreviews] = useState([]); // Preview images/cards
  const [mcpTools, setMcpTools] = useState([]);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [currentToolCalls, setCurrentToolCalls] = useState([]); // Live tool calls during DeepSearch
  const [attachedImages, setAttachedImages] = useState([]); // Images attached to current message

  const fetchModels = useCallback(async () => {
    if (window.electronAPI?.getOllamaModels) {
      const models = await window.electronAPI.getOllamaModels();
      if (models && models.length > 0) {
        setAvailableModels(models.map(m => m.name));
        if (!selectedModel || selectedModel === 'No Models Found') {
          setSelectedModel(models[0].name);
        }
      } else {
        setAvailableModels([]);
        setSelectedModel('No Models Found');
      }
    }
  }, [selectedModel]);

  useEffect(() => {
    fetchModels();
    fetchMcpTools();
    
    // Reload models when Ollama connects
    if (window.electronAPI?.onOllamaConnected) {
      window.electronAPI.onOllamaConnected(() => {
        fetchModels();
      });
    }
    
    // Listen for DeepSearch tool results to show sources and live tool calls
    if (window.electronAPI?.onDeepSearchToolUse) {
      window.electronAPI.onDeepSearchToolUse((data) => {
        // Track live tool calls (with deduplication)
        if (data.status === 'executing') {
          setCurrentToolCalls(prev => {
            // Check if we already have this tool call
            const key = `${data.tool}:${JSON.stringify(data.args)}`;
            const exists = prev.some(tc => `${tc.tool}:${JSON.stringify(tc.args)}` === key);
            if (exists) return prev; // Skip duplicate
            return [...prev, { 
              tool: data.tool, 
              args: data.args, 
              status: 'executing',
              timestamp: Date.now()
            }];
          });
        } else if (data.status === 'complete') {
          setCurrentToolCalls(prev => prev.map(tc => 
            tc.tool === data.tool && tc.status === 'executing'
              ? { ...tc, status: 'complete', result: data.result }
              : tc
          ));
        }
        
        // Track sources and previews from web search
        if (data.tool === 'web_search' && data.status === 'complete' && data.result?.results) {
          const results = data.result.results;
          const urls = results.filter(r => r.url).map(r => r.url);
          setSearchSources(prev => [...new Set([...prev, ...urls])]);
          setCurrentSources(prev => [...new Set([...prev, ...urls])]);
          
          // Extract previews (images, thumbnails)
          const previews = results
            .filter(r => r.thumbnail || r.type === 'image' || r.type === 'youtube' || r.type === 'github')
            .slice(0, 4)
            .map(r => ({
              url: r.url,
              thumbnail: r.thumbnail,
              title: r.title,
              type: r.type || 'web'
            }));
          if (previews.length > 0) {
            setCurrentPreviews(prev => [...prev, ...previews]);
          }
        }
      });
    }
  }, [fetchModels]);

  const fetchMcpTools = async () => {
    if (window.electronAPI?.mcpGetTools) {
      const tools = await window.electronAPI.mcpGetTools();
      setMcpTools(tools || []);
    }
  };

  const handleToggleTool = async (toolId, enabled) => {
    if (window.electronAPI?.mcpToggleTool) {
      await window.electronAPI.mcpToggleTool(toolId, enabled);
      fetchMcpTools();
    }
  };

  const handleOpenToolsFolder = async () => {
    if (window.electronAPI?.mcpOpenToolsFolder) {
      await window.electronAPI.mcpOpenToolsFolder();
    }
  };

  const handleRefreshTools = async () => {
    if (window.electronAPI?.mcpRefreshTools) {
      await window.electronAPI.mcpRefreshTools();
      fetchMcpTools();
    }
  };

  const handleAttachImages = async () => {
    if (window.electronAPI?.selectImages) {
      const result = await window.electronAPI.selectImages();
      if (result.success && result.images.length > 0) {
        setAttachedImages(prev => [...prev, ...result.images]);
      }
    }
  };

  const handleRemoveImage = (index) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle paste from clipboard (screenshots, copied images)
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target.result.split(',')[1];
            const mimeType = file.type;
            const dataUrl = event.target.result;
            setAttachedImages(prev => [...prev, {
              name: `Pasted Image ${Date.now()}`,
              base64,
              mimeType,
              dataUrl
            }]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }, []);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedImages.length === 0) || !selectedModel || selectedModel === 'No Models Found') return;

    const userMessage = { 
      role: 'user', 
      content: input || (attachedImages.length > 0 ? 'What do you see in this image?' : ''), 
      id: Date.now(),
      images: attachedImages.length > 0 ? attachedImages : undefined
    };
    const inputText = input || 'Image';
    setInput('');
    setAttachedImages([]);

    let chatId = activeChatId;
    let currentMessages = [...messages];

    const assistantMessageId = Date.now() + 1;
    const newMessages = [...currentMessages, userMessage];
    const messagesWithPlaceholder = [...newMessages, {
      role: 'assistant',
      content: '',
      thinking: '',
      id: assistantMessageId,
      isStreaming: true
    }];

    // If no active chat, create one with first message as name and initial messages
    if (!chatId) {
      chatId = onFirstMessage(inputText, messagesWithPlaceholder);
    } else {
      onUpdateMessages(chatId, messagesWithPlaceholder);
    }

    let currentThinking = '';
    let currentContent = '';

    const thinkingListener = (thinking) => {
      currentThinking = thinking;
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: true
      }]);
    };

    const messageListener = (content) => {
      currentContent = content;
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: true
      }]);
    };

    window.electronAPI.onThinkingUpdate(thinkingListener);
    window.electronAPI.onMessageUpdate(messageListener);

    try {
      let response;
      const enabledMcpTools = mcpTools.filter(t => t.enabled);
      
      if (deepSearchEnabled) {
        // DeepSearch mode with tool use (includes web search, file search, etc.)
        setIsDeepSearching(true);
        setSearchSources([]); // Reset sources for new search
        setCurrentSources([]); // Reset current sources
        setCurrentPreviews([]); // Reset previews for new search
        setCurrentToolCalls([]); // Reset tool calls for new search
        setExpandedToolCalls(prev => ({ ...prev, [assistantMessageId]: true })); // Auto-expand tool calls
        setExpandedReasoning(prev => ({ ...prev, [assistantMessageId]: true })); // Auto-expand reasoning during DeepSearch
        response = await window.electronAPI.sendDeepSearchMessage(selectedModel, newMessages);
        setIsDeepSearching(false);
      } else if (enabledMcpTools.length > 0) {
        // MCP Tools mode (only MCP tools, no DeepSearch)
        setIsMcpProcessing(true);
        const enabledToolIds = enabledMcpTools.map(t => t.id);
        response = await window.electronAPI.sendMcpMessage(selectedModel, newMessages, enabledToolIds);
        setIsMcpProcessing(false);
      } else {
        // Normal streaming mode
        response = await window.electronAPI.sendOllamaMessage(selectedModel, newMessages);
      }
      
      // Use the streamed values to avoid flicker
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent || response.content,
        thinking: currentThinking || response.thinking,
        sources: deepSearchEnabled ? [...currentSources] : [], // Include search sources
        toolCalls: deepSearchEnabled ? [...currentToolCalls] : [], // Include tool calls
        previews: deepSearchEnabled ? [...currentPreviews] : [], // Include preview images
        id: assistantMessageId,
        isStreaming: false
      }]);
      setCurrentSources([]); // Clear after saving
      setCurrentToolCalls([]); // Clear tool calls after saving
      setCurrentPreviews([]); // Clear previews after saving
    } catch (error) {
      console.error('Ollama error:', error);
      setIsDeepSearching(false);
      setIsMcpProcessing(false);
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: 'Error: Could not connect to Ollama. Is it running?',
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: false
      }]);
    }
  }, [input, selectedModel, activeChatId, messages, onUpdateMessages, onFirstMessage, mcpTools, deepSearchEnabled, attachedImages]);

  const isNewChat = !activeChatId || messages.length === 0;

  const inputBox = (
    <div style={{
      padding: isNewChat ? '0' : '1.5rem',
      paddingBottom: isNewChat ? '0' : '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      width: '100%'
    }}>
      <div style={{
        width: '100%',
        background: '#2c2c2e',
        borderRadius: '20px',
        padding: '16px',
        boxShadow: '0 0 20px rgba(255, 255, 255, 0.05), 0 4px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Attached Images Preview */}
        {attachedImages.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '8px'
          }}>
            {attachedImages.map((img, index) => (
              <div key={index} style={{
                position: 'relative',
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <img 
                  src={img.dataUrl} 
                  alt={img.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onPaste={handlePaste}
          placeholder={attachedImages.length > 0 ? "Ask about the image(s)..." : "Message AI"}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'white',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: '1rem',
            height: '40px',
            minHeight: '40px'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Attach Button - expands on hover */}
            <button 
              className="expandable-btn"
              onClick={handleAttachImages}
              style={{
                background: attachedImages.length > 0 ? '#fff' : 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: attachedImages.length > 0 ? '#000' : '#888',
                cursor: 'pointer',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: attachedImages.length > 0 ? '6px' : '0px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (attachedImages.length === 0) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#ccc';
                }
                e.currentTarget.style.gap = '6px';
                e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                e.currentTarget.querySelector('.btn-label').style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                if (attachedImages.length === 0) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#888';
                  e.currentTarget.style.gap = '0px';
                  e.currentTarget.querySelector('.btn-label').style.width = '0';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '0';
                }
              }}
            >
              <Paperclip size={16} />
              <span className="btn-label" style={{ 
                width: attachedImages.length > 0 ? 'auto' : '0', 
                opacity: attachedImages.length > 0 ? '1' : '0', 
                overflow: 'hidden', 
                transition: 'all 0.3s ease' 
              }}>
                {attachedImages.length > 0 ? `${attachedImages.length} Image${attachedImages.length > 1 ? 's' : ''}` : 'Attach'}
              </span>
            </button>

            {/* DeepSearch Button - expands on hover, rotating glow when active */}
            <div style={{ 
              position: 'relative',
              borderRadius: '20px',
              padding: isDeepSearching ? '2px' : '0',
              background: isDeepSearching 
                ? 'conic-gradient(from var(--angle, 0deg), #ff6b6b, #feca57, #48dbfb, #ff9ff3, #ff6b6b)' 
                : 'transparent',
              animation: isDeepSearching ? 'rotate-glow 2s linear infinite' : 'none'
            }}>
              <style>
                {`
                  @property --angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                  }
                  @keyframes rotate-glow {
                    from { --angle: 0deg; }
                    to { --angle: 360deg; }
                  }
                `}
              </style>
              <button
                onClick={() => setDeepSearchEnabled(!deepSearchEnabled)}
                style={{
                  background: deepSearchEnabled ? '#fff' : '#2c2c2e',
                  border: isDeepSearching ? 'none' : '1px solid rgba(255,255,255,0.3)',
                  color: deepSearchEnabled ? '#000' : '#888',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px',
                  borderRadius: '18px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!deepSearchEnabled) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#ccc';
                  }
                  e.currentTarget.style.gap = '6px';
                  e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (!deepSearchEnabled) {
                    e.currentTarget.style.background = isDeepSearching ? '#2c2c2e' : 'transparent';
                    e.currentTarget.style.color = '#888';
                  }
                  e.currentTarget.style.gap = '0px';
                  e.currentTarget.querySelector('.btn-label').style.width = '0';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '0';
                }}
              >
                <Radar size={16} />
                <span className="btn-label" style={{ 
                  width: '0', 
                  opacity: '0', 
                  overflow: 'hidden', 
                  transition: 'all 0.3s ease' 
                }}>DeepSearch</span>
              </button>
            </div>

            {/* MCP Tools Button - expands on hover, rotating glow when processing */}
            <div style={{ 
              position: 'relative',
              borderRadius: '20px',
              padding: isMcpProcessing ? '2px' : '0',
              background: isMcpProcessing 
                ? 'conic-gradient(from var(--angle, 0deg), #ff6b6b, #feca57, #48dbfb, #ff9ff3, #ff6b6b)' 
                : 'transparent',
              animation: isMcpProcessing ? 'rotate-glow 2s linear infinite' : 'none'
            }}>
              <button
                onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                style={{
                  background: mcpTools.some(t => t.enabled) ? '#fff' : (isMcpProcessing ? '#2c2c2e' : 'transparent'),
                  border: isMcpProcessing ? 'none' : '1px solid rgba(255,255,255,0.3)',
                  color: mcpTools.some(t => t.enabled) ? '#000' : '#888',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px',
                  borderRadius: '18px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!mcpTools.some(t => t.enabled)) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#ccc';
                  }
                  e.currentTarget.style.gap = '6px';
                  e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (!mcpTools.some(t => t.enabled)) {
                    e.currentTarget.style.background = isMcpProcessing ? '#2c2c2e' : 'transparent';
                    e.currentTarget.style.color = '#888';
                  }
                  e.currentTarget.style.gap = '0px';
                  e.currentTarget.querySelector('.btn-label').style.width = '0';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '0';
                }}
              >
                <Wrench size={16} />
                <span className="btn-label" style={{ 
                  width: '0', 
                  opacity: '0', 
                  overflow: 'hidden', 
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Tools
                  {mcpTools.filter(t => t.enabled).length > 0 && (
                    <span style={{ fontSize: '0.75rem' }}>({mcpTools.filter(t => t.enabled).length})</span>
                  )}
                </span>
              </button>

              {isToolsMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setIsToolsMenuOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: '8px',
                    background: '#1f1f1f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '220px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: '500' }}>MCP Tools</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={handleRefreshTools}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                          title="Refresh tools"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={handleOpenToolsFolder}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                          title="Open tools folder"
                        >
                          <FolderOpen size={14} />
                        </button>
                      </div>
                    </div>

                    {mcpTools.length > 0 ? (
                      mcpTools.map(tool => (
                        <div
                          key={tool.id}
                          onClick={() => handleToggleTool(tool.id, !tool.enabled)}
                          style={{
                            padding: '8px 10px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s',
                            marginBottom: '2px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: tool.enabled ? 'none' : '1px solid #555',
                            background: tool.enabled ? '#4caf50' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {tool.enabled && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#ececec', fontWeight: '500' }}>{tool.name}</div>
                            {tool.description && (
                              <div style={{
                                color: '#888',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {tool.description}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '12px', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
                        No tools installed.<br />
                        <span
                          onClick={handleOpenToolsFolder}
                          style={{ color: '#6ea8fe', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Open tools folder
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#ececec';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#888';
                }}
              >
                {selectedModel || 'Select Model'}
                <ChevronDown size={14} />
              </button>

              {isModelMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setIsModelMenuOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '8px',
                    background: '#1f1f1f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '4px',
                    minWidth: '160px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    backdropFilter: 'blur(10px)'
                  }}>
                    {availableModels.length > 0 ? (
                      availableModels.map(model => (
                        <div
                          key={model}
                          onClick={() => {
                            setSelectedModel(model);
                            setIsModelMenuOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            color: selectedModel === model ? 'white' : '#aaa',
                            background: selectedModel === model ? 'rgba(255,255,255,0.1)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedModel !== model) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.color = '#ececec';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedModel !== model) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#aaa';
                            }
                          }}
                        >
                          {model}
                          {selectedModel === model && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '8px 12px', color: '#888', fontSize: '0.9rem' }}>
                        No models found. <br /> Is Ollama running?
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleSend}
              style={{
                background: (input.trim() || attachedImages.length > 0) ? 'white' : '#4a4a4a',
                color: (input.trim() || attachedImages.length > 0) ? 'black' : '#888',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (input.trim() || attachedImages.length > 0) ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
            >
              <ArrowUp size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      flex: 1,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 10,
      overflow: 'hidden'
    }}>
      {isNewChat ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          gap: '0.5rem',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '600',
            color: 'white',
            textAlign: 'center',
            opacity: 0.9
          }}>
            What can I help you with?
          </h1>
          {inputBox}
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <div style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              maxWidth: '800px',
              margin: '0 auto',
              width: '100%'
            }}>
              {messages.map((msg, i) => (
                <div key={msg.id || i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}>
                  {msg.role === 'user' ? (
                    <div style={{
                      maxWidth: '70%',
                      padding: '1rem 1.5rem',
                      borderRadius: '20px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.3)',
                      lineHeight: '1.5',
                      color: 'white'
                    }}>
                      {/* Show attached images */}
                      {msg.images && msg.images.length > 0 && (
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: msg.content ? '10px' : '0'
                        }}>
                          {msg.images.map((img, imgIndex) => (
                            <img 
                              key={imgIndex}
                              src={img.dataUrl || `data:${img.mimeType};base64,${img.base64}`}
                              alt={img.name || 'Attached image'}
                              style={{
                                maxWidth: '200px',
                                maxHeight: '150px',
                                borderRadius: '8px',
                                objectFit: 'contain',
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {msg.content}
                    </div>
                  ) : (
                    <div style={{
                      maxWidth: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      {/* TODO: Sources, Previews, and Tool Calls will be redesigned later */}

                      {/* Reasoning block for reasoning models */}
                      {msg.thinking && (
                        <div>
                          <div
                            onClick={() => setExpandedReasoning(prev => ({
                              ...prev,
                              [msg.id]: !prev[msg.id]
                            }))}
                            style={msg.isStreaming ? {
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              marginBottom: '0.5rem',
                              backgroundImage: 'linear-gradient(90deg, #666 0%, #aaa 50%, #666 100%)',
                              backgroundSize: '200% 100%',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              color: 'transparent',
                              animation: 'shimmer 2s linear infinite'
                            } : {
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              marginBottom: '0.5rem',
                              color: '#888',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!msg.isStreaming) e.currentTarget.style.color = '#bbb';
                            }}
                            onMouseLeave={(e) => {
                              if (!msg.isStreaming) e.currentTarget.style.color = '#888';
                            }}
                          >
                            {expandedReasoning[msg.id] ? (
                              <ChevronDown size={16} style={{ color: msg.isStreaming ? '#aaa' : 'inherit', flexShrink: 0 }} />
                            ) : (
                              <ChevronRight size={16} style={{ color: msg.isStreaming ? '#aaa' : 'inherit', flexShrink: 0 }} />
                            )}
                            <span>{msg.isStreaming ? 'Reasoning' : 'Finished Reasoning'}</span>
                          </div>

                          {expandedReasoning[msg.id] && (
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '1rem',
                              background: 'rgba(30, 30, 30, 0.6)',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              color: '#aaa',
                              fontSize: '0.85rem',
                              lineHeight: '1.6',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: 'monospace',
                              maxHeight: msg.isStreaming ? 'none' : '400px',
                              overflowY: msg.isStreaming ? 'visible' : 'auto'
                            }}>
                              {msg.thinking}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Thinking indicator for non-reasoning models */}
                      {msg.isStreaming && !msg.thinking && !msg.content && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            backgroundImage: 'linear-gradient(90deg, #666 0%, #aaa 50%, #666 100%)',
                            backgroundSize: '200% 100%',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent',
                            animation: 'shimmer 2s linear infinite'
                          }}
                        >
                          <span>Thinking</span>
                        </div>
                      )}
                      {/* Content - always show if there's content, even while streaming */}
                      {msg.content && (
                        <div style={{ lineHeight: '1.6', color: '#e0e0e0' }}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              code: ({ node, className, children, ...props }) => {
                                const codeContent = String(children).replace(/\n$/, '');
                                const language = className?.replace('language-', '') || '';
                                
                                // Check for chart code blocks
                                if (language === 'chart' || language === 'graph') {
                                  try {
                                    return <ChartRenderer config={codeContent} />;
                                  } catch (e) {
                                    // Fall through to regular code block
                                  }
                                }
                                
                                // Check if it's inline code (no newlines, short content, no language)
                                const isInline = !className && !codeContent.includes('\n') && codeContent.length < 100;
                                
                                return isInline ? (
                                  <code style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.9em',
                                    fontFamily: 'ui-monospace, monospace',
                                    color: '#f0f0f0'
                                  }} {...props}>{children}</code>
                                ) : (
                                  <code className={className} style={{
                                    display: 'block',
                                    background: 'rgba(30, 30, 30, 0.6)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    overflowX: 'auto',
                                    fontSize: '0.85rem',
                                    fontFamily: 'ui-monospace, monospace',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                  }} {...props}>{children}</code>
                                );
                              },
                              pre: ({ children }) => <div style={{ margin: '0.5rem 0' }}>{children}</div>,
                              p: ({ children }) => <p style={{ margin: '0.5rem 0', lineHeight: '1.6' }}>{children}</p>,
                              ul: ({ children }) => <ul style={{ marginLeft: '1.5rem', margin: '0.5rem 0' }}>{children}</ul>,
                              ol: ({ children }) => <ol style={{ marginLeft: '1.5rem', margin: '0.5rem 0' }}>{children}</ol>,
                              li: ({ children }) => <li style={{ margin: '0.25rem 0' }}>{children}</li>,
                              a: ({ children, href }) => <a href={href} style={{ color: '#6ea8fe', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">{children}</a>,
                              blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #555', paddingLeft: '1rem', margin: '0.5rem 0', color: '#aaa' }}>{children}</blockquote>,
                              h1: ({ children }) => <h1 style={{ fontSize: '1.5rem', fontWeight: '600', margin: '1rem 0 0.5rem' }}>{children}</h1>,
                              h2: ({ children }) => <h2 style={{ fontSize: '1.3rem', fontWeight: '600', margin: '1rem 0 0.5rem' }}>{children}</h2>,
                              h3: ({ children }) => <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0.75rem 0 0.5rem' }}>{children}</h3>,
                              table: ({ children }) => <table style={{ borderCollapse: 'collapse', margin: '0.5rem 0', width: '100%' }}>{children}</table>,
                              th: ({ children }) => <th style={{ border: '1px solid #555', padding: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>{children}</th>,
                              td: ({ children }) => <td style={{ border: '1px solid #555', padding: '0.5rem' }}>{children}</td>,
                              img: ({ src, alt }) => (
                                <img 
                                  src={src} 
                                  alt={alt || 'Image'} 
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '300px',
                                    borderRadius: '8px',
                                    margin: '0.5rem 0',
                                    objectFit: 'contain',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                  }}
                                  loading="lazy"
                                />
                              )
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {inputBox}
        </>
      )}
    </div>
  );
};

export default ChatArea;
