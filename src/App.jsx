import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import TitleBar from './components/TitleBar';
import { useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import { PanelLeft } from 'lucide-react';

// Lazy load heavy components for faster initial render
const Sidebar = lazy(() => import('./components/Sidebar'));
const ChatArea = lazy(() => import('./components/ChatArea'));
const LoginModal = lazy(() => import('./components/LoginModal'));
const OpenMindCreator = lazy(() => import('./components/OpenMindCreator'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

// Minimal loading placeholder
const LoadingPlaceholder = () => (
  <div style={{ 
    flex: 1, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    color: '#666'
  }}>
    Loading...
  </div>
);

// Get initial active chat ID from localStorage
const getInitialActiveChatId = () => {
  const saved = localStorage.getItem('activeChatId');
  return saved ? parseInt(saved, 10) : null;
};

const App = ({ onReady }) => {
  const { theme, isDark } = useTheme();
  const { user, isLoggedIn } = useAuth();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar-open');
    return saved !== null ? saved === 'true' : true;
  });
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(getInitialActiveChatId);
  
  // HF Login State
  const [hfUser, setHfUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  
  // OpenMind Creator State
  const [showOpenMindCreator, setShowOpenMindCreator] = useState(false);
  
  const [appSettings, setAppSettings] = useState({
    inferenceProvider: 'local',
    hfApiKey: '',
    remoteOllamaHost: '',
    remoteOllamaPort: '11434'
  });

  // Hide loading screen immediately when component mounts
  useEffect(() => {
    // Call onReady immediately - UI is ready to show
    onReady?.();
  }, [onReady]);

  // Load settings and chats in parallel after mount
  useEffect(() => {
    // Load settings
    if (window.electronAPI?.loadSettings) {
      window.electronAPI.loadSettings().then(result => {
        if (result?.success && result.settings) {
          setAppSettings(prev => ({ ...prev, ...result.settings }));
        }
      }).catch(() => {});
    }
    
    // Load chats
    if (window.electronAPI?.loadChats) {
      window.electronAPI.loadChats().then(result => {
        if (result?.success && result.chats?.length > 0) {
          setChats(result.chats);
          const savedId = getInitialActiveChatId();
          if (savedId && !result.chats.some(c => c.id === savedId)) {
            setActiveChatId(null);
          }
        }
      }).catch(() => {});
    }
    
    // Load HF user
    loadHfUser();
  }, []);

  const handleSaveSettings = async (newSettings) => {
    setAppSettings(newSettings);
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings(newSettings);
    }
  };

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebar-open', isSidebarOpen.toString());
  }, [isSidebarOpen]);

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

  const handleNewChat = useCallback(() => {
    const newChat = { id: Date.now(), name: 'New Chat', messages: [] };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    persistChat(newChat);
    return newChat.id;
  }, [persistChat]);

  const handleDeleteChat = useCallback(async (id) => {
    setChats(prev => prev.filter(c => c.id !== id));
    setActiveChatId(prev => prev === id ? null : prev);
    if (window.electronAPI?.deleteChat) {
      await window.electronAPI.deleteChat(id);
    }
  }, []);

  const handleRenameChat = useCallback((id, newName) => {
    setChats(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, name: newName } : c);
      const chat = updated.find(c => c.id === id);
      if (chat) persistChat(chat);
      return updated;
    });
  }, [persistChat]);

  const handleUpdateMessages = useCallback((chatId, messages) => {
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
  }, [persistChat]);

  const handleFirstMessage = useCallback((firstMessage, initialMessages) => {
    const chatName = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
    const newChatId = Date.now();
    const newChat = { id: newChatId, name: chatName, messages: initialMessages || [] };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    // Don't persist yet - wait for streaming to complete
    return newChatId;
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

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
      <TitleBar />

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: 'transparent'
      }}>
        {/* Sidebar - lazy loaded */}
        <Suspense fallback={<div style={{ width: isSidebarOpen ? '260px' : '0px', background: theme.bgSecondary }} />}>
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
                onOpenSettings={() => setShowSettings(true)}
                onOpenModelCreator={() => setShowOpenMindCreator(true)}
              />
            </div>
          </div>
        </Suspense>

        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              zIndex: 100,
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <PanelLeft size={20} />
          </button>
        )}

        {/* ChatArea - lazy loaded */}
        <Suspense fallback={<LoadingPlaceholder />}>
          <ChatArea
            activeChatId={activeChatId}
            messages={activeChat?.messages || []}
            onUpdateMessages={handleUpdateMessages}
            onFirstMessage={handleFirstMessage}
            inferenceSettings={appSettings}
            currentUser={isLoggedIn ? user : null}
          />
        </Suspense>

      </div>

      {/* Lazy-loaded modals wrapped in Suspense */}
      <Suspense fallback={null}>
        {showLoginModal && (
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
        )}

        {showSettings && (
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            settings={appSettings}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {showOpenMindCreator && (
          <OpenMindCreator
            isOpen={showOpenMindCreator}
            onClose={() => setShowOpenMindCreator(false)}
            onModelCreated={(model) => {
              console.log('OpenMind model created:', model);
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

export default App;
