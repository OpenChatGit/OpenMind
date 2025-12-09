import { useState, useEffect } from 'react';
import { X, Eye, Settings, Palette, Info, Volume2, VolumeX } from 'lucide-react';
import { useTheme, colorblindModes } from '../contexts/ThemeContext';

// General Settings Section
const GeneralSettings = ({ settings, setSettings, theme, isDark }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ 
          color: theme.text, 
          fontSize: '1.1rem', 
          fontWeight: '600', 
          marginBottom: '16px',
          margin: 0,
          marginBottom: '16px'
        }}>
          General
        </h3>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          Configure general application settings.
        </p>
      </div>

      {/* Placeholder for future general settings */}
      <div style={{
        padding: '16px',
        background: theme.bgTertiary,
        borderRadius: '10px',
        border: `1px solid ${theme.border}`
      }}>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          More settings coming soon...
        </p>
      </div>
    </div>
  );
};

// Animation type options
const animationTypes = [
  { 
    id: 'circles', 
    name: 'Spinning Circles', 
    description: 'Minimalist rotating circles',
    preview: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.06)']
  },
  { 
    id: 'retro', 
    name: 'Retro Grid', 
    description: 'Animated perspective grid',
    preview: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.08)']
  }
];

// Appearance Settings Section
const AppearanceSettings = () => {
  const { theme, isDark, showAnimations, setShowAnimations, animationType, setAnimationType, retroAudioEnabled, setRetroAudioEnabled, retroAudioVolume, setRetroAudioVolume } = useTheme();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ 
          color: theme.text, 
          fontSize: '1.1rem', 
          fontWeight: '600', 
          margin: 0,
          marginBottom: '16px'
        }}>
          Appearance
        </h3>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          Customize the look and feel of the application.
        </p>
      </div>

      {/* Background Animations Toggle */}
      <div>
        <label style={{ 
          display: 'block',
          color: theme.textSecondary, 
          fontSize: '0.8rem',
          marginBottom: '12px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Background Animations
        </label>
        <div 
          onClick={() => setShowAnimations(!showAnimations)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: theme.bgTertiary,
            borderRadius: '10px',
            border: `1px solid ${theme.border}`,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div>
            <div style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>
              Enable background animations
            </div>
            <div style={{ color: theme.textSecondary, fontSize: '0.8rem', marginTop: '2px' }}>
              Decorative animated background effects
            </div>
          </div>
          {/* Toggle Switch */}
          <div style={{
            width: '44px',
            height: '24px',
            background: showAnimations ? (isDark ? '#fff' : '#1a1a1a') : theme.border,
            borderRadius: '12px',
            position: 'relative',
            transition: 'background 0.2s'
          }}>
            <div style={{
              width: '18px',
              height: '18px',
              background: showAnimations ? (isDark ? '#1a1a1a' : '#fff') : theme.bgSecondary,
              borderRadius: '50%',
              position: 'absolute',
              top: '3px',
              left: showAnimations ? '23px' : '3px',
              transition: 'left 0.2s'
            }} />
          </div>
        </div>
      </div>

      {/* Animation Type Selection */}
      {showAnimations && (
        <div>
          <label style={{ 
            display: 'block',
            color: theme.textSecondary, 
            fontSize: '0.8rem',
            marginBottom: '12px',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Animation Style
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {animationTypes.map((type) => {
              const isSelected = animationType === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => setAnimationType(type.id)}
                  style={{
                    padding: '14px 16px',
                    background: isSelected ? theme.bgActive : theme.bgTertiary,
                    border: isSelected 
                      ? `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}` 
                      : `1px solid ${theme.border}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = theme.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = theme.bgTertiary;
                  }}
                >
                  {/* Preview */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '4px',
                    padding: '8px',
                    background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    minWidth: '60px',
                    justifyContent: 'center'
                  }}>
                    {type.preview.map((color, i) => (
                      <div key={i} style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: color
                      }} />
                    ))}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: theme.text, 
                      fontSize: '0.9rem', 
                      fontWeight: '500'
                    }}>
                      {type.name}
                    </div>
                    <div style={{ color: theme.textSecondary, fontSize: '0.75rem' }}>
                      {type.description}
                    </div>
                  </div>
                  
                  {/* Audio controls for retro - only when selected */}
                  {type.id === 'retro' && isSelected && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px' 
                      }}
                    >
                      {/* Volume slider - only show when audio enabled */}
                      {retroAudioEnabled && (
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={retroAudioVolume}
                          onChange={(e) => setRetroAudioVolume(parseFloat(e.target.value))}
                          style={{
                            width: '60px',
                            height: '4px',
                            cursor: 'pointer',
                            accentColor: isDark ? '#fff' : '#1a1a1a'
                          }}
                          title={`Volume: ${Math.round(retroAudioVolume * 100)}%`}
                        />
                      )}
                      <button
                        onClick={() => setRetroAudioEnabled(!retroAudioEnabled)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: retroAudioEnabled ? theme.text : theme.textSecondary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title={retroAudioEnabled ? 'Mute audio' : 'Enable audio'}
                      >
                        {retroAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      </button>
                    </div>
                  )}
                  
                  {isSelected && type.id !== 'retro' && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: isDark ? '#fff' : '#1a1a1a',
                      borderRadius: '50%'
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


    </div>
  );
};

// Accessibility Settings Section
const AccessibilitySettings = () => {
  const { theme, isDark, colorblindMode, setColorblindMode } = useTheme();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ 
          color: theme.text, 
          fontSize: '1.1rem', 
          fontWeight: '600', 
          margin: 0,
          marginBottom: '16px'
        }}>
          Accessibility
        </h3>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          Adjust settings for better accessibility.
        </p>
      </div>

      {/* Colorblind Mode Selection */}
      <div>
        <label style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: theme.textSecondary, 
          fontSize: '0.8rem',
          marginBottom: '12px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <Eye size={16} />
          Color Vision Mode
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
                  border: isSelected 
                    ? `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}` 
                    : `1px solid ${theme.border}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = theme.bgHover;
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = theme.bgTertiary;
                }}
              >
                {/* Color Preview Dots */}
                <div style={{ 
                  display: 'flex', 
                  gap: '4px',
                  padding: '6px',
                  background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                  borderRadius: '8px'
                }}>
                  <div style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%', 
                    background: mode.colors.error
                  }} title="Error" />
                  <div style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%', 
                    background: mode.colors.success
                  }} title="Success" />
                  <div style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%', 
                    background: mode.colors.warning
                  }} title="Warning" />
                  <div style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%', 
                    background: mode.colors.info
                  }} title="Info" />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    color: theme.text, 
                    fontSize: '0.9rem', 
                    fontWeight: '500'
                  }}>
                    {mode.name}
                  </div>
                  <div style={{ color: theme.textSecondary, fontSize: '0.75rem' }}>
                    {mode.description}
                  </div>
                </div>
                
                {isSelected && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: isDark ? '#fff' : '#1a1a1a',
                    borderRadius: '50%'
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <label style={{ 
          display: 'block', 
          color: theme.textSecondary, 
          fontSize: '0.8rem',
          marginBottom: '12px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Preview
        </label>
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '14px',
          background: theme.bgTertiary,
          borderRadius: '10px',
          border: `1px solid ${theme.border}`
        }}>
          {(() => {
            const colors = colorblindModes[colorblindMode].colors;
            return (
              <>
                <div style={{
                  padding: '6px 12px',
                  background: colors.errorBg,
                  color: colors.error,
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  Error
                </div>
                <div style={{
                  padding: '6px 12px',
                  background: colors.successBg,
                  color: colors.success,
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  Success
                </div>
                <div style={{
                  padding: '6px 12px',
                  background: colors.warningBg,
                  color: colors.warning,
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  Warning
                </div>
                <div style={{
                  padding: '6px 12px',
                  background: `${colors.info}20`,
                  color: colors.info,
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
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

// About Section
const AboutSettings = ({ theme }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ 
          color: theme.text, 
          fontSize: '1.1rem', 
          fontWeight: '600', 
          margin: 0,
          marginBottom: '16px'
        }}>
          About
        </h3>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          Information about OpenMind.
        </p>
      </div>

      <div style={{
        padding: '20px',
        background: theme.bgTertiary,
        borderRadius: '10px',
        border: `1px solid ${theme.border}`,
        textAlign: 'center'
      }}>
        <h2 style={{ color: theme.text, margin: 0, marginBottom: '8px' }}>OpenMind</h2>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0, marginBottom: '16px' }}>
          Version 1.0.0
        </p>
        <p style={{ color: theme.textSecondary, fontSize: '0.8rem', margin: 0 }}>
          A modern AI chat application with local LLM support.
        </p>
      </div>
    </div>
  );
};

// Navigation items
const navItems = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'accessibility', label: 'Accessibility', icon: Eye },
  { id: 'about', label: 'About', icon: Info }
];

const SettingsModal = ({ isOpen, onClose, settings, onSaveSettings }) => {
  const { theme, isDark, toggleTheme } = useTheme();
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
      case 'general':
        return <GeneralSettings settings={localSettings} setSettings={setLocalSettings} theme={theme} isDark={isDark} />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'accessibility':
        return <AccessibilitySettings />;
      case 'about':
        return <AboutSettings theme={theme} />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: theme.bg,
        borderRadius: '16px',
        width: '800px',
        maxWidth: '92vw',
        height: '600px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1px solid ${theme.border}`,
        boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.border}`
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
            Settings
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textSecondary,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.text;
              e.currentTarget.style.background = theme.bgHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.textSecondary;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content with Sidebar */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar Navigation - full height */}
          <div style={{
            width: '200px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            background: theme.bgSecondary
          }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: isActive ? theme.bgActive : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: isActive ? theme.text : theme.textSecondary,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? '500' : '400',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = theme.bgHover;
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
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right side - Content + Footer */}
          <div style={{ 
            flex: 1, 
            display: 'flex',
            flexDirection: 'column',
            background: theme.bg,
            overflow: 'hidden'
          }}>
            {/* Content Area */}
            <div style={{ 
              flex: 1, 
              padding: '20px', 
              overflowY: 'auto'
            }}>
              {renderContent()}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '10px',
              color: theme.textSecondary,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
              e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.border;
              e.currentTarget.style.color = theme.textSecondary;
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              background: isDark ? '#fff' : '#1a1a1a',
              border: 'none',
              borderRadius: '10px',
              color: isDark ? '#000' : '#fff',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#e0e0e0' : '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? '#fff' : '#1a1a1a';
            }}
          >
            Save Changes
          </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
