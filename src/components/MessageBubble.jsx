import { useState, memo, useMemo } from 'react';
import { ChevronDown, ChevronRight, Copy, Info, RotateCcw, Check, Image } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import ChartRenderer from './ChartRenderer';

// Memoize markdown plugins to prevent recreation
const remarkPlugins = [remarkGfm, remarkBreaks];
const rehypePlugins = [rehypeHighlight];

/**
 * MessageBubble - Renders a single chat message (user or assistant)
 * Memoized for performance - only re-renders when props change
 */
const MessageBubble = memo(({
  msg,
  index,
  theme,
  isDark,
  isDeepSearching,
  isReasoning,
  isWebSearching,
  searchedFavicons,
  imageGenProgress,
  onRegenerate,
  onCopy,
  onFullscreenImage,
  expandedReasoning,
  setExpandedReasoning,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredReasoningId, setHoveredReasoningId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);
  const [infoDropdownPosition, setInfoDropdownPosition] = useState('below');

  const handleCopy = async () => {
    const success = await onCopy(msg.content || '');
    if (success) {
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  // User message
  if (msg.role === 'user') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%'
      }}>
        <div style={{
          maxWidth: '70%',
          padding: '1rem 1.5rem',
          borderRadius: '20px',
          background: theme.userMessageBg,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
          lineHeight: '1.5',
          color: theme.text
        }}>
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
      </div>
    );
  }

  // Assistant message
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-start',
      width: '100%'
    }}>
      <div 
        style={{
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          if (showInfoDropdown) setShowInfoDropdown(false);
        }}
      >
        {/* Reasoning/Web Search block */}
        {(msg.thinking || (msg.isStreaming && isDeepSearching) || (msg.favicons && msg.favicons.length > 0)) && (
          <div>
            <div
              onClick={() => setExpandedReasoning(prev => ({
                ...prev,
                [msg.id]: !prev[msg.id]
              }))}
              onMouseEnter={() => setHoveredReasoningId(msg.id)}
              onMouseLeave={() => setHoveredReasoningId(null)}
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: (msg.isStreaming && (isReasoning || isWebSearching)) ? 'transparent' : (hoveredReasoningId === msg.id ? theme.text : theme.textSecondary),
                transition: 'color 0.2s',
                ...((msg.isStreaming && (isReasoning || isWebSearching)) && {
                  backgroundImage: isDark 
                    ? 'linear-gradient(90deg, #666 0%, #aaa 50%, #666 100%)'
                    : 'linear-gradient(90deg, #999 0%, #555 50%, #999 100%)',
                  backgroundSize: '200% 100%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  animation: 'shimmer 2s linear infinite'
                })
              }}
            >
              {expandedReasoning[msg.id] ? (
                <ChevronDown size={16} style={{ color: (msg.isStreaming && (isReasoning || isWebSearching)) ? theme.textSecondary : 'inherit', flexShrink: 0 }} />
              ) : (
                <ChevronRight size={16} style={{ color: (msg.isStreaming && (isReasoning || isWebSearching)) ? theme.textSecondary : 'inherit', flexShrink: 0 }} />
              )}
              <span>
                {msg.isStreaming 
                  ? (isWebSearching ? 'Searching Web' : (isReasoning ? 'Reasoning' : 'Finished Reasoning'))
                  : 'Finished Reasoning'
                }
              </span>
              
              {/* Favicons during streaming */}
              {searchedFavicons.length > 0 && msg.isStreaming && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '4px',
                  overflow: 'hidden',
                  maxWidth: (!msg.content || hoveredReasoningId === msg.id) ? '150px' : '0px',
                  opacity: (!msg.content || hoveredReasoningId === msg.id) ? 1 : 0,
                  transition: 'max-width 0.3s ease, opacity 0.3s ease'
                }}>
                  {searchedFavicons.slice(0, 6).map((fav, idx) => (
                    <img
                      key={fav.domain + idx}
                      src={`https://www.google.com/s2/favicons?domain=${fav.domain}&sz=32`}
                      alt={fav.domain}
                      title={fav.domain}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '3px',
                        opacity: 0.9,
                        flexShrink: 0
                      }}
                    />
                  ))}
                </div>
              )}
              
              {/* Saved favicons for completed messages */}
              {!msg.isStreaming && msg.favicons && msg.favicons.length > 0 && (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: '4px',
                    overflow: 'hidden',
                    maxWidth: hoveredReasoningId === msg.id ? '150px' : '0px',
                    opacity: hoveredReasoningId === msg.id ? 1 : 0,
                    transition: 'max-width 0.3s ease, opacity 0.3s ease'
                  }}
                >
                  {msg.favicons.slice(0, 6).map((fav, idx) => (
                    <img
                      key={fav.domain + idx}
                      src={`https://www.google.com/s2/favicons?domain=${fav.domain}&sz=32`}
                      alt={fav.domain}
                      title={fav.domain}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '3px',
                        opacity: 0.9,
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'opacity 0.2s, transform 0.2s'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.electronAPI?.openExternal(fav.url);
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.opacity = 1;
                        e.target.style.transform = 'scale(1.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = 0.9;
                        e.target.style.transform = 'scale(1)';
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {expandedReasoning[msg.id] && msg.thinking && (
              <div style={{
                marginTop: '0.5rem',
                padding: '1rem',
                background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(0, 0, 0, 0.04)',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                color: theme.textSecondary,
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

        {/* Thinking indicator */}
        {msg.isStreaming && !msg.thinking && !msg.content && !msg.isGenerating && !isDeepSearching && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: '500',
              backgroundImage: isDark 
                ? 'linear-gradient(90deg, #666 0%, #aaa 50%, #666 100%)'
                : 'linear-gradient(90deg, #999 0%, #555 50%, #999 100%)',
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

        {/* Content */}
        {msg.content && (
          <div style={{ lineHeight: '1.7', color: theme.text }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code: ({ node, className, children, ...props }) => {
                  const codeContent = String(children).replace(/\n$/, '');
                  const language = className?.replace('language-', '') || '';
                  
                  if (language === 'chart' || language === 'graph') {
                    try {
                      return <ChartRenderer config={codeContent} />;
                    } catch (e) {}
                  }
                  
                  const isInline = !className && !codeContent.includes('\n') && codeContent.length < 100;
                  
                  return isInline ? (
                    <code style={{
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      padding: '0.15em 0.4em',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                      fontFamily: 'ui-monospace, monospace',
                      color: isDark ? '#f0f0f0' : '#1a1a1a'
                    }} {...props}>{children}</code>
                  ) : (
                    <code className={className} style={{
                      display: 'block',
                      background: isDark ? 'rgba(30, 30, 30, 0.6)' : '#f6f8fa',
                      padding: '1em',
                      borderRadius: '8px',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
                      overflowX: 'auto',
                      fontSize: '0.85em',
                      fontFamily: 'ui-monospace, monospace',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: isDark ? '#e0e0e0' : '#24292e'
                    }} {...props}>{children}</code>
                  );
                },
                pre: ({ children }) => <div style={{ margin: '0.5em 0' }}>{children}</div>,
                p: ({ children }) => <p style={{ margin: '0.5em 0', lineHeight: '1.6' }}>{children}</p>,
                ul: ({ children }) => <ul style={{ marginLeft: '1.5em', margin: '0.5em 0' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ marginLeft: '1.5em', margin: '0.5em 0' }}>{children}</ol>,
                li: ({ children }) => <li style={{ margin: '0.25em 0' }}>{children}</li>,
                a: ({ children, href }) => <a href={href} style={{ color: isDark ? '#8ab4f8' : '#1a73e8', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">{children}</a>,
                blockquote: ({ children }) => <blockquote style={{ borderLeft: `3px solid ${theme.border}`, paddingLeft: '1em', margin: '0.5em 0', color: theme.textSecondary }}>{children}</blockquote>,
                h1: ({ children }) => <h1 style={{ fontSize: '1.5em', fontWeight: '600', margin: '1em 0 0.5em' }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ fontSize: '1.3em', fontWeight: '600', margin: '1em 0 0.5em' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ fontSize: '1.1em', fontWeight: '600', margin: '0.75em 0 0.5em' }}>{children}</h3>,
                table: ({ children }) => <table style={{ borderCollapse: 'collapse', margin: '0.5em 0', width: '100%' }}>{children}</table>,
                th: ({ children }) => <th style={{ border: `1px solid ${isDark ? '#555' : '#d0d7de'}`, padding: '0.5em', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>{children}</th>,
                td: ({ children }) => <td style={{ border: `1px solid ${isDark ? '#555' : '#d0d7de'}`, padding: '0.5em' }}>{children}</td>,
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
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
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

        {/* Generated Image */}
        {msg.generatedImage && (
          <div style={{ marginTop: '0.5rem' }}>
            <img 
              src={msg.generatedImage.dataUrl}
              alt="Generated image"
              onClick={() => onFullscreenImage(msg.generatedImage.dataUrl)}
              style={{
                maxWidth: '100%',
                maxHeight: '512px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,0,0,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
              }}
              title="Click to view fullscreen"
            />
          </div>
        )}

        {/* Action Buttons */}
        {!msg.isStreaming && !msg.isGenerating && (msg.content || msg.generatedImage) && (
          <div style={{
            display: 'flex',
            gap: '2px',
            marginTop: '8px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: isHovered ? 'auto' : 'none'
          }}>
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: copiedMessageId === msg.id ? '#4ade80' : '#666',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = copiedMessageId === msg.id ? '#4ade80' : '#aaa'}
              onMouseLeave={(e) => e.currentTarget.style.color = copiedMessageId === msg.id ? '#4ade80' : '#666'}
              title="Copy message"
            >
              {copiedMessageId === msg.id ? <Check size={16} /> : <Copy size={16} />}
            </button>

            {/* Info Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  if (showInfoDropdown) {
                    setShowInfoDropdown(false);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    setInfoDropdownPosition(spaceBelow > 320 || spaceBelow > spaceAbove ? 'below' : 'above');
                    setShowInfoDropdown(true);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: showInfoDropdown ? theme.textSecondary : theme.textMuted,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#aaa'}
                onMouseLeave={(e) => { if (!showInfoDropdown) e.currentTarget.style.color = theme.textMuted; }}
                title="Message info"
              >
                <Info size={16} />
              </button>

              {/* Info Dropdown */}
              {showInfoDropdown && (
                <>
                  <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setShowInfoDropdown(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    ...(infoDropdownPosition === 'above' 
                      ? { bottom: '100%', marginBottom: '4px' } 
                      : { top: '100%', marginTop: '4px' }),
                    left: '0',
                    background: theme.bgSecondary,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    padding: '10px 14px',
                    zIndex: 100,
                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.15)'
                  }}>
                    <table style={{ 
                      borderCollapse: 'collapse', 
                      fontSize: '0.72rem', 
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      lineHeight: '1.4'
                    }}>
                      <tbody>
                        {msg.model && (
                          <tr>
                            <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>model:</td>
                            <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.model.split('/').pop()}</td>
                          </tr>
                        )}
                        {msg.stats?.total_duration && (
                          <tr>
                            <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>total duration:</td>
                            <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.total_duration / 1e9).toFixed(2)}s</td>
                          </tr>
                        )}
                        {msg.stats?.eval_count && (
                          <tr>
                            <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>eval rate:</td>
                            <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {msg.stats.eval_rate 
                                ? `${msg.stats.eval_rate} tokens/s`
                                : msg.stats.eval_duration 
                                  ? `${(msg.stats.eval_count / (msg.stats.eval_duration / 1e9)).toFixed(2)} tokens/s`
                                  : 'N/A'}
                            </td>
                          </tr>
                        )}
                        {!msg.stats?.total_duration && !msg.stats?.eval_count && (
                          <tr>
                            <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>tokens (est.):</td>
                            <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.content ? Math.ceil(msg.content.length / 4) : 0}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Regenerate Button */}
            <button
              onClick={() => onRegenerate(index)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#666',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#aaa'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
              title="Regenerate response"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        )}

        {/* Image Generation Loading */}
        {msg.isGenerating && (
          <div>
            <div
              style={{
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
              }}
            >
              <Image size={16} style={{ color: theme.textSecondary }} />
              <span>{imageGenProgress || 'Generating image...'}</span>
            </div>
            <div style={{
              width: '320px',
              height: '320px',
              borderRadius: '12px',
              background: '#1a1a1c',
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #2a2a2e 0%, #1a1a1c 50%, #2a2a2e 100%)',
                backgroundSize: '200% 200%',
                animation: 'shimmer-bg 3s ease-in-out infinite'
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render when necessary
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.msg.isStreaming === nextProps.msg.isStreaming &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.isDeepSearching === nextProps.isDeepSearching &&
    prevProps.isReasoning === nextProps.isReasoning &&
    prevProps.imageGenProgress === nextProps.imageGenProgress &&
    prevProps.expandedReasoning === nextProps.expandedReasoning
  );
});

export default MessageBubble;
