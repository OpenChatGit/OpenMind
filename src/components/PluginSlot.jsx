import { memo, useCallback } from 'react';
import { Image, Mic, Volume2, Search, Code, Zap, Settings, Play, Square } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Icon mapping for plugin UI elements
const ICON_MAP = {
  Image,
  Mic,
  Volume2,
  Search,
  Code,
  Zap,
  Settings,
  Play,
  Square,
};

/**
 * PluginSlot - Renders UI elements from plugins at a specific slot
 * 
 * Slots:
 * - chat-input-left: Left side of chat input
 * - chat-input-right: Right side of chat input  
 * - chat-input-above: Above the chat input
 * - chat-toolbar: Main toolbar
 * - sidebar-top: Top of sidebar
 * - sidebar-bottom: Bottom of sidebar
 * - message-actions: Actions on messages
 * - model-selector: Model dropdown additions
 */
const PluginSlot = memo(({ 
  slot, 
  elements = [], 
  onAction,
  activeStates = {},
  style = {},
}) => {
  const { theme, isDark } = useTheme();

  // Handle element click
  const handleClick = useCallback((element) => {
    if (onAction) {
      onAction(element.pluginId, element.id, element);
    }
  }, [onAction]);

  if (!elements || elements.length === 0) {
    return null;
  }

  // Render based on element type
  const renderElement = (element, index) => {
    const Icon = ICON_MAP[element.icon] || Zap;
    const isActive = activeStates[element.id] || false;

    switch (element.type) {
      case 'button':
        return (
          <button
            key={`${element.pluginId}-${element.id}-${index}`}
            onClick={() => handleClick(element)}
            title={element.tooltip}
            style={{
              background: isActive 
                ? (isDark ? '#fff' : '#1a1a1a') 
                : 'transparent',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
              color: isActive 
                ? (isDark ? '#000' : '#fff') 
                : theme.textSecondary,
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = theme.text;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.textSecondary;
              }
            }}
          >
            <Icon size={16} />
            {element.label && <span>{element.label}</span>}
          </button>
        );

      case 'toggle':
        return (
          <button
            key={`${element.pluginId}-${element.id}-${index}`}
            onClick={() => handleClick(element)}
            title={element.tooltip}
            style={{
              background: isActive 
                ? (isDark ? '#fff' : '#1a1a1a') 
                : 'transparent',
              border: isActive 
                ? 'none' 
                : `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
              color: isActive 
                ? (isDark ? '#000' : '#fff') 
                : theme.textSecondary,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Icon size={16} />
          </button>
        );

      case 'indicator':
        return (
          <div
            key={`${element.pluginId}-${element.id}-${index}`}
            title={element.tooltip}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: element.color ? `${element.color}20` : theme.bgTertiary,
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: element.color || theme.textSecondary,
            }}
          >
            <Icon size={12} />
            {element.label && <span>{element.label}</span>}
          </div>
        );

      case 'dropdown-section':
        // This is handled by the parent component (model selector)
        return null;

      default:
        return null;
    }
  };

  return (
    <div 
      className={`plugin-slot plugin-slot-${slot}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        ...style,
      }}
    >
      {elements.map((element, index) => renderElement(element, index))}
    </div>
  );
});

PluginSlot.displayName = 'PluginSlot';

export default PluginSlot;
