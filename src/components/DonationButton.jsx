import { Coffee } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const DonationButton = () => {
    const { theme, isDark } = useTheme();
    
    const handleClick = () => {
        if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal('https://buymeacoffee.com/teamaiko');
        } else {
            window.open('https://buymeacoffee.com/teamaiko', '_blank');
        }
    };

    const hoverBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    return (
        <button
            onClick={handleClick}
            style={{
                background: 'transparent',
                border: 'none',
                color: theme.text,
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 500,
                transition: 'background 0.2s ease',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = hoverBg;
                e.currentTarget.querySelector('.btn-label').style.maxWidth = '120px';
                e.currentTarget.querySelector('.btn-label').style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.querySelector('.btn-label').style.maxWidth = '0';
                e.currentTarget.querySelector('.btn-label').style.opacity = '0';
            }}
        >
            <Coffee size={14} />
            <span 
                className="btn-label" 
                style={{ 
                    maxWidth: '0', 
                    opacity: '0', 
                    overflow: 'hidden', 
                    transition: 'max-width 0.3s ease, opacity 0.2s ease',
                    display: 'inline-block'
                }}
            >
                Buy Me a Coffee
            </span>
        </button>
    );
};

export default DonationButton;
