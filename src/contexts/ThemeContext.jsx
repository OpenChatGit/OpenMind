import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// Colorblind-friendly color palettes
export const colorblindModes = {
  none: {
    name: 'None',
    description: 'Default colors',
    colors: {
      error: '#ef4444',      // Red
      success: '#10b981',    // Green
      warning: '#f59e0b',    // Yellow/Orange
      info: '#3b82f6',       // Blue
      errorBg: 'rgba(239, 68, 68, 0.15)',
      successBg: 'rgba(16, 185, 129, 0.15)',
      warningBg: 'rgba(245, 158, 11, 0.15)',
    }
  },
  deuteranopia: {
    name: 'Deuteranopia',
    description: 'Red-Green (most common)',
    colors: {
      error: '#d55e00',      // Orange-Red (distinguishable)
      success: '#0072b2',    // Blue (instead of green)
      warning: '#f0e442',    // Yellow
      info: '#56b4e9',       // Light Blue
      errorBg: 'rgba(213, 94, 0, 0.15)',
      successBg: 'rgba(0, 114, 178, 0.15)',
      warningBg: 'rgba(240, 228, 66, 0.15)',
    }
  },
  protanopia: {
    name: 'Protanopia',
    description: 'Red-Green (red weak)',
    colors: {
      error: '#e69f00',      // Orange
      success: '#0072b2',    // Blue (instead of green)
      warning: '#f0e442',    // Yellow
      info: '#56b4e9',       // Light Blue
      errorBg: 'rgba(230, 159, 0, 0.15)',
      successBg: 'rgba(0, 114, 178, 0.15)',
      warningBg: 'rgba(240, 228, 66, 0.15)',
    }
  },
  tritanopia: {
    name: 'Tritanopia',
    description: 'Blue-Yellow',
    colors: {
      error: '#d55e00',      // Orange-Red
      success: '#009e73',    // Teal
      warning: '#cc79a7',    // Pink
      info: '#999999',       // Gray
      errorBg: 'rgba(213, 94, 0, 0.15)',
      successBg: 'rgba(0, 158, 115, 0.15)',
      warningBg: 'rgba(204, 121, 167, 0.15)',
    }
  },
  monochromacy: {
    name: 'Monochromacy',
    description: 'Complete color blindness',
    colors: {
      error: '#666666',      // Dark Gray
      success: '#aaaaaa',    // Light Gray
      warning: '#888888',    // Medium Gray
      info: '#cccccc',       // Very Light Gray
      errorBg: 'rgba(102, 102, 102, 0.15)',
      successBg: 'rgba(170, 170, 170, 0.15)',
      warningBg: 'rgba(136, 136, 136, 0.15)',
    }
  }
};

