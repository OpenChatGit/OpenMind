import { memo, useCallback, useMemo } from 'react';
import { Files, Search, GitBranch, Bug, Blocks, MessageSquare, Settings, ArrowLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const IDEActivityBar = memo(({ 
  activePanel, 
  onPanelChange, 
  onExitIDE, 
  onOpenSettings,
  isSidePanelVisible,
  onToggleSidePanel,
  showChat,
  onToggleChat
}) => {
  const { theme, isDark } = useTheme();
  
  // Memoize button config to prevent recreation
  const topButtons = useMemo(() => [
    { id: 'files', icon: Files, title: 'Explorer (Ctrl+Shift+E)' },
    { id: 'search', icon: Search, title: 'Search (Ctrl+Shift+F)' },
    { id: 'git', icon: GitBranch, title: 'Source Control (Ctrl+Shift+G)' },
    { id: 'debug', icon: Bug, title: 'Run and Debug (Ctrl+Shift+D)' },
    { id: 'extensions', icon: Blocks, title: 'Extensions (Ctrl+Shift+X)' },
  ], []);

  const handlePanelClick = useCallback((panelId) => {
    if (activePanel === panelId && isSidePanelVisible) {
      // Same panel clicked - toggle visibility
      onToggleSidePanel();
    } else {
      // Different panel - switch to it and ensure visible
      onPanelChange(panelId);
      if (!isSidePanelVisible) {
        onToggleSidePanel();
      }
    }
  }, [activePanel, isSidePanelVisible, onPanelChange, onToggleSidePanel]);

  const renderButton = (btn, isActive = false, customAction = null) => {
    const Icon = btn.icon;
    const handleClick = customAction || (() => handlePanelClick(btn.id));
    
    return (
      <button
        key={btn.id}
        onClick={handleClick}
        style={{
          width: '48px',
          height: '48px',
          background: 'transparent',
          border: 'none',
          borderLeft: isActive ? `2px solid ${theme.text}` : '2px solid transparent',
          color: isActive ? theme.text : theme.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = theme.text;
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = theme.textSecondary;
          }
        }}
        title={btn.title}
      >
        <Icon size={24} />
      </button>
    );
  };

  return (
    <div style={{
      width: '48px',
      minWidth: '48px',
      flexShrink: 0,
      height: '100%',
      background: theme.bgSecondary,
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '4px'
    }}>
      {/* Top Buttons - Panel Toggles */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }}>
        {topButtons.map(btn => renderButton(
          btn, 
          activePanel === btn.id && isSidePanelVisible
        ))}
        
        {/* Chat Button - Separate Toggle */}
        {renderButton(
          { id: 'chat', icon: MessageSquare, title: 'AI Chat (Ctrl+Shift+C)' },
          showChat,
          onToggleChat
        )}
      </div>

      {/* Bottom Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '8px'
      }}>
        {renderButton(
          { id: 'settings', icon: Settings, title: 'Settings' },
          false,
          onOpenSettings
        )}
        {renderButton(
          { id: 'exit', icon: ArrowLeft, title: 'Back to Chat Mode' },
          false,
          onExitIDE
        )}
      </div>
    </div>
  );
});

IDEActivityBar.displayName = 'IDEActivityBar';

export default IDEActivityBar;
