import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import TitleBar from './components/TitleBar';
import LoginModal from './components/LoginModal';
import ModelCreator from './components/ModelCreator';
import { PanelLeft } from 'lucide-react';

// Get initial active chat ID from localStorage
const getInitialActiveChatId = () => {
  const saved = localStorage.getItem('activeChatId');
  return saved ? parseInt(saved, 10) : null;
};

const App = () => {
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

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: '#151517',
      color: 'white',
      overflow: 'hidden'
    }}>
      <TitleBar />

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: '#151517'
      }}>
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
              background: 'rgba(15, 15, 25, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ececec',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(47, 47, 47, 0.9)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 15, 25, 0.7)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
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
        />
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
    </div>
  );
};

export default App;
