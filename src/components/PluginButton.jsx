import { useState, useEffect, useCallback, memo } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { triggerPluginEvent } from '../utils/pluginLoader';

// Icon mapping
const ICONS = {
  mic: Mic,
};

/**
 * Plugin Button Component
 * Renders a button defined by a plugin
 */
const PluginButton = memo(({ 
  pluginId, 
  button, 
  theme, 
  isDark,
  onSetInputText 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState({ message: '', type: 'idle' });
  
  const Icon = ICONS[button.icon] || Mic;
  
  // Handle mouse/touch down
  const handleDown = useCallback((e) => {
    e.preventDefault();
    if (button.holdToActivate) {
      setIsActive(true);
      triggerPluginEvent(pluginId, 'down', button.id);
    }
  }, [pluginId, button]);
  
  // Handle mouse/touch up
  const handleUp = useCallback((e) => {
    e.preventDefault();
    if (button.holdToActivate && isActive) {
      setIsActive(false);
      triggerPluginEvent(pluginId, 'up', button.id);
    }
  }, [pluginId, button, isActive]);
  
  // Handle click (for non-hold buttons)
  const handleClick = useCallback(() => {
    if (!button.holdToActivate) {
      triggerPluginEvent(pluginId, 'click', button.id);
    }
  }, [pluginId, button]);
  
  // Listen for status updates from plugin
  useEffect(() => {
    const handleStatus = (e) => {
      if (e.detail.pluginId === pluginId) {
        setStatus({ message: e.detail.message, type: e.detail.type });
        
        // Auto-hide after 3 seconds for non-recording states
        if (e.detail.type !== 'recording' && e.detail.type !== 'processing' && e.detail.message) {
          setTimeout(() => setStatus({ message: '', type: 'idle' }), 3000);
        }
      }
    };
    
    window.addEventListener('plugin-status', handleStatus);
    return () => window.removeEventListener('plugin-status', handleStatus);
  }, [pluginId]);
  
  return (
    <div style={{ position: 'relative' }}>
      {/* Status indicator */}
      {status.message && (
        <div 
          className={`plugin-status visible ${status.type}`}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            marginBottom: '8px',
            background: status.type === 'recording' ? 'rgba(239, 68, 68, 0.9)' :
                       status.type === 'processing' ? 'rgba(59, 130, 246, 0.9)' :
                       status.type === 'error' ? 'rgba(239, 68, 68, 0.9)' :
                       status.type === 'warning' ? 'rgba(245, 158, 11, 0.9)' :
                       theme.bgTertiary,
            color: 'white',
            zIndex: 10,
          }}
        >
          {status.message}
        </div>
      )}
      
      {/* Button */}
      <button
        className={`plugin-btn-${button.id} ${isActive ? 'recording' : ''}`}
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchStart={handleDown}
        onTouchEnd={handleUp}
        onClick={handleClick}
        title={button.tooltip}
        style={{
          background: isActive 
            ? 'rgba(239, 68, 68, 0.2)' 
            : 'transparent',
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
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Icon size={20} />
        )}
      </button>
    </div>
  );
});

export default PluginButton;
