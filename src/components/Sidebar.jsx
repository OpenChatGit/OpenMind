import { useState, useRef, useEffect } from 'react';
import { Plus, MoreHorizontal, MoreVertical, PanelLeft, Pencil, Trash2, Check, LogOut, Settings, Sparkles } from 'lucide-react';

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
  onOpenModelCreator
}) => {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState('checking');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (window.electronAPI?.onOllamaStatus) {
      window.electronAPI.onOllamaStatus((status) => {
        setOllamaStatus(status);
      });
    }
  }, []);

  const openLoginModal = () => {
    setShowUserMenu(false);
    onOpenLoginModal();
  };

  const handleHfLogout = () => {
    setShowUserMenu(false);
    onHfLogout();
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
      background: '#1b1b1c',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem',
      paddingBottom: '1rem',
      zIndex: 10,
      position: 'relative',
      color: '#ececec'
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
            background: '#2f2f2f',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s',
            fontSize: '0.85rem',
            fontWeight: '500',
            color: '#ececec',
            WebkitAppRegion: 'no-drag'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#3f3f3f'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#2f2f2f'}
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
        color: '#888',
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
              color: '#ececec',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background 0.2s',
              background: activeChatId === chat.id ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
            onMouseEnter={(e) => {
              if (activeChatId !== chat.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
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
                    background: '#2f2f2f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '4px',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
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
                        color: '#ececec',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
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
                        background: confirmDeleteId === chat.id ? 'rgba(255,107,107,0.2)' : 'transparent',
                        border: 'none',
                        color: '#ff6b6b',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        textAlign: 'left',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = confirmDeleteId === chat.id ? 'rgba(255,107,107,0.3)' : 'rgba(255,107,107,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = confirmDeleteId === chat.id ? 'rgba(255,107,107,0.2)' : 'transparent'}
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

      {/* Ollama Status */}
      <div style={{
        padding: '8px 12px',
        fontSize: '0.75rem',
        color: ollamaStatus === 'running' ? '#4caf50' : '#f44336',
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
          background: ollamaStatus === 'running' ? '#4caf50' : '#f44336',
          boxShadow: ollamaStatus === 'running' ? '0 0 4px #4caf50' : 'none'
        }} />
        {ollamaStatus === 'running' ? 'Ollama Connected' : 'Ollama Disconnected'}
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
          {hfUser?.avatar ? (
            <img 
              src={hfUser.avatar} 
              alt="avatar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0
              }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#fff',
              flexShrink: 0
            }}>
              {hfUser ? hfUser.username?.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <div style={{ 
            flex: 1, 
            fontSize: '0.9rem', 
            fontWeight: '500', 
            color: hfUser ? '#ececec' : '#888',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '32px'
          }}>
            {hfUser ? hfUser.username : 'Not logged in'}
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
            background: '#2f2f2f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '4px',
            zIndex: 100,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.3)'
          }}>
            {!hfUser ? (
              <button
                onClick={openLoginModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#FFD21E',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,210,30,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '14px' }}>🤗</span>
                Login with Hugging Face
              </button>
            ) : (
              <button
                onClick={handleHfLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={14} />
                Logout
              </button>
            )}
            <button
              onClick={() => {
                onOpenModelCreator?.();
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
                color: '#ececec',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '0.85rem',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Sparkles size={14} />
              Model Creator
            </button>
            <button
              onClick={() => {
                console.log('Settings clicked');
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
                color: '#ececec',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '0.85rem',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Settings size={14} />
              Settings
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default Sidebar;
