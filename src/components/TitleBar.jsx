import { useState, useRef } from 'react';
import { Minus, Square, X, Sun, Moon } from 'lucide-react';
import DonationButton from './DonationButton';
import { useTheme } from '../contexts/ThemeContext';

const TitleBar = () => {
    const { theme, isDark, toggleThemeWithRipple } = useTheme();
    const [isMaximized, setIsMaximized] = useState(false);
    const themeButtonRef = useRef(null);

    const handleMinimize = () => {
        window.electronAPI?.minimize();
    };

    const handleMaximize = () => {
        window.electronAPI?.maximize();
        setIsMaximized(!isMaximized);
    };

    const handleClose = () => {
        window.electronAPI?.close();
    };

    const handleThemeToggle = () => {
        const button = themeButtonRef.current;
        if (button) {
            const rect = button.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            toggleThemeWithRipple(x, y);
        }
    };

    const buttonStyle = {
        background: 'transparent',
        border: 'none',
        color: theme.text,
        width: '32px',
        height: '24px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.2s'
    };

    const hoverBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    return (
        <div style={{
            height: '32px',
            background: theme.bgSecondary,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            WebkitAppRegion: 'drag',
            paddingLeft: '16px',
            userSelect: 'none',
            borderBottom: `1px solid ${theme.border}`,
            position: 'relative',
            zIndex: 10
        }}>
            {/* Title */}
            <div style={{
                fontSize: '12px',
                color: theme.textSecondary,
                display: 'flex',
                alignItems: 'center',
                height: '100%'
            }}>
                <span style={{ fontWeight: 600, color: theme.text }}>OpenMind</span>
            </div>

            {/* Right Side Controls */}
            <div style={{ 
                display: 'flex', 
                height: '100%', 
                alignItems: 'center', 
                paddingRight: '8px', 
                gap: '4px', 
                WebkitAppRegion: 'no-drag' 
            }}>
                {/* Donation Button */}
                <DonationButton />
                
                {/* Theme Toggle */}
                <button
                    ref={themeButtonRef}
                    onClick={handleThemeToggle}
                    style={{
                        ...buttonStyle,
                        width: '28px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                </button>

                {/* Separator */}
                <div style={{
                    width: '1px',
                    height: '16px',
                    background: theme.border,
                    margin: '0 4px'
                }} />
                
                {/* Window Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        onClick={handleMinimize}
                        style={buttonStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Minus size={16} />
                    </button>
                    <button
                        onClick={handleMaximize}
                        style={buttonStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Square size={14} />
                    </button>
                    <button
                        onClick={handleClose}
                        style={buttonStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#c42b1c'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TitleBar;
