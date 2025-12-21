import { memo, useCallback, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getSlotElements, emitPluginEvent, getPluginState, setPluginState, getIcon } from '../utils/pluginUIRegistry';
import { useTheme } from '../contexts/ThemeContext';

/**
 * PluginSlot - Rendert UI-Elemente von Plugins an einem bestimmten Slot
 * 
 * Verfügbare Slots:
 * - chat-input-left: Links vom Chat-Input
 * - chat-input-right: Rechts vom Chat-Input
 * - chat-input-above: Über dem Chat-Input
 * - chat-toolbar: Haupt-Toolbar
 * - sidebar-top: Oben in der Sidebar
 * - sidebar-bottom: Unten in der Sidebar
 * - message-actions: Aktionen auf Nachrichten
 * - settings-tab: Custom Settings Tab
 * - model-selector: Model-Dropdown Erweiterungen
 */
const PluginSlot = memo(({ 
  slot, 
  style = {},
  className = '',
  direction = 'row', // 'row' oder 'column'
  messageId = null,  // Für message-actions Slot
}) => {
  const { theme, isDark } = useTheme();
  const [elements, setElements] = useState([]);
  const [activeStates, setActiveStates] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  // Elemente laden und auf Updates hören
  useEffect(() => {
    const updateElements = () => {
      const slotElements = getSlotElements(slot);
      setElements(slotElements);
      
      // Initial States laden
      const states = {};
      slotElements.forEach(el => {
        if (el.stateKey) {
          const savedState = getPluginState(el.pluginId, el.stateKey);
          if (savedState !== undefined) {
            states[el.id] = savedState;
          }
        }
      });
      setActiveStates(prev => ({ ...prev, ...states }));
    };
    
    updateElements();
    
    // Auf Slot-Updates hören
    const handleSlotUpdate = (e) => {
      if (e.detail.slot === slot) {
        updateElements();
      }
    };
    
    // Auf State-Changes hören
    const handleStateChange = (e) => {
      const { pluginId, key, value } = e.detail;
      // Finde Element mit diesem stateKey
      const element = elements.find(el => el.pluginId === pluginId && el.stateKey === key);
      if (element) {
        setActiveStates(prev => ({ ...prev, [element.id]: value }));
      }
    };
    
    window.addEventListener('plugin-slot-update', handleSlotUpdate);
    window.addEventListener('plugin-state-change', handleStateChange);
    
    return () => {
      window.removeEventListener('plugin-slot-update', handleSlotUpdate);
      window.removeEventListener('plugin-state-change', handleStateChange);
    };
  }, [slot, elements.length]);

  // Element-Klick Handler
  const handleClick = useCallback(async (element) => {
    const elementKey = element.id;
    const currentState = activeStates[elementKey] || false;
    const newState = !currentState;
    
    // Loading State setzen
    setLoadingStates(prev => ({ ...prev, [elementKey]: true }));
    
    try {
      // State aktualisieren
      if (element.stateKey) {
        setActiveStates(prev => ({ ...prev, [elementKey]: newState }));
        setPluginState(element.pluginId, element.stateKey, newState);
      }
      
      // Event an Plugin senden
      const result = emitPluginEvent(element.pluginId, 'ui-click', {
        elementId: element.id,
        isActive: newState,
        stateKey: element.stateKey,
        messageId,
        slot,
      });
      
      // Wenn Handler ein Promise zurückgibt, warten
      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      console.error(`[PluginSlot] Error handling click for ${element.id}:`, err);
      // State zurücksetzen bei Fehler
      if (element.stateKey) {
        setActiveStates(prev => ({ ...prev, [elementKey]: currentState }));
        setPluginState(element.pluginId, element.stateKey, currentState);
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [elementKey]: false }));
    }
  }, [activeStates, messageId, slot]);

  // Hold-Events für Buttons mit holdToActivate
  const handleMouseDown = useCallback((element) => {
    if (!element.holdToActivate) return;
    
    emitPluginEvent(element.pluginId, 'ui-hold-start', {
      elementId: element.id,
      messageId,
      slot,
    });
  }, [messageId, slot]);

  const handleMouseUp = useCallback((element) => {
    if (!element.holdToActivate) return;
    
    emitPluginEvent(element.pluginId, 'ui-hold-end', {
      elementId: element.id,
      messageId,
      slot,
    });
  }, [messageId, slot]);

  if (elements.length === 0) {
    return null;
  }

  // Element rendern basierend auf Typ
  const renderElement = (element, index) => {
    const Icon = getIcon(element.icon);
    const isActive = activeStates[element.id] || false;
    const isLoading = loadingStates[element.id] || false;

    // Custom Component
    if (element.type === 'custom' && element.component) {
      const CustomComponent = element.component;
      return (
        <CustomComponent 
          key={`${element.pluginId}-${element.id}`}
          isActive={isActive}
          isLoading={isLoading}
          theme={theme}
          isDark={isDark}
          messageId={messageId}
          pluginId={element.pluginId}
          {...element.props}
          onAction={(data) => emitPluginEvent(element.pluginId, 'ui-action', { 
            elementId: element.id, 
            ...data 
          })}
        />
      );
    }

    // Standard Button Styles
    const baseButtonStyle = {
      background: 'transparent',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
      color: theme.textSecondary,
      cursor: 'pointer',
      padding: element.label ? '6px 10px' : '6px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      fontSize: '0.85rem',
      transition: 'all 0.2s ease',
      opacity: isLoading ? 0.7 : 1,
    };

    const activeButtonStyle = {
      background: isDark ? '#fff' : '#1a1a1a',
      border: 'none',
      color: isDark ? '#000' : '#fff',
    };

    // Toggle Button
    if (element.type === 'toggle-button' || element.type === 'toggle') {
      return (
        <button
          key={`${element.pluginId}-${element.id}-${index}`}
          onClick={() => handleClick(element)}
          disabled={isLoading}
          title={element.tooltip}
          style={{
            ...baseButtonStyle,
            ...(isActive ? activeButtonStyle : {}),
          }}
        >
          {isLoading ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Icon size={16} />
          )}
          {element.label && <span>{element.label}</span>}
        </button>
      );
    }

    // Hold Button (z.B. für Voice Recording)
    if (element.type === 'hold-button') {
      return (
        <button
          key={`${element.pluginId}-${element.id}-${index}`}
          onMouseDown={() => handleMouseDown(element)}
          onMouseUp={() => handleMouseUp(element)}
          onMouseLeave={() => handleMouseUp(element)}
          onTouchStart={() => handleMouseDown(element)}
          onTouchEnd={() => handleMouseUp(element)}
          disabled={isLoading}
          title={element.tooltip}
          style={{
            ...baseButtonStyle,
            ...(isActive ? { 
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              transform: 'scale(1.05)',
            } : {}),
          }}
        >
          {isLoading ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Icon size={16} />
          )}
          {element.label && <span>{element.label}</span>}
        </button>
      );
    }

    // Action Button (einmaliger Klick)
    if (element.type === 'action-button' || element.type === 'button') {
      return (
        <button
          key={`${element.pluginId}-${element.id}-${index}`}
          onClick={() => handleClick(element)}
          disabled={isLoading}
          title={element.tooltip}
          style={baseButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
            e.currentTarget.style.color = theme.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = theme.textSecondary;
          }}
        >
          {isLoading ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Icon size={16} />
          )}
          {element.label && <span>{element.label}</span>}
        </button>
      );
    }

    // Indicator (nur Anzeige, kein Klick)
    if (element.type === 'indicator') {
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
    }

    // Separator
    if (element.type === 'separator') {
      return (
        <div
          key={`${element.pluginId}-${element.id}-${index}`}
          style={{
            width: direction === 'row' ? '1px' : '100%',
            height: direction === 'row' ? '20px' : '1px',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            margin: direction === 'row' ? '0 4px' : '4px 0',
          }}
        />
      );
    }

    // Fallback: Standard Button
    return (
      <button
        key={`${element.pluginId}-${element.id}-${index}`}
        onClick={() => handleClick(element)}
        disabled={isLoading}
        title={element.tooltip}
        style={baseButtonStyle}
      >
        {isLoading ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Icon size={16} />
        )}
        {element.label && <span>{element.label}</span>}
      </button>
    );
  };

  return (
    <div 
      className={`plugin-slot plugin-slot-${slot} ${className}`}
      style={{
        display: 'flex',
        flexDirection: direction,
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
