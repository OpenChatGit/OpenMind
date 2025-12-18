import { useState, useEffect, useCallback, memo } from 'react';
import { Mic, Loader2 } from 'lucide-react';

// Icon mapping
const ICONS = {
  mic: Mic,
};

// Built-in plugin handlers (for plugins that need special handling)
const BUILTIN_PLUGINS = {
  whisper: {
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    recordingStartTime: null,
    
    async onButtonDown(plugin, showStatus) {
      if (this.isRecording) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000
          } 
        });
        
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/mp4';
        
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
        this.audioChunks = [];
        this.recordingStartTime = Date.now();
        
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };
        
        this.mediaRecorder.start(100);
        this.isRecording = true;
        showStatus('🎤 Recording...', 'recording');
        
      } catch (err) {
        console.error('Microphone error:', err);
        if (err.name === 'NotAllowedError') {
          showStatus('Microphone access denied', 'error');
        } else if (err.name === 'NotFoundError') {
          showStatus('No microphone found', 'error');
        } else {
          showStatus('Microphone error', 'error');
        }
      }
    },
    
    async onButtonUp(plugin, showStatus, setInputText) {
      if (!this.isRecording) return;
      
      this.isRecording = false;
      
      const recordingDuration = Date.now() - this.recordingStartTime;
      if (recordingDuration < 500) {
        showStatus('Hold longer to record', 'warning');
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
          this.mediaRecorder.stop();
        }
        return;
      }
      
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        const mimeType = this.mediaRecorder.mimeType;
        this.mediaRecorder.stop();
        
        this.mediaRecorder.onstop = async () => {
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
          
          if (this.audioChunks.length === 0) {
            showStatus('No audio recorded', 'warning');
            return;
          }
          
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          
          if (audioBlob.size < 1000) {
            showStatus('Recording too short', 'warning');
            return;
          }
          
          showStatus('⏳ Transcribing...', 'processing');
          
          try {
            // Convert blob to base64 for IPC transfer
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = btoa(
              new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            const endpoint = plugin.integration?.endpoint || 'http://localhost:9000';
            console.log('[Whisper] Sending to Electron main process, endpoint:', endpoint);
            
            // Use Electron API to avoid CORS
            const result = await window.electronAPI?.whisperTranscribe(base64Audio, mimeType, endpoint);
            
            if (result?.success) {
              const text = result.text || '';
              
              if (text.trim()) {
                setInputText(text.trim());
                showStatus('✓ Done', 'success');
                setTimeout(() => showStatus('', 'idle'), 1500);
              } else {
                showStatus('No speech detected', 'warning');
              }
            } else {
              console.error('Whisper API error:', result?.error);
              showStatus('Transcription failed', 'error');
            }
          } catch (err) {
            console.error('Whisper error:', err);
            showStatus('Whisper error', 'error');
          }
        };
      }
    }
  }
};

/**
 * Single Plugin Button
 */
