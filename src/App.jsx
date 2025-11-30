import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import TitleBar from './components/TitleBar';
import LoginModal from './components/LoginModal';
import ModelCreator from './components/ModelCreator';
import SettingsModal from './components/SettingsModal';
import IDEMode from './components/IDEMode';
import IDEChatSidebar from './components/IDEChatSidebar';
import IDEActivityBar from './components/IDEActivityBar';
import { useTheme } from './contexts/ThemeContext';
import { PanelLeft, MessageSquare } from 'lucide-react';

// Get initial active chat ID from localStorage
const getInitialActiveChatId = () => {
  const saved = localStorage.getItem('activeChatId');
  return saved ? parseInt(saved, 10) : null;
};

const App = () => {
  const { theme, isDark } = useTheme();
  const ideModeRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(getInitialActiveChatId);
  
  // HF Login State
  const [hfUser, setHfUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  
  // Model Creator State
  const [showModelCreator, setShowModelCreator] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  
  // IDE Mode State - persist to localStorage
  const [isIDEMode, setIsIDEMode] = useState(() => {
    return localStorage.getItem('ide-mode-active') === 'true';
  });
  const [showIDEChat, setShowIDEChat] = useState(() => {
    const saved = localStorage.getItem('ide-chat-visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [ideActivePanel, setIdeActivePanel] = useState(() => {
    return localStorage.getItem('ide-active-panel') || 'files';
  });
  const [ideSidePanelVisible, setIdeSidePanelVisible] = useState(() => {
    const saved = localStorage.getItem('ide-sidepanel-visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [ideStatus, setIdeStatus] = useState({
    line: 1,
    column: 1,
    language: '',
    encoding: 'UTF-8',
    lineEnding: 'CRLF',
    indentation: 'Spaces: 2',
    gitBranch: 'main',
    errorCount: 0,
    warningCount: 0
  });
  const [ideWorkspaceFolder, setIdeWorkspaceFolder] = useState(() => {
    return localStorage.getItem('ide-workspace-folder') || null;
  });

  // Save IDE state to localStorage - combined into single effect
  useEffect(() => {
    localStorage.setItem('ide-mode-active', isIDEMode.toString());
    localStorage.setItem('ide-chat-visible', showIDEChat.toString());
    localStorage.setItem('ide-active-panel', ideActivePanel);
    localStorage.setItem('ide-sidepanel-visible', ideSidePanelVisible.toString());
  }, [isIDEMode, showIDEChat, ideActivePanel, ideSidePanelVisible]);
  const [appSettings, setAppSettings] = useState({
    inferenceProvider: 'local',
    hfApiKey: '',
    remoteOllamaHost: '',
    remoteOllamaPort: '11434'
  });

  // Load settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI?.loadSettings) {
        const result = await window.electronAPI.loadSettings();
        if (result?.success && result.settings) {
          setAppSettings(prev => ({ ...prev, ...result.settings }));
        }
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (newSettings) => {
    setAppSettings(newSettings);
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings(newSettings);
    }
  };

  // Load chats from database on startup
  useEffect(() => {
    const loadSavedChats = async () => {
      if (window.electronAPI?.loadChats) {
        const result = await window.electronAPI.loadChats();
        if (result.success && result.chats.length > 0) {
          setChats(result.chats);
          // Verify saved active chat still exists
          const savedId = getInitialActiveChatId();
          if (savedId && !result.chats.some(c => c.id === savedId)) {
            setActiveChatId(null);
          }
        } else {
          // No chats loaded, clear active chat
          setActiveChatId(null);
        }
      }
    };
    loadSavedChats();
    loadHfUser();
  }, []);

  // Load HF user on startup
  const loadHfUser = async () => {
    try {
      const tokenResult = await window.electronAPI?.hfLoadToken();
      if (tokenResult?.success && tokenResult.token) {
        const userResult = await window.electronAPI?.hfGetUserInfo();
        if (userResult?.success) {
          setHfUser(userResult.user);
        }
      }
    } catch (error) {
      console.error('Error loading HF user:', error);
    }
  };

  const handleOpenLoginModal = () => {
    setShowLoginModal(true);
    setTokenInput('');
    setLoginError('');
  };

  const handleHfLogin = async () => {
    if (!tokenInput.trim()) {
      setLoginError('Please enter a token');
      return;
    }
    
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await window.electronAPI?.hfSetToken(tokenInput.trim());
      const userResult = await window.electronAPI?.hfGetUserInfo();
      if (userResult?.success) {
        setHfUser(userResult.user);
        setShowLoginModal(false);
        setTokenInput('');
      } else {
        setLoginError('Invalid token or login failed');
        await window.electronAPI?.hfClearToken();
      }
    } catch (error) {
      console.error('HF Login error:', error);
      setLoginError('Login failed');
    }
    setIsLoggingIn(false);
  };

  const handleHfLogout = async () => {
    await window.electronAPI?.hfClearToken();
    setHfUser(null);
  };

  // Save active chat ID to localStorage when it changes
  useEffect(() => {
    if (activeChatId !== null) {
      localStorage.setItem('activeChatId', activeChatId.toString());
    } else {
      localStorage.removeItem('activeChatId');
    }
  }, [activeChatId]);

  // Save single chat to database
  const persistChat = useCallback(async (chat) => {
    if (window.electronAPI?.saveChat) {
      await window.electronAPI.saveChat(chat);
    }
  }, []);

  const handleNewChat = () => {
    const newChat = { id: Date.now(), name: 'New Chat', messages: [] };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    persistChat(newChat);
    return newChat.id;
  };

  const handleDeleteChat = async (id) => {
    setChats(chats.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
    }
    if (window.electronAPI?.deleteChat) {
      await window.electronAPI.deleteChat(id);
    }
  };

  const handleRenameChat = (id, newName) => {
    setChats(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, name: newName } : c);
      const chat = updated.find(c => c.id === id);
      if (chat) persistChat(chat);
      return updated;
    });
  };

  const handleUpdateMessages = (chatId, messages) => {
    setChats(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, messages } : c);
      const chat = updated.find(c => c.id === chatId);
      // Only persist when streaming is done (no isStreaming message)
      const hasStreaming = messages.some(m => m.isStreaming);
      if (chat && !hasStreaming) {
        persistChat(chat);
      }
      return updated;
    });
  };

  const handleFirstMessage = (firstMessage, initialMessages) => {
    const chatName = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
    const newChatId = Date.now();
    const newChat = { id: newChatId, name: chatName, messages: initialMessages || [] };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    // Don't persist yet - wait for streaming to complete
    return newChatId;
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle IDE menu actions
  const handleIDEAction = useCallback((action) => {
    switch (action) {
      // File menu
      case 'newFile':
        ideModeRef.current?.newFile();
        break;
      case 'newFileAdvanced':
        ideModeRef.current?.newFile();
        break;
      case 'openFile':
        ideModeRef.current?.openFile();
        break;
      case 'openFolder':
        ideModeRef.current?.openFolder();
        break;
      case 'save':
        ideModeRef.current?.saveCurrentFile();
        break;
      case 'saveAs':
        ideModeRef.current?.saveFileAs();
        break;
      case 'saveAll':
        ideModeRef.current?.saveAllFiles();
        break;
      case 'revertFile':
        ideModeRef.current?.revertFile();
        break;
      case 'closeEditor':
        ideModeRef.current?.closeCurrentTab();
        break;
      case 'closeFolder':
        ideModeRef.current?.closeFolder();
        break;
      case 'exit':
        window.electronAPI?.close();
        break;
      
      // Edit menu
      case 'undo':
        ideModeRef.current?.editorAction('undo');
        break;
      case 'redo':
        ideModeRef.current?.editorAction('redo');
        break;
      case 'cut':
        ideModeRef.current?.editorAction('cut');
        break;
      case 'copy':
        ideModeRef.current?.editorAction('copy');
        break;
      case 'paste':
        ideModeRef.current?.editorAction('paste');
        break;
      case 'toggleLineComment':
        ideModeRef.current?.editorAction('toggleLineComment');
        break;
      case 'toggleBlockComment':
        ideModeRef.current?.editorAction('toggleBlockComment');
        break;
      case 'findInFiles':
        setIdeActivePanel('search');
        if (!ideSidePanelVisible) setIdeSidePanelVisible(true);
        break;
      
      // Selection menu
      case 'selectAll':
        ideModeRef.current?.editorAction('selectAll');
        break;
      case 'copyLineUp':
        ideModeRef.current?.editorAction('copyLineUp');
        break;
      case 'copyLineDown':
        ideModeRef.current?.editorAction('copyLineDown');
        break;
      case 'moveLineUp':
        ideModeRef.current?.editorAction('moveLineUp');
        break;
      case 'moveLineDown':
        ideModeRef.current?.editorAction('moveLineDown');
        break;
      case 'duplicateSelection':
        ideModeRef.current?.editorAction('duplicateSelection');
        break;
      
      // View menu
      case 'viewExplorer':
        setIdeActivePanel('files');
        if (!ideSidePanelVisible) setIdeSidePanelVisible(true);
        break;
      case 'viewSearch':
        setIdeActivePanel('search');
        if (!ideSidePanelVisible) setIdeSidePanelVisible(true);
        break;
      case 'viewGit':
        setIdeActivePanel('git');
        if (!ideSidePanelVisible) setIdeSidePanelVisible(true);
        break;
      case 'viewRun':
        setIdeActivePanel('debug');
        if (!ideSidePanelVisible) setIdeSidePanelVisible(true);
        break;
      case 'viewExtensions':
        setIdeActivePanel('extensions');
        if (!ideSidePanelVisible) setIdeSidePanelVisible(true);
        break;
      case 'toggleSidebar':
        setIdeSidePanelVisible(prev => !prev);
        break;
      case 'toggleChat':
        setShowIDEChat(prev => !prev);
        break;
      case 'toggleWordWrap':
        ideModeRef.current?.toggleWordWrap();
        break;
      case 'about':
        alert('OpenMind IDE v1.0\n\nAI-powered code development with local Ollama models.');
        break;
      
      // Terminal menu
      case 'newTerminal':
      case 'viewTerminal':
        ideModeRef.current?.openTerminal();
        break;
      case 'runActiveFile':
        ideModeRef.current?.runActiveFile();
        break;
      default:
        console.log('IDE Action:', action);
    }
  }, [ideSidePanelVisible]);

  // Global keyboard shortcuts for IDE mode
  useEffect(() => {
    if (!isIDEMode) return;

    const handleKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // File menu shortcuts
      if (ctrl && !shift && !alt && e.key === 'n') {
        e.preventDefault();
        handleIDEAction('newFile');
      }
      if (ctrl && !shift && !alt && e.key === 'o') {
        e.preventDefault();
        handleIDEAction('openFile');
      }
      if (ctrl && !shift && !alt && e.key === 's') {
        e.preventDefault();
        handleIDEAction('save');
      }
      if (ctrl && shift && !alt && e.key === 'S') {
        e.preventDefault();
        handleIDEAction('saveAs');
      }
      if (ctrl && !shift && !alt && e.key === 'F4') {
        e.preventDefault();
        handleIDEAction('closeEditor');
      }
      if (ctrl && !shift && !alt && e.key === 'w') {
        e.preventDefault();
        handleIDEAction('closeEditor');
      }

      // Edit menu shortcuts
      if (ctrl && !shift && !alt && e.key === 'z') {
        e.preventDefault();
        handleIDEAction('undo');
      }
      if (ctrl && !shift && !alt && e.key === 'y') {
        e.preventDefault();
        handleIDEAction('redo');
      }
      if (ctrl && shift && !alt && e.key === 'Z') {
        e.preventDefault();
        handleIDEAction('redo');
      }
      if (ctrl && !shift && !alt && e.key === '/') {
        e.preventDefault();
        handleIDEAction('toggleLineComment');
      }
      if (ctrl && shift && !alt && e.key === 'F') {
        e.preventDefault();
        handleIDEAction('findInFiles');
      }
      if (shift && alt && !ctrl && e.key === 'A') {
        e.preventDefault();
        handleIDEAction('toggleBlockComment');
      }

      // Selection menu shortcuts
      if (ctrl && !shift && !alt && e.key === 'a') {
        // Let default select all work in textarea
      }
      if (ctrl && !shift && !alt && e.key === 'd') {
        e.preventDefault();
        handleIDEAction('duplicateSelection');
      }
      if (shift && alt && !ctrl && e.key === 'ArrowUp') {
        e.preventDefault();
        handleIDEAction('copyLineUp');
      }
      if (shift && alt && !ctrl && e.key === 'ArrowDown') {
        e.preventDefault();
        handleIDEAction('copyLineDown');
      }
      if (alt && !ctrl && !shift && e.key === 'ArrowUp') {
        e.preventDefault();
        handleIDEAction('moveLineUp');
      }
      if (alt && !ctrl && !shift && e.key === 'ArrowDown') {
        e.preventDefault();
        handleIDEAction('moveLineDown');
      }

      // View menu shortcuts
      if (ctrl && shift && !alt && e.key === 'E') {
        e.preventDefault();
        handleIDEAction('viewExplorer');
      }
      if (ctrl && shift && !alt && e.key === 'G') {
        e.preventDefault();
        handleIDEAction('viewGit');
      }
      if (ctrl && shift && !alt && e.key === 'D') {
        e.preventDefault();
        handleIDEAction('viewRun');
      }
      if (ctrl && shift && !alt && e.key === 'X') {
        e.preventDefault();
        handleIDEAction('viewExtensions');
      }
      if (ctrl && !shift && !alt && e.key === 'b') {
        e.preventDefault();
        handleIDEAction('toggleSidebar');
      }
      if (ctrl && shift && !alt && e.key === 'C') {
        e.preventDefault();
        handleIDEAction('toggleChat');
      }
      if (alt && !ctrl && !shift && e.key === 'z') {
        e.preventDefault();
        handleIDEAction('toggleWordWrap');
      }
      
      // Terminal shortcut (Ctrl+Shift+ö or Ctrl+`)
      if (ctrl && shift && (e.key === 'ö' || e.key === '`')) {
        e.preventDefault();
        handleIDEAction('newTerminal');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isIDEMode, handleIDEAction]);

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: theme.bg,
      color: theme.text,
      overflow: 'hidden',
      transition: 'background 0.3s, color 0.3s'
    }}>
      <TitleBar 
        isIDEMode={isIDEMode}
        showIDEChat={showIDEChat}
        onToggleIDEChat={() => setShowIDEChat(!showIDEChat)}
        onIDEAction={handleIDEAction}
        projectPath={ideWorkspaceFolder}
      />

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: theme.bg
      }}>
        {isIDEMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* IDE Main Area */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* IDE Activity Bar - Fixed 48px, never shrinks */}
              <IDEActivityBar
                activePanel={ideActivePanel}
                onPanelChange={setIdeActivePanel}
                onExitIDE={() => setIsIDEMode(false)}
                onOpenSettings={() => setShowSettings(true)}
                isSidePanelVisible={ideSidePanelVisible}
                onToggleSidePanel={() => setIdeSidePanelVisible(!ideSidePanelVisible)}
                showChat={showIDEChat}
                onToggleChat={() => setShowIDEChat(!showIDEChat)}
              />
              
              {/* IDE Main Content - flex: 1, shrinks when chat opens */}
              <IDEMode 
                ref={ideModeRef}
                onExitIDE={() => setIsIDEMode(false)} 
                activePanel={ideActivePanel}
                isSidePanelVisible={ideSidePanelVisible}
                onStatusChange={setIdeStatus}
                onWorkspaceChange={setIdeWorkspaceFolder}
              />
              
              {/* IDE Chat Sidebar - only rendered when visible */}
              {showIDEChat && (
                <IDEChatSidebar 
                  inferenceSettings={appSettings}
                  onClose={() => setShowIDEChat(false)}
                />
              )}
            </div>
            
            {/* Status Bar - VS Code Style */}
            <div style={{
              height: '22px',
              background: theme.bgSecondary,
              borderTop: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0',
              fontSize: '0.7rem',
              color: theme.textSecondary,
              flexShrink: 0
            }}>
              {/* Left Side */}
              <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                {/* Git Branch */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  padding: '0 8px',
                  height: '100%',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.75 7a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5zM4.75 2a2.75 2.75 0 0 0-.87 5.36v1.39c0 .138.112.25.25.25h.25v5.25a.75.75 0 0 0 1.5 0V9h.25a.25.25 0 0 0 .25-.25V7.36A2.75 2.75 0 0 0 4.75 2zm6.5 5a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5zm0-5a2.75 2.75 0 0 0-.87 5.36v.89a.25.25 0 0 1-.25.25H9.5a.75.75 0 0 0 0 1.5h.63a1.75 1.75 0 0 0 1.75-1.75v-.89A2.75 2.75 0 0 0 11.25 2z"/>
                  </svg>
                  <span>{ideStatus.gitBranch}</span>
                </div>
                {/* Sync */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 6px',
                  height: '100%',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.5 2v4H1V1h5v1.5H2.5zm11 0h-4V1h5v5h-1.5V2.5h-.5zM2.5 14V10H1v5h5v-1.5H2.5zm11 0h-4v1.5h5V10h-1.5v4h-.5z"/>
                  </svg>
                </div>
                {/* Errors & Warnings */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '0 8px',
                  height: '100%',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: ideStatus.errorCount > 0 ? theme.error : 'inherit' }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zM7.25 4v5h1.5V4h-1.5zm0 6v1.5h1.5V10h-1.5z"/>
                    </svg>
                    {ideStatus.errorCount}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: ideStatus.warningCount > 0 ? theme.warning : 'inherit' }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7.56 1h.88l6.54 12.26-.44.74H1.44l-.42-.74L7.56 1zm.44 1.67L2.63 13h10.74L8 2.67zM7.25 6v4h1.5V6h-1.5zm0 5v1.5h1.5V11h-1.5z"/>
                    </svg>
                    {ideStatus.warningCount}
                  </span>
                </div>
              </div>
              
              {/* Right Side */}
              <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                {/* Line & Column */}
                <div style={{ 
                  padding: '0 8px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  Ln {ideStatus.line}, Col {ideStatus.column}
                </div>
                {/* Spaces */}
                <div style={{ 
                  padding: '0 8px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  {ideStatus.indentation}
                </div>
                {/* Encoding */}
                <div style={{ 
                  padding: '0 8px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  {ideStatus.encoding}
                </div>
                {/* Line Ending */}
                <div style={{ 
                  padding: '0 8px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  {ideStatus.lineEnding}
                </div>
                {/* Language */}
                {ideStatus.language && (
                <div style={{ 
                  padding: '0 8px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  {ideStatus.language}
                </div>
                )}
                {/* Notifications - Opens Welcome Tab */}
                <div 
                  style={{ 
                    padding: '0 8px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => ideModeRef.current?.openWelcomeTab?.()}
                  title="Welcome & What's New"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1.5A5.5 5.5 0 0 0 2.5 7v3.5l-1 1V13h13v-1.5l-1-1V7A5.5 5.5 0 0 0 8 1.5zm0 13a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2z"/>
                  </svg>
                  {/* Notification dot for new updates */}
                  {!localStorage.getItem('openmind-seen-v0.3.0') && (
                    <span style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '6px',
                      height: '6px',
                      background: '#6366f1',
                      borderRadius: '50%'
                    }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Normal Chat Mode */}
            <div style={{
              width: isSidebarOpen ? '260px' : '0px',
              opacity: isSidebarOpen ? 1 : 0,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              willChange: 'width, opacity'
            }}>
              <div style={{ width: '260px', height: '100%' }}>
                <Sidebar
                  chats={chats}
                  activeChatId={activeChatId}
                  onSelectChat={setActiveChatId}
                  onNewChat={handleNewChat}
                  onDeleteChat={handleDeleteChat}
                  onRenameChat={handleRenameChat}
                  onToggleSidebar={toggleSidebar}
                  hfUser={hfUser}
                  onOpenLoginModal={handleOpenLoginModal}
                  onHfLogout={handleHfLogout}
                  onOpenModelCreator={() => setShowModelCreator(true)}
                  onOpenSettings={() => setShowSettings(true)}
                  onOpenIDE={() => setIsIDEMode(true)}
                  isIDEMode={isIDEMode}
                />
              </div>
            </div>

            {!isSidebarOpen && (
              <button
                onClick={toggleSidebar}
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  zIndex: 100,
                  background: isDark ? 'rgba(15, 15, 25, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)',
                  boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.bgActive;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(15, 15, 25, 0.7)' : 'rgba(255, 255, 255, 0.9)';
                }}
              >
                <PanelLeft size={24} />
              </button>
            )}

            <ChatArea
              activeChatId={activeChatId}
              messages={activeChat?.messages || []}
              onUpdateMessages={handleUpdateMessages}
              onFirstMessage={handleFirstMessage}
              inferenceSettings={appSettings}
            />
          </>
        )}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleHfLogin}
        isLoggingIn={isLoggingIn}
        loginError={loginError}
        tokenInput={tokenInput}
        setTokenInput={setTokenInput}
        setLoginError={setLoginError}
      />

      <ModelCreator
        isOpen={showModelCreator}
        onClose={() => setShowModelCreator(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={appSettings}
        onSaveSettings={handleSaveSettings}
      />

    </div>
  );
};

export default App;
