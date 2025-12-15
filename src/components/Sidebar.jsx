import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, MoreHorizontal, MoreVertical, PanelLeft, Pencil, Trash2, Check, LogOut, Settings, Play, Square, Zap, BookOpen, X, ChevronDown, ChevronRight, HardDrive, Cloud, Compass, User, LogIn, UserPlus, Mail, Lock, Eye, EyeOff, Camera, Upload } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onToggleSidebar,
  hfUser,
  onOpenLoginModal,
  onHfLogout,
  onOpenSettings,
  onOpenModelCreator
}) => {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState('checking');
  const [ollamaServerStatus, setOllamaServerStatus] = useState(null);
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [docsSection, setDocsSection] = useState('about');
  const [docsDiscoveryExpanded, setDocsDiscoveryExpanded] = useState(true);
  const { theme, isDark } = useTheme();
  const { user, isLoggedIn, login, register, logout } = useAuth();
  
  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  
  // Avatar editor state
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  
  // HuggingFace connection state
  const [showHfConnect, setShowHfConnect] = useState(false);
  const [hfToken, setHfToken] = useState('');
  const [hfConnecting, setHfConnecting] = useState(false);
  const [hfError, setHfError] = useState('');
  
  // Docker connection state
  const [dockerStatus, setDockerStatus] = useState({ running: false, checking: true });
  
  const [avatarImage, setAvatarImage] = useState(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarPosition, setAvatarPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const avatarCanvasRef = useRef(null);

  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Register Ollama status listener immediately
    if (window.electronAPI?.onOllamaStatus) {
      window.electronAPI.onOllamaStatus((status) => {
        setOllamaStatus(status);
        if (status === 'running') {
          setIsStartingServer(false);
        }
      });
    }
    
    // Defer status checks to not block initial render
    const timer = setTimeout(() => {
      // Check bundled Ollama status
      if (window.electronAPI?.getOllamaServerStatus) {
        window.electronAPI.getOllamaServerStatus().then(status => {
          setOllamaServerStatus(status);
        }).catch(() => {});
      }
      
      // Check Docker status
      if (window.electronAPI?.checkDockerStatus) {
        window.electronAPI.checkDockerStatus().then(status => {
          setDockerStatus({ running: status?.running || false, version: status?.version, checking: false });
        }).catch(() => {
          setDockerStatus({ running: false, checking: false });
        });
      } else {
        setDockerStatus({ running: false, checking: false });
      }
    }, 500); // Delay checks by 500ms to let UI render first
    
    return () => clearTimeout(timer);
  }, []);

  const handleStartServer = async () => {
    if (isStartingServer) return;
    setIsStartingServer(true);
    try {
      await window.electronAPI.startOllamaServer();
    } catch (error) {
      console.error('Failed to start Ollama server:', error);
      setIsStartingServer(false);
    }
  };

  const handleStopServer = async () => {
    try {
      await window.electronAPI.stopOllamaServer();
      const status = await window.electronAPI.getOllamaServerStatus();
      setOllamaServerStatus(status);
    } catch (error) {
      console.error('Failed to stop Ollama server:', error);
    }
  };

  const openLoginModal = () => {
    setShowUserMenu(false);
    onOpenLoginModal();
  };

  const handleHfLogout = () => {
    setShowUserMenu(false);
    onHfLogout();
  };

  const openAuthModal = (mode = 'login') => {
    setShowUserMenu(false);
    setAuthMode(mode);
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    setAuthError('');
    setShowAuthModal(true);
  };

  const handleAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please fill in all fields');
      return;
    }
    
    setIsAuthLoading(true);
    setAuthError('');
    
    try {
      let result;
      if (authMode === 'login') {
        result = await login(authEmail, authPassword);
      } else {
        if (!authName.trim()) {
          setAuthError('Please enter your name');
          setIsAuthLoading(false);
          return;
        }
        result = await register(authEmail, authPassword, authName);
      }
      
      if (result.success) {
        setShowAuthModal(false);
      } else {
        setAuthError(result.error || 'Authentication failed');
      }
    } catch (error) {
      setAuthError(error.message || 'An error occurred');
    }
    
    setIsAuthLoading(false);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
        setConfirmDeleteId(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleStartRename = (chat) => {
    setEditingId(chat.id);
    setEditValue(chat.name);
    setActiveMenuId(null);
  };

  const handleFinishRename = () => {
    if (editingId) {
      onRenameChat(editingId, editValue);
      setEditingId(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleFinishRename();
    if (e.key === 'Escape') setEditingId(null);
  };

  const handleDeleteClick = (e, chatId) => {
    e.stopPropagation();
    if (confirmDeleteId === chatId) {
      onDeleteChat(chatId);
      setConfirmDeleteId(null);
      setActiveMenuId(null);
    } else {
      setConfirmDeleteId(chatId);
    }
  };

  return (
    <div style={{
      width: '260px',
      height: '100%',
      background: theme.bgSecondary,
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem',
      paddingBottom: '1rem',
      zIndex: 10,
      position: 'relative',
      color: theme.text,
      borderRight: `1px solid ${theme.border}`,
      transition: 'background 0.3s, color 0.3s'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '0 4px',
        gap: '8px'
      }}>
        <div
          onClick={onNewChat}
          style={{
            flex: 1,
            padding: '6px 10px',
            background: theme.bgActive,
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s',
            fontSize: '0.85rem',
            fontWeight: '500',
            color: theme.text,
            WebkitAppRegion: 'no-drag'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
          onMouseLeave={(e) => e.currentTarget.style.background = theme.bgActive}
        >
          <Plus size={15} />
          <span>New Chat</span>
        </div>

        <button
          onClick={onToggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            padding: '4px',
            WebkitAppRegion: 'no-drag',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <PanelLeft size={20} />
        </button>
      </div>

      <div style={{
        fontSize: '0.75rem',
        color: theme.textSecondary,
        marginBottom: '12px',
        paddingLeft: '8px',
        fontWeight: '500'
      }}>
        Recent Chats
      </div>

      {/* Chat List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            style={{
              position: 'relative',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '2px',
              color: theme.text,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background 0.2s',
              background: activeChatId === chat.id ? theme.bgActive : 'transparent'
            }}
            onMouseEnter={(e) => {
              if (activeChatId !== chat.id) e.currentTarget.style.background = theme.bgHover;
              const btn = e.currentTarget.querySelector('.more-btn');
              if (btn) btn.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              if (activeChatId !== chat.id) e.currentTarget.style.background = 'transparent';
              const btn = e.currentTarget.querySelector('.more-btn');
              if (btn && activeMenuId !== chat.id) btn.style.opacity = '0';
            }}
          >
            {editingId === chat.id ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'transparent',
                  border: '1px solid #4a4a4a',
                  borderRadius: '4px',
                  color: 'white',
                  width: '100%',
                  padding: '2px 4px',
                  fontSize: 'inherit',
                  outline: 'none'
                }}
              />
            ) : (
              <>
                <div style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  marginRight: '8px'
                }}>
                  {chat.name}
                </div>

                <button
                  className="more-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                    setConfirmDeleteId(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: activeMenuId === chat.id ? 1 : 0,
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {activeMenuId === chat.id && (
                  <div ref={menuRef} style={{
                    position: 'absolute',
                    right: '10px',
                    top: '30px',
                    background: theme.bgSecondary,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    padding: '4px',
                    zIndex: 100,
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: '120px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(chat);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: theme.text,
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Pencil size={14} />
                      Rename
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, chat.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px',
                        background: confirmDeleteId === chat.id ? theme.errorBg : 'transparent',
                        border: 'none',
                        color: theme.error,
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        textAlign: 'left',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.errorBg}
                      onMouseLeave={(e) => e.currentTarget.style.background = confirmDeleteId === chat.id ? theme.errorBg : 'transparent'}
                    >
                      {confirmDeleteId === chat.id ? <Check size={14} /> : <Trash2 size={14} />}
                      {confirmDeleteId === chat.id ? 'Confirm' : 'Delete'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* OpenMind Create Button */}
      <button
        onClick={onOpenModelCreator}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: theme.bgActive,
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          color: theme.text,
          fontSize: '0.8rem',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
        onMouseLeave={(e) => e.currentTarget.style.background = theme.bgActive}
      >
        <Zap size={14} color={theme.accent} />
        <span>OpenMind Create</span>
      </button>

      {/* Ollama Status */}
      <div style={{
        padding: '8px 12px',
        fontSize: '0.75rem',
        color: ollamaStatus === 'running' ? theme.success : theme.error,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '6px',
        marginBottom: '8px'
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: ollamaStatus === 'running' ? theme.success : isStartingServer ? theme.warning : theme.error,
          boxShadow: ollamaStatus === 'running' ? `0 0 4px ${theme.success}` : 'none',
          animation: isStartingServer ? 'pulse 1s infinite' : 'none'
        }} />
        <span style={{ flex: 1 }}>
          {ollamaStatus === 'running' 
            ? 'Ollama Connected' 
            : isStartingServer 
              ? 'Starting...' 
              : 'Ollama Disconnected'}
        </span>
        
        {/* Start/Stop Button - only show if bundled Ollama is available */}
        {ollamaServerStatus?.hasBundled && (
          ollamaStatus === 'running' && ollamaServerStatus?.processRunning ? (
            <button
              onClick={handleStopServer}
              title="Stop Ollama Server"
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.error,
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme.errorBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Square size={14} />
            </button>
          ) : ollamaStatus !== 'running' && !isStartingServer && (
            <button
              onClick={handleStartServer}
              title="Start Ollama Server"
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.success,
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme.successBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Play size={14} />
            </button>
          )
        )}
      </div>

      {/* Bottom Profile Section */}
      <div style={{ paddingTop: '0.5rem', marginTop: 'auto', position: 'relative' }} ref={userMenuRef}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background 0.2s',
          background: showUserMenu ? 'rgba(255,255,255,0.05)' : 'transparent'
        }}
          onClick={() => setShowUserMenu(!showUserMenu)}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => { if (!showUserMenu) e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isLoggedIn && !user?.avatar
              ? isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
              : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: isLoggedIn ? theme.text : theme.textMuted,
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {isLoggedIn ? (
              user?.avatar ? (
                <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.name?.charAt(0).toUpperCase()
              )
            ) : (
              <User size={16} />
            )}
          </div>
          <div style={{ 
            flex: 1, 
            fontSize: '0.9rem', 
            fontWeight: '500', 
            color: isLoggedIn ? theme.text : theme.textSecondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '32px'
          }}>
            {isLoggedIn ? user.name : 'Not logged in'}
          </div>
          <MoreVertical size={16} color="#888" style={{ flexShrink: 0 }} />
        </div>

        {/* User Dropup Menu */}
        {showUserMenu && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '0',
            right: '0',
            marginBottom: '4px',
            background: theme.bgSecondary,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            padding: '4px',
            zIndex: 100,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.3)'
          }}>
            {/* Account Settings - only when logged in */}
            {isLoggedIn && (
              <button
                onClick={() => {
                  setShowAccountSettings(true);
                  setShowUserMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: theme.text,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <User size={14} />
                Account
              </button>
            )}
            
            {/* Docs */}
            <button
              onClick={() => {
                setShowDocs(true);
                setShowUserMenu(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: theme.text,
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '0.85rem',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <BookOpen size={14} />
              Docs
            </button>
            
            {/* Settings */}
            <button
              onClick={() => {
                onOpenSettings?.();
                setShowUserMenu(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: theme.text,
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '0.85rem',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Settings size={14} />
              Settings
            </button>
            
            {/* Divider */}
            <div style={{ height: '1px', background: theme.border, margin: '4px 0' }} />
            
            {/* Login / Logout - always at bottom */}
            {!isLoggedIn ? (
              <button
                onClick={() => openAuthModal('login')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: theme.text,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogIn size={14} />
                Login
              </button>
            ) : (
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; }}
              >
                <LogOut size={14} />
                Logout
              </button>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && createPortal(
        <div
          onClick={() => setShowAuthModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.bg,
              borderRadius: '8px',
              width: '360px',
              maxWidth: '90vw',
              border: `1px solid ${theme.border}`,
              boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} color={isDark ? '#fff' : '#1a1a1a'} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
                  {authMode === 'login' ? 'Login' : 'Create Account'}
                </h3>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                style={{
                  background: 'transparent', border: 'none', color: theme.textSecondary,
                  cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              {/* Error */}
              {authError && (
                <div style={{
                  padding: '10px 12px', borderRadius: '6px', marginBottom: '16px',
                  background: theme.bgTertiary,
                  border: `1px solid ${theme.border}`,
                  color: theme.textSecondary, fontSize: '0.85rem',
                }}>
                  {authError}
                </div>
              )}

              {/* Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {authMode === 'register' && (
                  <div>
                    <label style={{ display: 'block', color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '6px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Your name"
                      style={{
                        width: '100%', padding: '10px 12px',
                        background: theme.bgTertiary, border: `1px solid ${theme.border}`,
                        borderRadius: '6px', color: theme.text, fontSize: '0.9rem',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'block', color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '6px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: theme.bgTertiary, border: `1px solid ${theme.border}`,
                      borderRadius: '6px', color: theme.text, fontSize: '0.9rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '6px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                      placeholder="••••••••"
                      style={{
                        width: '100%', padding: '10px 40px 10px 12px',
                        background: theme.bgTertiary, border: `1px solid ${theme.border}`,
                        borderRadius: '6px', color: theme.text, fontSize: '0.9rem',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none', color: theme.textMuted,
                        cursor: 'pointer', padding: '4px', display: 'flex',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAuth}
                  disabled={isAuthLoading}
                  style={{
                    width: '100%', padding: '12px',
                    background: isDark ? '#fff' : '#1a1a1a',
                    border: 'none', borderRadius: '6px', color: isDark ? '#000' : '#fff',
                    fontSize: '0.9rem', fontWeight: '500', cursor: isAuthLoading ? 'wait' : 'pointer',
                    marginTop: '4px', opacity: isAuthLoading ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (!isAuthLoading) e.currentTarget.style.background = isDark ? '#e0e0e0' : '#333'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? '#fff' : '#1a1a1a'; }}
                >
                  {isAuthLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </div>

              {/* Switch mode */}
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <span style={{ color: theme.textMuted, fontSize: '0.85rem' }}>
                  {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                </span>
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError('');
                  }}
                  style={{
                    background: 'transparent', border: 'none',
                    color: theme.text, textDecoration: 'underline',
                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500',
                  }}
                >
                  {authMode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Account Settings Modal */}
      {showAccountSettings && isLoggedIn && createPortal(
        <div
          onClick={() => setShowAccountSettings(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.bg,
              borderRadius: '8px',
              width: '420px',
              maxWidth: '90vw',
              border: `1px solid ${theme.border}`,
              boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} color={isDark ? '#fff' : '#1a1a1a'} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
                  Account Settings
                </h3>
              </div>
              <button
                onClick={() => setShowAccountSettings(false)}
                style={{
                  background: 'transparent', border: 'none', color: theme.textSecondary,
                  cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Avatar & Profile */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Profile
                </label>
                <div style={{ 
                  padding: '16px', background: theme.bgTertiary, borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Avatar with upload */}
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: '600', color: theme.text,
                        overflow: 'hidden',
                      }}>
                        {user?.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt="Avatar" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          user?.name?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                      {/* Upload button overlay */}
                      <label style={{
                        position: 'absolute', bottom: '-4px', right: '-4px',
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: isDark ? '#fff' : '#1a1a1a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', border: `2px solid ${theme.bg}`,
                      }}>
                        <Camera size={12} color={isDark ? '#000' : '#fff'} />
                        <input
                          type="file"
                          accept="image/*,.gif"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            // Check file size (max 20MB)
                            if (file.size > 20 * 1024 * 1024) {
                              alert('Image must be less than 20MB');
                              return;
                            }
                            
                            // Convert to base64 and open editor
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result;
                              if (base64 && typeof base64 === 'string') {
                                setAvatarImage(base64);
                                setAvatarZoom(1);
                                setAvatarPosition({ x: 0, y: 0 });
                                setShowAvatarEditor(true);
                              }
                            };
                            reader.readAsDataURL(file);
                            e.target.value = ''; // Reset input
                          }}
                        />
                      </label>
                    </div>
                    
                    {/* Name & Email */}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: theme.text, fontSize: '1rem', fontWeight: '500', marginBottom: '2px' }}>{user?.name}</div>
                      <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>{user?.email}</div>
                      {user?.avatar && (
                        <button
                          onClick={async () => {
                            const result = await window.electronAPI?.authUpdateProfile({ avatar: null });
                            if (result?.success) {
                              window.location.reload();
                            }
                          }}
                          style={{
                            marginTop: '8px', padding: '4px 8px', background: 'transparent',
                            border: `1px solid ${theme.border}`, borderRadius: '4px',
                            color: theme.textMuted, cursor: 'pointer', fontSize: '0.7rem',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                        >
                          Remove avatar
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Avatar hint */}
                  <div style={{ marginTop: '12px', padding: '8px 10px', background: theme.bgSecondary, borderRadius: '4px' }}>
                    <div style={{ color: theme.textMuted, fontSize: '0.75rem' }}>
                      Supports JPG, PNG, GIF (animated). Max 20MB.
                    </div>
                  </div>
                </div>
              </div>

              {/* Connections Section */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Connections
                </label>
                
                {/* HuggingFace */}
                <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: theme.textMuted }}>HuggingFace</div>
                <div style={{ 
                  padding: '14px', background: theme.bgTertiary, borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                }}>
                  {user?.huggingface ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>🤗</span>
                        <span style={{ color: theme.text, fontSize: '0.9rem' }}>{user.huggingface.username}</span>
                      </div>
                      <button
                        onClick={async () => {
                          await window.electronAPI?.authDisconnectHuggingFace();
                          window.location.reload();
                        }}
                        style={{
                          padding: '6px 12px', background: 'transparent',
                          border: `1px solid ${theme.border}`, borderRadius: '4px',
                          color: theme.textSecondary, cursor: 'pointer', fontSize: '0.8rem',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : !showHfConnect ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.textMuted, fontSize: '0.85rem' }}>Not connected</span>
                      <button
                        onClick={() => {
                          setShowHfConnect(true);
                          setHfToken('');
                          setHfError('');
                        }}
                        style={{
                          padding: '6px 12px', background: isDark ? '#fff' : '#1a1a1a',
                          border: 'none', borderRadius: '4px',
                          color: isDark ? '#000' : '#fff', cursor: 'pointer', fontSize: '0.8rem',
                        }}
                      >
                        Connect
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {hfError && (
                        <div style={{
                          padding: '8px 10px', borderRadius: '4px',
                          background: theme.bgSecondary, border: `1px solid ${theme.border}`,
                          color: theme.textSecondary, fontSize: '0.8rem',
                        }}>
                          {hfError}
                        </div>
                      )}
                      <div>
                        <label style={{ display: 'block', color: theme.textMuted, fontSize: '0.75rem', marginBottom: '6px' }}>
                          Access Token
                        </label>
                        <input
                          type="password"
                          value={hfToken}
                          onChange={(e) => setHfToken(e.target.value)}
                          placeholder="hf_..."
                          style={{
                            width: '100%', padding: '8px 10px',
                            background: theme.bgSecondary, border: `1px solid ${theme.border}`,
                            borderRadius: '4px', color: theme.text, fontSize: '0.85rem',
                            outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <button
                          onClick={() => window.electronAPI?.openExternal('https://huggingface.co/settings/tokens')}
                          style={{
                            padding: '6px 10px', background: 'transparent',
                            border: 'none', borderRadius: '4px',
                            color: theme.textMuted, cursor: 'pointer', fontSize: '0.75rem',
                            textDecoration: 'underline',
                          }}
                        >
                          Get token
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setShowHfConnect(false)}
                            style={{
                              padding: '6px 12px', background: 'transparent',
                              border: `1px solid ${theme.border}`, borderRadius: '4px',
                              color: theme.textSecondary, cursor: 'pointer', fontSize: '0.8rem',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!hfToken.trim()) {
                                setHfError('Please enter your token');
                                return;
                              }
                              setHfConnecting(true);
                              setHfError('');
                              try {
                                // Verify token by fetching user info
                                const response = await fetch('https://huggingface.co/api/whoami-v2', {
                                  headers: { Authorization: `Bearer ${hfToken}` }
                                });
                                if (!response.ok) {
                                  setHfError('Invalid token');
                                  setHfConnecting(false);
                                  return;
                                }
                                const data = await response.json();
                                const username = data.name || data.fullname || 'User';
                                
                                // Save connection
                                await window.electronAPI?.authConnectHuggingFace(hfToken, username);
                                setShowHfConnect(false);
                                window.location.reload();
                              } catch (err) {
                                setHfError('Connection failed');
                              }
                              setHfConnecting(false);
                            }}
                            disabled={hfConnecting}
                            style={{
                              padding: '6px 12px', background: isDark ? '#fff' : '#1a1a1a',
                              border: 'none', borderRadius: '4px',
                              color: isDark ? '#000' : '#fff', cursor: hfConnecting ? 'wait' : 'pointer',
                              fontSize: '0.8rem', opacity: hfConnecting ? 0.6 : 1,
                            }}
                          >
                            {hfConnecting ? 'Connecting...' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Docker */}
                <div style={{ marginTop: '16px', marginBottom: '10px', fontSize: '0.8rem', color: theme.textMuted }}>Docker</div>
                <div style={{ 
                  padding: '14px', background: theme.bgTertiary, borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: dockerStatus.checking 
                          ? theme.warning 
                          : dockerStatus.running 
                            ? theme.success 
                            : theme.error,
                      }} />
                      <span style={{ color: theme.text, fontSize: '0.9rem' }}>
                        {dockerStatus.checking 
                          ? 'Checking...' 
                          : dockerStatus.running 
                            ? `Running${dockerStatus.version ? ` (v${dockerStatus.version})` : ''}`
                            : 'Not running'}
                      </span>
                    </div>
                    {!dockerStatus.running && !dockerStatus.checking && (
                      <button
                        onClick={async () => {
                          try {
                            setDockerStatus({ ...dockerStatus, checking: true });
                            const status = await window.electronAPI?.checkDockerStatus();
                            setDockerStatus({ running: status?.running || false, version: status?.version, checking: false });
                          } catch (err) {
                            setDockerStatus({ running: false, checking: false });
                          }
                        }}
                        style={{
                          padding: '6px 12px', background: 'transparent',
                          border: `1px solid ${theme.border}`, borderRadius: '4px',
                          color: theme.textSecondary, cursor: 'pointer', fontSize: '0.8rem',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                      >
                        Refresh
                      </button>
                    )}
                  </div>
                  {!dockerStatus.running && !dockerStatus.checking && (
                    <div style={{ marginTop: '10px', fontSize: '0.75rem', color: theme.textMuted }}>
                      Start Docker Desktop to enable SearXNG and other containerized services.
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Status */}
              <div>
                <label style={{ display: 'block', color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Subscription
                </label>
                <div style={{ 
                  padding: '14px', background: theme.bgTertiary, borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>
                        {user?.subscription ? 'Pro' : 'Free'}
                      </div>
                      <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
                        {user?.subscription ? 'H200 GPU access enabled' : 'Upgrade for training features'}
                      </div>
                    </div>
                    {!user?.subscription && (
                      <button
                        onClick={() => {
                          setShowAccountSettings(false);
                          onOpenModelCreator?.();
                        }}
                        style={{
                          padding: '6px 12px', background: isDark ? '#fff' : '#1a1a1a',
                          border: 'none', borderRadius: '4px',
                          color: isDark ? '#000' : '#fff', cursor: 'pointer', fontSize: '0.8rem',
                        }}
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Avatar Editor Modal - Discord-style */}
      {showAvatarEditor && avatarImage && createPortal(
        <div
          onClick={() => setShowAvatarEditor(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.bg,
              borderRadius: '8px',
              width: '480px',
              maxWidth: '95vw',
              border: `1px solid ${theme.border}`,
              boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 16px 48px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
                Edit Image
              </h3>
              <button
                onClick={() => setShowAvatarEditor(false)}
                style={{
                  background: 'transparent', border: 'none', color: theme.textSecondary,
                  cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Area */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              {/* Image Container with Circular Mask */}
              <div
                style={{
                  width: '280px',
                  height: '280px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  background: theme.bgTertiary,
                  border: `3px solid ${theme.border}`,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - avatarPosition.x, y: e.clientY - avatarPosition.y });
                }}
                onMouseMove={(e) => {
                  if (!isDragging) return;
                  const newX = e.clientX - dragStart.x;
                  const newY = e.clientY - dragStart.y;
                  // Limit movement based on zoom
                  const maxOffset = 140 * (avatarZoom - 1);
                  setAvatarPosition({
                    x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
                    y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
                  });
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.1 : 0.1;
                  const newZoom = Math.max(1, Math.min(3, avatarZoom + delta));
                  setAvatarZoom(newZoom);
                  // Adjust position if it would be out of bounds
                  const maxOffset = 140 * (newZoom - 1);
                  setAvatarPosition({
                    x: Math.max(-maxOffset, Math.min(maxOffset, avatarPosition.x)),
                    y: Math.max(-maxOffset, Math.min(maxOffset, avatarPosition.y)),
                  });
                }}
              >
                <img
                  src={avatarImage}
                  alt="Avatar preview"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    width: `${100 * avatarZoom}%`,
                    height: `${100 * avatarZoom}%`,
                    objectFit: 'cover',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${avatarPosition.x}px), calc(-50% + ${avatarPosition.y}px))`,
                    userSelect: 'none',
                  }}
                />
              </div>

              {/* Zoom Slider */}
              <div style={{ width: '100%', maxWidth: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>Zoom</span>
                  <span style={{ color: theme.textMuted, fontSize: '0.8rem' }}>{avatarZoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={avatarZoom}
                  onChange={(e) => {
                    const newZoom = parseFloat(e.target.value);
                    setAvatarZoom(newZoom);
                    // Adjust position if it would be out of bounds
                    const maxOffset = 140 * (newZoom - 1);
                    setAvatarPosition({
                      x: Math.max(-maxOffset, Math.min(maxOffset, avatarPosition.x)),
                      y: Math.max(-maxOffset, Math.min(maxOffset, avatarPosition.y)),
                    });
                  }}
                  style={{
                    width: '100%',
                    height: '4px',
                    appearance: 'none',
                    background: theme.bgTertiary,
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Hint */}
              <div style={{ color: theme.textMuted, fontSize: '0.8rem', textAlign: 'center' }}>
                Drag to reposition • Scroll or use slider to zoom
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{
              padding: '14px 18px',
              borderTop: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <button
                onClick={() => {
                  setAvatarZoom(1);
                  setAvatarPosition({ x: 0, y: 0 });
                }}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
              >
                Reset
              </button>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowAvatarEditor(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '4px',
                    color: theme.textSecondary,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    // Check if it's a GIF - GIFs need to be saved as-is to preserve animation
                    const isGif = avatarImage.startsWith('data:image/gif');
                    
                    if (isGif) {
                      // For GIFs, save the original to preserve animation
                      // Note: cropping/zooming won't be applied to GIFs
                      const result = await window.electronAPI?.authUpdateProfile({ avatar: avatarImage });
                      if (result?.success) {
                        window.location.reload();
                      }
                      setShowAvatarEditor(false);
                      return;
                    }
                    
                    // For non-GIF images, create canvas and draw cropped circular image
                    const canvas = document.createElement('canvas');
                    const size = 256; // Output size
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx) return;
                    
                    // Load image
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = async () => {
                      // Calculate crop area based on zoom and position
                      const previewSize = 280;
                      const imgAspect = img.width / img.height;
                      
                      let drawWidth, drawHeight;
                      if (imgAspect > 1) {
                        drawHeight = previewSize * avatarZoom;
                        drawWidth = drawHeight * imgAspect;
                      } else {
                        drawWidth = previewSize * avatarZoom;
                        drawHeight = drawWidth / imgAspect;
                      }
                      
                      // Scale factor from preview to actual image
                      const scaleX = img.width / drawWidth;
                      const scaleY = img.height / drawHeight;
                      
                      // Center offset in preview
                      const centerX = (drawWidth - previewSize) / 2 - avatarPosition.x;
                      const centerY = (drawHeight - previewSize) / 2 - avatarPosition.y;
                      
                      // Source rectangle in original image
                      const sx = centerX * scaleX;
                      const sy = centerY * scaleY;
                      const sWidth = previewSize * scaleX;
                      const sHeight = previewSize * scaleY;
                      
                      // Create circular clip
                      ctx.beginPath();
                      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                      ctx.closePath();
                      ctx.clip();
                      
                      // Draw image
                      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);
                      
                      // Convert to base64
                      const base64 = canvas.toDataURL('image/png', 0.9);
                      
                      // Save avatar
                      const result = await window.electronAPI?.authUpdateProfile({ avatar: base64 });
                      if (result?.success) {
                        // Refresh user in context
                        window.location.reload();
                      }
                      
                      setShowAvatarEditor(false);
                    };
                    img.src = avatarImage;
                  }}
                  style={{
                    padding: '8px 20px',
                    background: isDark ? '#fff' : '#1a1a1a',
                    border: 'none',
                    borderRadius: '4px',
                    color: isDark ? '#000' : '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#e0e0e0' : '#333'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isDark ? '#fff' : '#1a1a1a'}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Docs Modal - rendered via portal to escape stacking context */}
      {showDocs && createPortal(
        <div
          onClick={() => setShowDocs(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.bg,
              borderRadius: '8px',
              width: '900px',
              maxWidth: '94vw',
              height: '700px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: `1px solid ${theme.border}`,
              boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderBottom: `1px solid ${theme.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color={isDark ? '#fff' : '#1a1a1a'} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
                  Documentation
                </h3>
              </div>
              <button
                onClick={() => setShowDocs(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  display: 'flex',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Sidebar */}
              <div style={{
                width: '200px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: theme.bgSecondary,
                borderRight: `1px solid ${theme.border}`,
              }}>
                {/* About */}
                <button
                  onClick={() => setDocsSection('about')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: docsSection === 'about' ? theme.bgActive : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: docsSection === 'about' ? theme.text : theme.textSecondary,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: docsSection === 'about' ? '500' : '400',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => { if (docsSection !== 'about') { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
                  onMouseLeave={(e) => { if (docsSection !== 'about') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
                >
                  <BookOpen size={18} />
                  About
                </button>

                {/* OpenMind Create Dropdown */}
                <div>
                  <button
                    onClick={() => setDocsDiscoveryExpanded(!docsDiscoveryExpanded)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 12px',
                      background: (docsSection === 'local' || docsSection === 'cloud') ? theme.bgActive : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: (docsSection === 'local' || docsSection === 'cloud') ? theme.text : theme.textSecondary,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { if (docsSection !== 'local' && docsSection !== 'cloud') { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
                    onMouseLeave={(e) => { if (docsSection !== 'local' && docsSection !== 'cloud') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
                  >
                    <Zap size={18} />
                    <span style={{ flex: 1 }}>OpenMind Create</span>
                    {docsDiscoveryExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {docsDiscoveryExpanded && (
                    <div style={{ marginLeft: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={() => setDocsSection('local')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: docsSection === 'local' ? theme.bgActive : 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          color: docsSection === 'local' ? theme.text : theme.textSecondary,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          width: '100%',
                        }}
                        onMouseEnter={(e) => { if (docsSection !== 'local') { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
                        onMouseLeave={(e) => { if (docsSection !== 'local') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
                      >
                        <HardDrive size={14} />
                        Local Models
                      </button>
                      <button
                        onClick={() => setDocsSection('cloud')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: docsSection === 'cloud' ? theme.bgActive : 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          color: docsSection === 'cloud' ? theme.text : theme.textSecondary,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          width: '100%',
                        }}
                        onMouseEnter={(e) => { if (docsSection !== 'cloud') { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
                        onMouseLeave={(e) => { if (docsSection !== 'cloud') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
                      >
                        <Cloud size={14} />
                        Cloud Models
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                {docsSection === 'about' && (
                  <div style={{ color: theme.textSecondary, lineHeight: '1.7' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: theme.text, fontWeight: '600' }}>
                      🧠 AI for Everyone
                    </h2>
                    <p style={{ margin: '0 0 20px 0' }}>
                      OpenMind is built with one mission: to make AI accessible to everyone, regardless of technical background or experience level.
                    </p>
                    
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: theme.text, fontWeight: '600' }}>
                      🎯 Our Vision
                    </h3>
                    <p style={{ margin: '0 0 20px 0' }}>
                      Whether you're a complete beginner curious about AI, a student learning to code, a professional looking to boost productivity, or an expert building advanced applications — OpenMind meets you where you are.
                    </p>

                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: theme.text, fontWeight: '600' }}>
                      ✨ Key Features
                    </h3>
                    <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '8px' }}>Run AI models locally on your own hardware — no cloud required</li>
                      <li style={{ marginBottom: '8px' }}>Connect to Ollama, HuggingFace, and local GGUF models</li>
                      <li style={{ marginBottom: '8px' }}>Create custom AI assistants with OpenMind Create</li>
                      <li style={{ marginBottom: '8px' }}>Deep Search for intelligent web research</li>
                      <li style={{ marginBottom: '8px' }}>Privacy-first: your data stays on your machine</li>
                    </ul>

                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: theme.text, fontWeight: '600' }}>
                      🌍 Open Source
                    </h3>
                    <p style={{ margin: '0' }}>
                      OpenMind is open source and community-driven. We believe AI should be transparent, accessible, and controlled by the people who use it.
                    </p>
                  </div>
                )}

                {docsSection === 'local' && (
                  <div style={{ color: theme.textSecondary, lineHeight: '1.7' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: theme.text, fontWeight: '600' }}>
                      <HardDrive size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} />
                      Local Models
                    </h2>
                    
                    <div style={{ 
                      padding: '12px 16px', 
                      background: isDark ? 'rgba(255,200,0,0.1)' : 'rgba(255,200,0,0.15)', 
                      borderRadius: '8px', 
                      marginBottom: '20px',
                      border: `1px solid ${isDark ? 'rgba(255,200,0,0.2)' : 'rgba(255,200,0,0.3)'}`,
                    }}>
                      <span style={{ color: isDark ? '#ffd700' : '#b8860b', fontWeight: '500' }}>🚧 Work in Progress</span>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                        This feature is still being developed. Some functionality may be incomplete.
                      </p>
                    </div>

                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: theme.text, fontWeight: '600' }}>
                      What are Local Models?
                    </h3>
                    <p style={{ margin: '0 0 20px 0' }}>
                      Local models are AI models that run entirely on your computer. They use GGUF format files which are optimized for running on consumer hardware with llama.cpp.
                    </p>

                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: theme.text, fontWeight: '600' }}>
                      How to Use
                    </h3>
                    <ol style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '8px' }}>Open <strong>OpenMind Create</strong> from the sidebar</li>
                      <li style={{ marginBottom: '8px' }}>Go to <strong>Discovery → Local</strong></li>
                      <li style={{ marginBottom: '8px' }}>Import a .gguf file or select an existing one</li>
                      <li style={{ marginBottom: '8px' }}>Configure your model with a custom name and system prompt</li>
                      <li style={{ marginBottom: '8px' }}>Click <strong>Create Model</strong></li>
                    </ol>

                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: theme.text, fontWeight: '600' }}>
                      Benefits
                    </h3>
                    <ul style={{ margin: '0', paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '8px' }}>🔒 Complete privacy — your data never leaves your machine</li>
                      <li style={{ marginBottom: '8px' }}>💰 No API costs — run unlimited queries for free</li>
                      <li style={{ marginBottom: '8px' }}>🌐 Works offline — no internet connection required</li>
                      <li style={{ marginBottom: '8px' }}>⚡ Fast responses — no network latency</li>
                    </ul>
                  </div>
                )}

                {docsSection === 'cloud' && (
                  <div style={{ color: theme.textSecondary, lineHeight: '1.7' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: theme.text, fontWeight: '600' }}>
                      <Cloud size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} />
                      Cloud Models (HuggingFace)
                    </h2>
                    
                    <div style={{ 
                      padding: '12px 16px', 
                      background: isDark ? 'rgba(255,200,0,0.1)' : 'rgba(255,200,0,0.15)', 
                      borderRadius: '8px', 
                      marginBottom: '20px',
                      border: `1px solid ${isDark ? 'rgba(255,200,0,0.2)' : 'rgba(255,200,0,0.3)'}`,
                    }}>
                      <span style={{ color: isDark ? '#ffd700' : '#b8860b', fontWeight: '500' }}>🚧 Work in Progress</span>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                        This feature is still being developed. Some functionality may be incomplete.
                      </p>
                    </div>

                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: theme.text, fontWeight: '600' }}>
                      What are Cloud Models?
                    </h3>
                    <p style={{ margin: '0 0 20px 0' }}>
                      Cloud models are hosted on HuggingFace and can be browsed, downloaded, and used directly from OpenMind. This gives you access to thousands of pre-trained models from the community.
                    </p>

                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: theme.text, fontWeight: '600' }}>
                      How to Use
                    </h3>
                    <ol style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '8px' }}>Open <strong>OpenMind Create</strong> from the sidebar</li>
                      <li style={{ marginBottom: '8px' }}>Go to <strong>Discovery → Cloud</strong></li>
                      <li style={{ marginBottom: '8px' }}>Search for GGUF models or browse popular ones</li>
                      <li style={{ marginBottom: '8px' }}>Click <strong>View</strong> to see model details and README</li>
                      <li style={{ marginBottom: '8px' }}>Use the <strong>Download</strong> button to download GGUF files</li>
                      <li style={{ marginBottom: '8px' }}>Downloaded models appear in your Local models</li>
                    </ol>

                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: theme.text, fontWeight: '600' }}>
                      Features
                    </h3>
                    <ul style={{ margin: '0', paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '8px' }}>🔍 Search thousands of GGUF models</li>
                      <li style={{ marginBottom: '8px' }}>📖 View model cards and documentation</li>
                      <li style={{ marginBottom: '8px' }}>⬇️ Download models directly in-app</li>
                      <li style={{ marginBottom: '8px' }}>🏷️ Filter by tags, size, and popularity</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Sidebar;
