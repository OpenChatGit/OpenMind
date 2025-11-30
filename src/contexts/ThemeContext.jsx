import { createContext, useContext, useState, useEffect, useMemo } from 'react';

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
    accent: '#6366f1',
    accentHover: '#818cf8',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    // Sidebar
    sidebarBg: '#0f0f19',
    sidebarHover: 'rgba(255, 255, 255, 0.05)',
    // Editor
    editorBg: '#1e1e1e',
    editorLineNumber: '#858585',
    editorSelection: 'rgba(99, 102, 241, 0.3)',
    // Input
    inputBg: '#2d2d2d',
    inputBorder: '#3e3e3e',
    // Scrollbar
    scrollbarThumb: 'rgba(255, 255, 255, 0.2)',
    scrollbarTrack: 'transparent',
    // Chat
    userMessageBg: 'rgba(99, 102, 241, 0.15)',
    assistantMessageBg: 'rgba(255, 255, 255, 0.05)',
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
    accent: '#6366f1',
    accentHover: '#4f46e5',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    // Sidebar
    sidebarBg: '#ffffff',
    sidebarHover: 'rgba(0, 0, 0, 0.04)',
    // Editor
    editorBg: '#ffffff',
    editorLineNumber: '#999999',
    editorSelection: 'rgba(99, 102, 241, 0.2)',
    // Input
    inputBg: '#ffffff',
    inputBorder: '#d1d5db',
    // Scrollbar
    scrollbarThumb: 'rgba(0, 0, 0, 0.2)',
    scrollbarTrack: 'transparent',
    // Chat
    userMessageBg: 'rgba(99, 102, 241, 0.1)',
    assistantMessageBg: 'rgba(0, 0, 0, 0.03)',
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
    document.documentElement.style.setProperty('--text', theme.text);
    document.documentElement.style.setProperty('--border', theme.border);
    // Colorblind colors as CSS variables
    document.documentElement.style.setProperty('--error', theme.error);
    document.documentElement.style.setProperty('--success', theme.success);
    document.documentElement.style.setProperty('--warning', theme.warning);
  }, [themeName, theme]);

  useEffect(() => {
    localStorage.setItem('colorblind-mode', colorblindMode);
  }, [colorblindMode]);

  const toggleTheme = () => {
    setThemeName(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(() => ({
    theme,
    themeName,
    setTheme: setThemeName,
    toggleTheme,
    isDark: themeName === 'dark',
    colorblindMode,
    setColorblindMode,
    colorblindModes
  }), [theme, themeName, colorblindMode]);

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
