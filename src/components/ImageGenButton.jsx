/**
 * ImageGenButton - Standalone Image Generation Toggle Button
 * 
 * This component can be used standalone or injected via the plugin system.
 * It wraps the image generation toggle functionality.
 */

import { memo } from 'react';
import { Image } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ImageGenButton = memo(({ 
  enabled, 
  isGenerating, 
  onToggle,
  showLabel = false,
  size = 16,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <div style={{
      borderRadius: '20px',
      padding: isGenerating ? '2px' : '0',
      background: isGenerating 
        ? 'conic-gradient(from var(--angle, 0deg), #ff6b6b, #feca57, #48dbfb, #ff9ff3, #ff6b6b)' 
        : 'transparent',
      animation: isGenerating ? 'rotate-glow 2s linear infinite' : 'none'
    }}>
      <button
        onClick={onToggle}
        title={enabled ? 'Disable Image Generation' : 'Enable Image Generation'}
        style={{
          background: enabled 
            ? (isDark ? '#fff' : '#1a1a1a') 
            : (isGenerating ? (isDark ? '#2c2c2e' : '#f3f4f6') : 'transparent'),
          border: isGenerating 
            ? 'none' 
            : `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
          color: enabled 
            ? (isDark ? '#000' : '#fff') 
            : theme.textSecondary,
          cursor: 'pointer',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: showLabel ? '6px' : '0px',
          borderRadius: '18px',
          fontSize: '0.85rem',
          fontWeight: '500',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (!enabled) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#ccc';
          }
          if (!showLabel) {
            e.currentTarget.style.gap = '6px';
            const label = e.currentTarget.querySelector('.btn-label');
            if (label) {
              label.style.width = 'auto';
              label.style.opacity = '1';
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!enabled) {
            e.currentTarget.style.background = isGenerating 
              ? (isDark ? '#2c2c2e' : '#f3f4f6') 
              : 'transparent';
            e.currentTarget.style.color = theme.textSecondary;
          }
          if (!showLabel) {
            e.currentTarget.style.gap = '0px';
            const label = e.currentTarget.querySelector('.btn-label');
            if (label) {
              label.style.width = '0';
              label.style.opacity = '0';
            }
          }
        }}
      >
        <Image size={size} />
        <span 
          className="btn-label" 
          style={{ 
            width: showLabel ? 'auto' : '0', 
            opacity: showLabel ? '1' : '0', 
            overflow: 'hidden', 
            transition: 'all 0.3s ease' 
          }}
        >
          Generate
        </span>
      </button>
    </div>
  );
});

ImageGenButton.displayName = 'ImageGenButton';

export default ImageGenButton;