const PluginButton = memo(({ pluginId, plugin, button, theme, setInputText }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState({ message: '', type: 'idle' });
  
  const Icon = ICONS[button.icon] || Mic;
  
  const showStatus = useCallback((message, type = 'idle') => {
    setStatus({ message, type });
    if (type === 'error' || type === 'warning') {
      setTimeout(() => setStatus({ message: '', type: 'idle' }), 3000);
    }
  }, []);
  
  // Handle mouse/touch down
  const handleDown = useCallback(async (e) => {
    e.preventDefault();
    if (!button.holdToActivate) return;
    
    setIsActive(true);
    
    // Use built-in handler if available
    const builtinHandler = BUILTIN_PLUGINS[pluginId];
    if (builtinHandler?.onButtonDown) {
      await builtinHandler.onButtonDown(plugin, showStatus);
    }
  }, [pluginId, plugin, button, showStatus]);
  
  // Handle mouse/touch up
  const handleUp = useCallback(async (e) => {
    e.preventDefault();
    if (!button.holdToActivate || !isActive) return;
    
    setIsActive(false);
    
    // Use built-in handler if available
    const builtinHandler = BUILTIN_PLUGINS[pluginId];
    if (builtinHandler?.onButtonUp) {
      await builtinHandler.onButtonUp(plugin, showStatus, setInputText);
    }
  }, [pluginId, plugin, button, isActive, showStatus, setInputText]);
  
  // Handle click (for non-hold buttons)
  const handleClick = useCallback(() => {
    if (button.holdToActivate) return;
    
    const builtinHandler = BUILTIN_PLUGINS[pluginId];
    if (builtinHandler?.onButtonClick) {
      builtinHandler.onButtonClick(plugin, showStatus, setInputText);
    }
  }, [pluginId, plugin, button, showStatus, setInputText]);
  
  return (
    <div style={{ position: 'relative' }}>
      {/* Status indicator */}
      {status.message && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          marginBottom: '8px',
          background: status.type === 'recording' ? 'rgba(239, 68, 68, 0.95)' :
                     status.type === 'processing' ? 'rgba(59, 130, 246, 0.95)' :
                     status.type === 'success' ? 'rgba(34, 197, 94, 0.95)' :
                     status.type === 'error' ? 'rgba(239, 68, 68, 0.95)' :
                     status.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' :
                     theme.bgTertiary,
          color: 'white',
          zIndex: 10,
          fontWeight: '500',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {status.message}
        </div>
      )}
      
      {/* Button */}
      <button
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchStart={handleDown}
        onTouchEnd={handleUp}
        onClick={handleClick}
        title={button.tooltip}
        style={{
          background: isActive ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
          border: 'none',
          borderRadius: '8px',
          padding: '8px',
          cursor: 'pointer',
          color: isActive ? '#ef4444' : theme.textSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          transform: isActive ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {status.type === 'processing' ? (
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Icon size={18} />
        )}
      </button>
    </div>
  );
});

/**
 * Plugin Buttons Container
 * Automatically loads and displays buttons from running plugins
 */
const PluginButtons = memo(({ position = 'chat-input', theme, isDark, setInputText }) => {
  const [buttons, setButtons] = useState([]);
  const [plugins, setPlugins] = useState(new Map());
  
  // Fetch plugins and check which are running
  useEffect(() => {
    let mounted = true;
    
    const checkPlugins = async () => {
      try {
        // Get plugin registry
        const registry = await window.electronAPI?.loadOnlinePluginRegistry();
        if (!registry?.success || !mounted) return;
        
        // Get running containers
        const dockerStatus = await window.electronAPI?.checkDockerStatus();
        if (!dockerStatus?.running || !mounted) return;
        
        const containersResult = await window.electronAPI?.getDockerContainers();
        if (!containersResult?.success || !mounted) return;
        
        const containers = containersResult.containers || [];
        
        // Find plugins with UI that are running
        const uiPlugins = registry.plugins.filter(p => p.ui?.hasUI);
        const activeButtons = [];
        const activePlugins = new Map();
        
        for (const plugin of uiPlugins) {
          const container = containers.find(c => {
            const name = c.name?.replace(/^\//, '');
            return name === plugin.containerName;
          });
          
          const isRunning = container?.state === 'running';
          
          if (isRunning && plugin.ui?.buttons) {
            // For now, skip health check - just trust Docker state
            // Health check via fetch causes CORS issues
            /*
            if (plugin.integration?.endpoint) {
              try {
                const healthUrl = plugin.integration.endpoint + (plugin.integration.healthCheck || '/');
                const healthCheck = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(2000) });
                if (!healthCheck.ok) {
                  console.log(`[Plugin] ${plugin.name} container running but service not ready`);
                  continue;
                }
              } catch {
                console.log(`[Plugin] ${plugin.name} container running but service not responding`);
                continue;
              }
            }
            */
            
            console.log(`[Plugin] ${plugin.name} is running`);
            activePlugins.set(plugin.id, plugin);
            
            // Add buttons for this position
            plugin.ui.buttons
              .filter(btn => btn.position === position)
              .forEach(btn => {
                activeButtons.push({
                  ...btn,
                  pluginId: plugin.id,
                  pluginName: plugin.name
                });
              });
          }
        }
        
        if (mounted) {
          setButtons(activeButtons);
          setPlugins(activePlugins);
        }
      } catch (err) {
        console.error('Plugin check error:', err);
      }
    };
    
    checkPlugins();
    const interval = setInterval(checkPlugins, 10000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [position]);
  
  if (buttons.length === 0) return null;
  
  return (
    <>
      {buttons.map(btn => (
        <PluginButton
          key={`${btn.pluginId}-${btn.id}`}
          pluginId={btn.pluginId}
          plugin={plugins.get(btn.pluginId)}
          button={btn}
          theme={theme}
          setInputText={setInputText}
        />
      ))}
    </>
  );
});

export default PluginButtons;