// Theme definitions
export const themes = {
  dark: {
    name: 'Dark',
    // Main backgrounds
    bg: '#151517',
    bgSecondary: '#1b1b1c',
    bgTertiary: '#1e1e1e',
    bgHover: 'rgba(255, 255, 255, 0.05)',
    bgActive: 'rgba(255, 255, 255, 0.1)',
    // Borders
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    // Text
    text: '#e0e0e0',
    textSecondary: '#888',
    textMuted: '#666',
    // Accents
    accent: '#ffffff',
    accentHover: '#e0e0e0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    // Sidebar
    sidebarBg: '#121214',
    sidebarHover: 'rgba(255, 255, 255, 0.05)',
    // Editor
    editorBg: '#1e1e1e',
    editorLineNumber: '#858585',
    editorSelection: 'rgba(255, 255, 255, 0.2)',
    // Input
    inputBg: '#2d2d2d',
    inputBorder: '#3e3e3e',
    // Scrollbar
    scrollbarThumb: 'rgba(255, 255, 255, 0.2)',
    scrollbarTrack: 'transparent',
    // Chat
    userMessageBg: 'rgba(255, 255, 255, 0.08)',
    assistantMessageBg: 'rgba(255, 255, 255, 0.03)',
    // Code
    codeBg: '#0d0d0d',
    codeText: '#e0e0e0',
  },
  light: {
    name: 'Light',
    // Main backgrounds
    bg: '#f5f5f5',
    bgSecondary: '#ffffff',
    bgTertiary: '#fafafa',
    bgHover: 'rgba(0, 0, 0, 0.04)',
    bgActive: 'rgba(0, 0, 0, 0.08)',
    // Borders
    border: 'rgba(0, 0, 0, 0.12)',
    borderLight: 'rgba(0, 0, 0, 0.06)',
    // Text
    text: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    // Accents
    accent: '#1a1a1a',
    accentHover: '#333333',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    // Sidebar
    sidebarBg: '#ffffff',
    sidebarHover: 'rgba(0, 0, 0, 0.04)',
    // Editor
    editorBg: '#ffffff',
    editorLineNumber: '#999999',
    editorSelection: 'rgba(0, 0, 0, 0.1)',
    // Input
    inputBg: '#ffffff',
    inputBorder: '#d1d5db',
    // Scrollbar
    scrollbarThumb: 'rgba(0, 0, 0, 0.2)',
    scrollbarTrack: 'transparent',
    // Chat
    userMessageBg: 'rgba(0, 0, 0, 0.06)',
    assistantMessageBg: 'rgba(0, 0, 0, 0.02)',
    // Code
    codeBg: '#f8f8f8',
    codeText: '#1a1a1a',
  }
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(() => {
    return localStorage.getItem('app-theme') || 'dark';
  });

  const [colorblindMode, setColorblindMode] = useState(() => {
    return localStorage.getItem('colorblind-mode') || 'none';
  });

  const [showAnimations, setShowAnimations] = useState(() => {
    const saved = localStorage.getItem('show-animations');
    return saved !== null ? saved === 'true' : true;
  });

  const [animationType, setAnimationType] = useState(() => {
    return localStorage.getItem('animation-type') || 'circles';
  });

  const [retroAudioEnabled, setRetroAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('retro-audio-enabled');
    return saved !== null ? saved === 'true' : false;
  });

  const [retroAudioVolume, setRetroAudioVolume] = useState(() => {
    const saved = localStorage.getItem('retro-audio-volume');
    return saved !== null ? parseFloat(saved) : 0.5;
  });

  // Ripple animation state
  const [ripple, setRipple] = useState(null);

  // Merge theme with colorblind colors
  const theme = useMemo(() => {
    const baseTheme = themes[themeName] || themes.dark;
    const cbColors = colorblindModes[colorblindMode]?.colors || colorblindModes.none.colors;
    
    return {
      ...baseTheme,
      // Override semantic colors with colorblind-friendly versions
      error: cbColors.error,
      success: cbColors.success,
      warning: cbColors.warning,
      info: cbColors.info,
      errorBg: cbColors.errorBg,
      successBg: cbColors.successBg,
      warningBg: cbColors.warningBg,
    };
  }, [themeName, colorblindMode]);

  useEffect(() => {
    localStorage.setItem('app-theme', themeName);
    // Update CSS variables for global access
    document.documentElement.style.setProperty('--bg', theme.bg);
    document.documentElement.style.setProperty('--bg-secondary', theme.bgSecondary);
    document.documentElement.style.setProperty('--bg-tertiary', theme.bgTertiary);
    document.documentElement.style.setProperty('--bg-hover', theme.bgHover);
    document.documentElement.style.setProperty('--bg-active', theme.bgActive);
    document.documentElement.style.setProperty('--text', theme.text);
    document.documentElement.style.setProperty('--text-secondary', theme.textSecondary);
    document.documentElement.style.setProperty('--text-muted', theme.textMuted);
    document.documentElement.style.setProperty('--border', theme.border);
    document.documentElement.style.setProperty('--border-light', theme.borderLight);
    document.documentElement.style.setProperty('--accent', theme.accent);
    // Colorblind-aware semantic colors as CSS variables
    document.documentElement.style.setProperty('--error', theme.error);
    document.documentElement.style.setProperty('--success', theme.success);
    document.documentElement.style.setProperty('--warning', theme.warning);
    document.documentElement.style.setProperty('--info', theme.info);
    document.documentElement.style.setProperty('--error-bg', theme.errorBg);
    document.documentElement.style.setProperty('--success-bg', theme.successBg);
    document.documentElement.style.setProperty('--warning-bg', theme.warningBg);
    // Set data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', themeName);
    document.documentElement.setAttribute('data-colorblind-mode', colorblindMode);
  }, [themeName, colorblindMode, theme]);

  useEffect(() => {
    localStorage.setItem('colorblind-mode', colorblindMode);
  }, [colorblindMode]);

  useEffect(() => {
    localStorage.setItem('show-animations', showAnimations.toString());
  }, [showAnimations]);

  useEffect(() => {
    localStorage.setItem('animation-type', animationType);
  }, [animationType]);

  useEffect(() => {
    localStorage.setItem('retro-audio-enabled', retroAudioEnabled.toString());
  }, [retroAudioEnabled]);

  useEffect(() => {
    localStorage.setItem('retro-audio-volume', retroAudioVolume.toString());
  }, [retroAudioVolume]);

  const toggleTheme = useCallback(() => {
    setThemeName(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Toggle theme with ripple animation from a specific point
  const toggleThemeWithRipple = useCallback((x, y) => {
    // Check if View Transitions API is supported
    if (document.startViewTransition) {
      // Set the origin for the clip-path animation
      document.documentElement.style.setProperty('--ripple-x', `${x}px`);
      document.documentElement.style.setProperty('--ripple-y', `${y}px`);
      
      document.startViewTransition(() => {
        setThemeName(prev => prev === 'dark' ? 'light' : 'dark');
      });
    } else {
      // Fallback: just toggle without animation
      setThemeName(prev => prev === 'dark' ? 'light' : 'dark');
    }
  }, []);

  // Add view transition styles
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'theme-transition-styles';
    style.textContent = `
      ::view-transition-old(root),
      ::view-transition-new(root) {
        animation: none;
        mix-blend-mode: normal;
      }
      
      ::view-transition-old(root) {
        z-index: 1;
      }
      
      ::view-transition-new(root) {
        z-index: 9999;
        animation: theme-ripple-reveal 0.5s ease-out;
      }
      
      @keyframes theme-ripple-reveal {
        from {
          clip-path: circle(0% at var(--ripple-x, 50%) var(--ripple-y, 50%));
        }
        to {
          clip-path: circle(150% at var(--ripple-x, 50%) var(--ripple-y, 50%));
        }
      }
    `;
    
    if (!document.getElementById('theme-transition-styles')) {
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById('theme-transition-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const value = useMemo(() => ({
    theme,
    themeName,
    setTheme: setThemeName,
    toggleTheme,
    toggleThemeWithRipple,
    isDark: themeName === 'dark',
    colorblindMode,
    setColorblindMode,
    colorblindModes,
    showAnimations,
    setShowAnimations,
    animationType,
    setAnimationType,
    retroAudioEnabled,
    setRetroAudioEnabled,
    retroAudioVolume,
    setRetroAudioVolume,
    ripple
  }), [theme, themeName, colorblindMode, toggleTheme, toggleThemeWithRipple, showAnimations, animationType, retroAudioEnabled, retroAudioVolume, ripple]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
