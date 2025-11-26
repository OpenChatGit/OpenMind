import { Coffee } from 'lucide-react';

const DonationButton = () => {
    const handleClick = () => {
        // Use Electron's shell to open in system browser, fallback to window.open
        if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal('https://buymeacoffee.com/teamaiko');
        } else {
            window.open('https://buymeacoffee.com/teamaiko', '_blank');
        }
    };

    return (
        <button
            onClick={handleClick}
            style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#888',
                padding: '6px 10px',
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0px',
                fontSize: '12px',
                fontWeight: 500,
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#ccc';
                e.currentTarget.style.gap = '6px';
                e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                e.currentTarget.querySelector('.btn-label').style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#888';
                e.currentTarget.style.gap = '0px';
                e.currentTarget.querySelector('.btn-label').style.width = '0';
                e.currentTarget.querySelector('.btn-label').style.opacity = '0';
            }}
        >
            <Coffee size={14} />
            <span className="btn-label" style={{ 
                width: '0', 
                opacity: '0', 
                overflow: 'hidden', 
                transition: 'all 0.3s ease' 
            }}>Buy Me a Coffee</span>
        </button>
    );
};

export default DonationButton;
