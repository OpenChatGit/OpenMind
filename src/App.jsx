import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import TitleBar from './components/TitleBar';
import LoginModal from './components/LoginModal';
import ModelCreator from './components/ModelCreator';
import SettingsModal from './components/SettingsModal';
import { useTheme } from './contexts/ThemeContext';
import { PanelLeft, Volume2, VolumeX } from 'lucide-react';

// Audio analyzer hook for reactive visuals - returns frequency data for wave effect
const useAudioAnalyzer = (audioRef, enabled) => {
  const [frequencyData, setFrequencyData] = useState(new Array(32).fill(0));
  const analyzerRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const isSetupRef = useRef(false);

  useEffect(() => {
    if (!enabled || !audioRef.current) {
      setFrequencyData(new Array(32).fill(0));
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const audio = audioRef.current;
    let dataArray;

    const startAnalyzing = () => {
      if (!analyzerRef.current) return;
      
      const updateLevel = () => {
        if (!analyzerRef.current || !enabled) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        const normalized = Array.from(dataArray).map(v => v / 255);
        setFrequencyData(normalized);
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    };

    const setupAnalyzer = () => {
      if (isSetupRef.current) {
        // Already setup, just start analyzing
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        startAnalyzing();
        return;
      }

      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 128;
        analyzerRef.current.smoothingTimeConstant = 0.7;
        sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
        sourceRef.current.connect(analyzerRef.current);
        analyzerRef.current.connect(audioContextRef.current.destination);
        dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        isSetupRef.current = true;
        startAnalyzing();
      } catch (e) {
        console.log('Audio analyzer setup failed:', e);
      }
    };

    // Setup immediately if audio is already playing
    if (!audio.paused) {
      setupAnalyzer();
    }

    audio.addEventListener('play', setupAnalyzer);

    return () => {
      audio.removeEventListener('play', setupAnalyzer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [audioRef, enabled]);

  return frequencyData;
};

// Component for audio-reactive wave circle
const AudioWaveCircle = ({ frequencyData, isDark }) => {
  const radius = 260;
  const svgSize = 640;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const numPoints = 64;
  const baseWaveHeight = 12;
  const maxWaveHeight = 60;

  // Generate wave path - only top half arc with mirrored frequencies
  const generateWavePath = () => {
    const points = [];
    // Only generate points for top half: from left (-PI) to right (0)
    const topHalfPoints = 32;
    const halfPoints = topHalfPoints / 2;
    
    for (let i = 0; i <= topHalfPoints; i++) {
      // Angle from -PI (left) to 0 (right), going through -PI/2 (top)
      const angle = -Math.PI + (i / topHalfPoints) * Math.PI;
      
      // Mirror frequency data from center outward
      // i=0 (left edge), i=16 (top center), i=32 (right edge)
      let freqIndex;
      if (i <= halfPoints) {
        // Left half: map 0-16 to frequency bands
        freqIndex = Math.floor((i / halfPoints) * (frequencyData.length - 1));
      } else {
        // Right half: mirror - map 32-16 to same frequency bands
        freqIndex = Math.floor(((topHalfPoints - i) / halfPoints) * (frequencyData.length - 1));
      }
      
      const freqValue = frequencyData[Math.min(freqIndex, frequencyData.length - 1)] || 0;
      const waveHeight = baseWaveHeight + freqValue * maxWaveHeight;
      const r = radius + waveHeight;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      points.push({ x, y });
    }

    if (points.length === 0) return '';

    // Simple smooth path through points
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  };

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      style={{
        position: 'absolute',
        top: '51%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        overflow: 'visible'
      }}
    >
      <path
        d={generateWavePath()}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)'}
        strokeWidth="2"
      />
    </svg>
  );
};

// Retro audio playlist
import retroAudio1 from './assets/audio/technological-revolution-pecan-pie-main-version-29629-01-45.mp3';
import retroAudio2 from './assets/audio/arcade-ride-vens-adams-main-version-27955-01-45.mp3';
import retroAudio3 from './assets/audio/Open-Veil-by-Lily.mp3';

const retroPlaylist = [
  { src: retroAudio1, artist: 'Pecan Pie', url: 'https://uppbeat.io/track/pecan-pie/technological-revolution' },
  { src: retroAudio2, artist: 'Vens Adams', url: 'https://uppbeat.io/browse/artist/vens-adams' },
  { src: retroAudio3, artist: 'Lily', url: '' }
];

// Get initial active chat ID from localStorage
const getInitialActiveChatId = () => {
  const saved = localStorage.getItem('activeChatId');
  return saved ? parseInt(saved, 10) : null;
};

const App = () => {
  const { theme, isDark, showAnimations, animationType, retroAudioEnabled, setRetroAudioEnabled, retroAudioVolume, setRetroAudioVolume } = useTheme();
  const retroAudioRef = useRef(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTrack = retroPlaylist[currentTrackIndex];
  
  // Audio analyzer for reactive wave circle
  const frequencyData = useAudioAnalyzer(retroAudioRef, retroAudioEnabled && showAnimations && animationType === 'retro');
  
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
  
  // Model Creator State
  const [showModelCreator, setShowModelCreator] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  
  // Volume slider hover state
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
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

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebar-open', isSidebarOpen.toString());
  }, [isSidebarOpen]);

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

  // Retro audio control
  useEffect(() => {
    if (retroAudioRef.current) {
      const shouldPlay = showAnimations && animationType === 'retro' && retroAudioEnabled && (!activeChatId || !activeChat?.messages?.length);
      if (shouldPlay) {
        retroAudioRef.current.play().catch(() => {});
      } else {
        retroAudioRef.current.pause();
      }
    }
  }, [showAnimations, animationType, retroAudioEnabled, activeChatId, activeChat, currentTrackIndex]);

  // Retro audio volume control
  useEffect(() => {
    if (retroAudioRef.current) {
      retroAudioRef.current.volume = retroAudioVolume;
    }
  }, [retroAudioVolume]);

  // Handle track end - play next track
  const handleTrackEnd = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev + 1) % retroPlaylist.length);
  }, []);

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
      {/* Global animation layer - only visible when no active chat and animations enabled */}
      {showAnimations && (!activeChatId || !activeChat?.messages?.length) && (
        <>
          {animationType === 'circles' && (
            <>
              <style>
                {`
                  @keyframes spin-cw {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  @keyframes spin-ccw {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                  }
                `}
              </style>
              
              {/* Top-right arc */}
              <svg style={{
                position: 'fixed',
                top: '-350px',
                right: '-350px',
                width: '700px',
                height: '700px',
                pointerEvents: 'none',
                zIndex: 0,
                animation: 'spin-cw 80s linear infinite',
                willChange: 'transform'
              }}>
                <circle
                  cx="350"
                  cy="350"
                  r="320"
                  fill="none"
                  stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)'}
                  strokeWidth="2"
                  strokeDasharray="10 16"
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Bottom-left arc */}
              <svg style={{
                position: 'fixed',
                bottom: '-300px',
                left: '-300px',
                width: '600px',
                height: '600px',
                pointerEvents: 'none',
                zIndex: 0,
                animation: 'spin-ccw 60s linear infinite',
                willChange: 'transform'
              }}>
                <circle
                  cx="300"
                  cy="300"
                  r="270"
                  fill="none"
                  stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.10)'}
                  strokeWidth="1.5"
                  strokeDasharray="6 12"
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Center arc - positioned in chat area */}
              <svg style={{
                position: 'fixed',
                top: '50%',
                left: isSidebarOpen ? 'calc(50% + 130px)' : '50%',
                width: '500px',
                height: '500px',
                marginTop: '-250px',
                marginLeft: '-250px',
                pointerEvents: 'none',
                zIndex: 0,
                animation: 'spin-cw 100s linear infinite',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform'
              }}>
                <circle
                  cx="250"
                  cy="250"
                  r="230"
                  fill="none"
                  stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.10)'}
                  strokeWidth="2"
                  strokeDasharray="8 14"
                  strokeLinecap="round"
                />
              </svg>
            </>
          )}
          
          {animationType === 'retro' && (
            <div style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              left: isSidebarOpen ? '260px' : '0px',
              pointerEvents: 'none',
              zIndex: 0,
              overflow: 'hidden',
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              contain: 'strict'
            }}>
              <style>
                {`
                  @keyframes gridMoveTowards {
                    from { background-position-y: 0; }
                    to { background-position-y: 50px; }
                  }
                `}
              </style>
              
              {/* Perspective Grid - vertical lines (gray, static) */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '-50%',
                width: '200%',
                height: '45%',
                background: isDark 
                  ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 80px)'
                  : 'repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 80px)',
                transform: 'perspective(500px) rotateX(60deg)',
                transformOrigin: 'center top',
                backfaceVisibility: 'hidden'
              }} />
              
              {/* Horizontal grid lines (gray, moving towards viewer) */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '-50%',
                width: '200%',
                height: '45%',
                background: isDark
                  ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 50px)'
                  : 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 50px)',
                transform: 'perspective(500px) rotateX(60deg)',
                transformOrigin: 'center top',
                animation: 'gridMoveTowards 2s linear infinite',
                willChange: 'background-position',
                backfaceVisibility: 'hidden'
              }} />
              
              {/* Sun circle outline - centered in chat area */}
              <div style={{
                position: 'absolute',
                top: '51%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '460px',
                height: '460px',
                borderRadius: '50%',
                border: isDark 
                  ? '2px solid rgba(255,255,255,0.15)' 
                  : '2px solid rgba(0,0,0,0.15)',
                background: 'transparent',
                clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
              }} />
              
              {/* Audio-reactive wave circle */}
              <AudioWaveCircle frequencyData={frequencyData} isDark={isDark} />
              
            </div>
          )}
        </>
      )}

      {/* Music credit - outside animation container for clickability */}
      {showAnimations && animationType === 'retro' && (!activeChatId || !activeChat?.messages?.length) && (
        <div style={{
          position: 'fixed',
          bottom: '14px',
          right: '14px',
          fontSize: '0.7rem',
          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* Volume button with slide-out slider */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            {/* Sliding volume slider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              width: showVolumeSlider ? '65px' : '0px',
              opacity: showVolumeSlider ? 1 : 0,
              transition: 'width 0.25s ease, opacity 0.2s ease',
              overflow: 'hidden',
              height: '20px'
            }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={retroAudioVolume}
                onChange={(e) => setRetroAudioVolume(parseFloat(e.target.value))}
                style={{
                  width: '60px',
                  height: '4px',
                  cursor: 'pointer',
                  accentColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  opacity: 0.8,
                  flexShrink: 0
                }}
                title={`Volume: ${Math.round(retroAudioVolume * 100)}%`}
              />
            </div>
            
            {/* Volume/Mute button */}
            <button
              onClick={() => setRetroAudioEnabled(!retroAudioEnabled)}
              style={{
                background: showVolumeSlider 
                  ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
                  : 'transparent',
                border: 'none',
                padding: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                color: showVolumeSlider
                  ? (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)')
                  : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              title={retroAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {retroAudioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          </div>
          
          {/* Music credit */}
          <span>
            Music by{' '}
            <span 
              role="button"
              tabIndex={0}
              onClick={() => {
                if (window.electronAPI?.openExternal) {
                  window.electronAPI.openExternal(currentTrack.url);
                } else {
                  window.open(currentTrack.url, '_blank');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(currentTrack.url);
                  } else {
                    window.open(currentTrack.url, '_blank');
                  }
                }
              }}
              style={{
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                textDecoration: 'underline',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
            >
              {currentTrack.artist}
            </span>
          </span>
        </div>
      )}

      {/* Audio element - outside animation container */}
      <audio 
        ref={retroAudioRef} 
        src={currentTrack.src} 
        preload="auto"
        onEnded={handleTrackEnd}
      />

      <TitleBar />

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: 'transparent'
      }}>
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

        <ChatArea
          activeChatId={activeChatId}
          messages={activeChat?.messages || []}
          onUpdateMessages={handleUpdateMessages}
          onFirstMessage={handleFirstMessage}
          inferenceSettings={appSettings}
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
