import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Eye, Settings, Info, Box, RefreshCw, 
  Sun, Moon, Type, Contrast, Zap, ZapOff, Check, AlertCircle
} from 'lucide-react';
import { useTheme, colorblindModes } from '../contexts/ThemeContext';

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange, theme, isDark }) => (
  <div 
    onClick={onChange}
    style={{
      width: '44px',
      height: '24px',
      background: enabled ? (isDark ? '#fff' : '#1a1a1a') : theme.border,
      borderRadius: '12px',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s',
      flexShrink: 0,
    }}
  >
    <div style={{
      width: '18px',
      height: '18px',
      background: enabled ? (isDark ? '#1a1a1a' : '#fff') : theme.bgSecondary,
      borderRadius: '50%',
      position: 'absolute',
      top: '3px',
      left: enabled ? '23px' : '3px',
      transition: 'left 0.2s',
    }} />
  </div>
);

// Setting Row Component
const SettingRow = ({ icon: Icon, title, description, children, theme, isDark, onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '14px 16px',
      background: theme.bgTertiary,
      borderRadius: '8px',
      border: `1px solid ${theme.border}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => onClick && (e.currentTarget.style.background = theme.bgHover)}
    onMouseLeave={(e) => onClick && (e.currentTarget.style.background = theme.bgTertiary)}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
      {Icon && <Icon size={18} color={theme.textSecondary} />}
      <div>
        <div style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>{title}</div>
        {description && (
          <div style={{ color: theme.textSecondary, fontSize: '0.8rem', marginTop: '2px' }}>{description}</div>
        )}
      </div>
    </div>
    {children}
  </div>
);



// General Settings Section
const GeneralSettings = ({ theme, isDark }) => {
  const { themeName, setTheme, toggleThemeWithRipple } = useTheme();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ color: theme.text, fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
          General
        </h3>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          Configure general application settings.
        </p>
      </div>

      {/* Theme Selection */}
      <div>
        <label style={{ 
          display: 'block', color: theme.textSecondary, fontSize: '0.75rem',
          marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          Theme
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'dark', name: 'Dark', icon: Moon },
            { id: 'light', name: 'Light', icon: Sun },
          ].map(({ id, name, icon: Icon }) => {
            const isSelected = themeName === id;
            return (
              <button
                key={id}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  toggleThemeWithRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
                }}
                style={{
                  flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  background: isSelected ? theme.bgActive : theme.bgTertiary,
                  border: isSelected ? `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}` : `1px solid ${theme.border}`,
                  borderRadius: '8px', cursor: 'pointer', color: theme.text, fontSize: '0.9rem',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={18} />
                {name}
                {isSelected && <Check size={16} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};


// Accessibility Settings Section - Uses ThemeContext for global state
const AccessibilitySettings = () => {
  const { theme, isDark, colorblindMode, setColorblindMode, 
          highContrast, setHighContrast, reducedMotion, setReducedMotion, 
          fontSize, setFontSize, showAnimations, setShowAnimations } = useTheme();
  
  // When reduced motion is enabled, also disable animations
  const handleReducedMotionChange = () => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    if (newValue && showAnimations) {
      setShowAnimations(false);
    }
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ color: theme.text, fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
          Accessibility
        </h3>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          Adjust settings for better accessibility and comfort.
        </p>
      </div>

      {/* High Contrast Mode */}
      <SettingRow 
        icon={Contrast}
        title="High Contrast" 
        description="Increase contrast for better visibility"
        theme={theme} isDark={isDark}
        onClick={() => setHighContrast(!highContrast)}
      >
        <ToggleSwitch enabled={highContrast} onChange={() => setHighContrast(!highContrast)} theme={theme} isDark={isDark} />
      </SettingRow>

      {/* Reduced Motion */}
      <SettingRow 
        icon={ZapOff}
        title="Reduced Motion" 
        description="Minimize animations and motion effects"
        theme={theme} isDark={isDark}
        onClick={handleReducedMotionChange}
      >
        <ToggleSwitch enabled={reducedMotion} onChange={handleReducedMotionChange} theme={theme} isDark={isDark} />
      </SettingRow>

      {/* Font Size */}
      <div>
        <label style={{ 
          display: 'flex', alignItems: 'center', gap: '8px',
          color: theme.textSecondary, fontSize: '0.75rem',
          marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          <Type size={14} /> Font Size
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'small', label: 'S' },
            { id: 'medium', label: 'M' },
            { id: 'large', label: 'L' },
            { id: 'extra-large', label: 'XL' },
          ].map(({ id, label }) => {
            const isSelected = fontSize === id;
            return (
              <button
                key={id}
                onClick={() => setFontSize(id)}
                style={{
                  flex: 1, padding: '10px', 
                  background: isSelected ? (isDark ? '#fff' : '#1a1a1a') : theme.bgTertiary,
                  border: `1px solid ${isSelected ? 'transparent' : theme.border}`,
                  borderRadius: '6px', cursor: 'pointer',
                  color: isSelected ? (isDark ? '#000' : '#fff') : theme.text,
                  fontSize: '0.85rem', fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>


      {/* Colorblind Mode Selection */}
      <div>
        <label style={{ 
          display: 'flex', alignItems: 'center', gap: '8px',
          color: theme.textSecondary, fontSize: '0.75rem',
          marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          <Eye size={14} /> Color Vision Mode
        </label>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(colorblindModes).map(([key, mode]) => {
            const isSelected = colorblindMode === key;
            return (
              <div
                key={key}
                onClick={() => setColorblindMode(key)}
                style={{
                  padding: '12px 14px',
                  background: isSelected ? theme.bgActive : theme.bgTertiary,
                  border: isSelected ? `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}` : `1px solid ${theme.border}`,
                  borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = theme.bgHover)}
                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = theme.bgTertiary)}
              >
                {/* Color Preview Dots */}
                <div style={{ 
                  display: 'flex', gap: '4px', padding: '6px',
                  background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: mode.colors.error }} title="Error" />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: mode.colors.success }} title="Success" />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: mode.colors.warning }} title="Warning" />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: mode.colors.info }} title="Info" />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>{mode.name}</div>
                  <div style={{ color: theme.textSecondary, fontSize: '0.75rem' }}>{mode.description}</div>
                </div>
                
                {isSelected && <Check size={16} color={theme.text} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <label style={{ 
          display: 'block', color: theme.textSecondary, fontSize: '0.75rem',
          marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          Color Preview
        </label>
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap',
          padding: '14px', background: theme.bgTertiary, borderRadius: '8px', border: `1px solid ${theme.border}`,
        }}>
          {(() => {
            const colors = colorblindModes[colorblindMode].colors;
            return (
              <>
                <div style={{ padding: '6px 12px', background: colors.errorBg, color: colors.error, borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> Error
                </div>
                <div style={{ padding: '6px 12px', background: colors.successBg, color: colors.success, borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} /> Success
                </div>
                <div style={{ padding: '6px 12px', background: colors.warningBg, color: colors.warning, borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500' }}>
                  Warning
                </div>
                <div style={{ padding: '6px 12px', background: `${colors.info}20`, color: colors.info, borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500' }}>
                  Info
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};


// Docker Settings Section
const DockerSettings = ({ theme, isDark }) => {
  const [dockerStatus, setDockerStatus] = useState({ running: false, version: null });
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDockerInfo = async () => {
    try {
      // Check Docker status
      const status = await window.electronAPI?.checkDockerStatus();
      setDockerStatus(status || { running: false });
      
      // If Docker is running, get containers
      if (status?.running) {
        const result = await window.electronAPI?.getDockerContainers();
        if (result?.success) {
          setContainers(result.containers || []);
        }
      } else {
        setContainers([]);
      }
    } catch (error) {
      console.error('Error loading Docker info:', error);
      setDockerStatus({ running: false, error: error.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDockerInfo();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDockerInfo();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ color: theme.text, fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
            Docker
          </h3>
          <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
            View Docker status and running containers.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: theme.bgTertiary,
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            padding: '8px 12px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            color: theme.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Docker Status */}
      <div style={{
        padding: '16px',
        background: theme.bgTertiary,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          background: dockerStatus.running ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Box size={20} color={dockerStatus.running ? '#22c55e' : '#ef4444'} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: theme.text, fontSize: '0.95rem', fontWeight: '500' }}>
            Docker {dockerStatus.running ? 'Connected' : 'Not Connected'}
          </div>
          <div style={{ color: theme.textSecondary, fontSize: '0.8rem', marginTop: '2px' }}>
            {loading ? 'Checking...' : dockerStatus.running 
              ? `Version ${dockerStatus.version}` 
              : 'Docker is not running or not installed'}
          </div>
        </div>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: dockerStatus.running ? '#22c55e' : '#ef4444',
        }} />
      </div>

      {/* Running Containers */}
      {dockerStatus.running && (
        <div>
          <label style={{ 
            display: 'block', color: theme.textSecondary, fontSize: '0.75rem',
            marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            Running Containers ({containers.length})
          </label>
          
          {containers.length === 0 ? (
            <div style={{
              padding: '24px',
              background: theme.bgTertiary,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              textAlign: 'center',
              color: theme.textSecondary,
              fontSize: '0.85rem',
            }}>
              No containers running
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {containers.map((container) => (
                <div
                  key={container.id}
                  style={{
                    padding: '14px 16px',
                    background: theme.bgTertiary,
                    borderRadius: '8px',
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Box size={16} color={theme.textSecondary} />
                      <span style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>
                        {container.name}
                      </span>
                    </div>
                    <span style={{
                      padding: '3px 8px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#22c55e',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '500',
                    }}>
                      {container.status?.split(' ')[0] || 'Running'}
                    </span>
                  </div>
                  
                  <div style={{ color: theme.textSecondary, fontSize: '0.8rem', marginBottom: '6px' }}>
                    Image: {container.image}
                  </div>
                  
                  {container.ports && container.ports.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {container.ports.map((port, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 8px',
                            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: theme.text,
                            fontFamily: 'monospace',
                          }}
                        >
                          {port}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help text when Docker not running */}
      {!dockerStatus.running && !loading && (
        <div style={{
          padding: '16px',
          background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          <div style={{ color: theme.text, fontSize: '0.85rem', fontWeight: '500', marginBottom: '6px' }}>
            Docker not detected
          </div>
          <div style={{ color: theme.textSecondary, fontSize: '0.8rem', lineHeight: 1.5 }}>
            Make sure Docker Desktop is installed and running. Some features like SearXNG require Docker.
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// About Section
const AboutSettings = ({ theme }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ color: theme.text, fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
          About
        </h3>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          Information about OpenMind.
        </p>
      </div>

      <div style={{
        padding: '24px', background: theme.bgTertiary, borderRadius: '8px',
        border: `1px solid ${theme.border}`, textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🧠</div>
        <h2 style={{ color: theme.text, margin: '0 0 8px 0', fontSize: '1.3rem' }}>OpenMind</h2>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: '0 0 16px 0' }}>
          Version 1.0.0
        </p>
        <p style={{ color: theme.textSecondary, fontSize: '0.8rem', margin: 0, lineHeight: 1.6 }}>
          A modern AI chat application with local LLM support,<br />
          HuggingFace integration, and privacy-first design.
        </p>
      </div>

      <div style={{
        padding: '16px', background: theme.bgTertiary, borderRadius: '8px',
        border: `1px solid ${theme.border}`,
      }}>
        <div style={{ color: theme.textSecondary, fontSize: '0.8rem', lineHeight: 1.6 }}>
          <strong style={{ color: theme.text }}>Features:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Local GGUF model support via llama.cpp</li>
            <li>Ollama integration</li>
            <li>HuggingFace model discovery</li>
            <li>DeepSearch with web browsing</li>
            <li>Custom model creation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Navigation items
const navItems = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'docker', label: 'Docker', icon: Box },
  { id: 'accessibility', label: 'Accessibility', icon: Eye },
  { id: 'about', label: 'About', icon: Info },
];

const SettingsModal = ({ isOpen, onClose, settings, onSaveSettings }) => {
  const { theme, isDark } = useTheme();
  const [activeSection, setActiveSection] = useState('general');
  const [localSettings, setLocalSettings] = useState({ ...settings });

  useEffect(() => {
    if (isOpen) {
      setLocalSettings({ ...settings });
      setActiveSection('general');
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeSection) {
      case 'general': return <GeneralSettings theme={theme} isDark={isDark} />;
      case 'docker': return <DockerSettings theme={theme} isDark={isDark} />;
      case 'accessibility': return <AccessibilitySettings />;
      case 'about': return <AboutSettings theme={theme} />;
      default: return null;
    }
  };


  return createPortal(
    <div 
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, backdropFilter: 'blur(4px)',
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bg,
          borderRadius: '8px',
          width: '900px',
          maxWidth: '94vw',
          height: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: `1px solid ${theme.border}`,
          boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', borderBottom: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} color={isDark ? '#fff' : '#1a1a1a'} />
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
              Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: theme.textSecondary,
              cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content with Sidebar */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar Navigation */}
          <div style={{
            width: '200px', padding: '14px',
            display: 'flex', flexDirection: 'column', gap: '4px',
            background: theme.bgSecondary, borderRight: `1px solid ${theme.border}`,
          }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    background: isActive ? theme.bgActive : 'transparent',
                    border: 'none', borderRadius: '6px',
                    color: isActive ? theme.text : theme.textSecondary,
                    cursor: 'pointer', fontSize: '0.9rem',
                    fontWeight: isActive ? '500' : '400',
                    textAlign: 'left', transition: 'all 0.2s', width: '100%',
                  }}
                  onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = theme.bgHover, e.currentTarget.style.color = theme.text)}
                  onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = theme.textSecondary)}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
              {renderContent()}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px', borderTop: `1px solid ${theme.border}`,
              display: 'flex', justifyContent: 'flex-end', gap: '10px',
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px', background: 'transparent',
                  border: `1px solid ${theme.border}`, borderRadius: '6px',
                  color: theme.textSecondary, fontSize: '0.9rem', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 20px',
                  background: isDark ? '#fff' : '#1a1a1a',
                  border: 'none', borderRadius: '6px',
                  color: isDark ? '#000' : '#fff',
                  fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#e0e0e0' : '#333'}
                onMouseLeave={(e) => e.currentTarget.style.background = isDark ? '#fff' : '#1a1a1a'}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;
