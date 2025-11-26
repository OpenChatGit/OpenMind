import React, { useState } from 'react';
import { Minus, Square, X } from 'lucide-react';
import DonationButton from './DonationButton';

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);

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

    return (
        <div style={{
            height: '32px',
            background: '#1b1b1c', // Matched to sidebar
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            WebkitAppRegion: 'drag', // Draggable
            paddingLeft: '16px',
            userSelect: 'none'
        }}>
            {/* Title / Icon Area */}
            <div style={{
                fontSize: '12px',
                color: '#888',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span style={{ fontWeight: 600, color: '#ececec' }}>OpenMind</span>
            </div>

            {/* Donation + Window Controls */}
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', paddingRight: '16px', gap: '12px', WebkitAppRegion: 'no-drag' }}>
                <DonationButton />
                
                {/* Window Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                    onClick={handleMinimize}
                    style={buttonStyle}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Minus size={16} />
                </button>
                <button
                    onClick={handleMaximize}
                    style={buttonStyle}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Square size={14} />
                </button>
                <button
                    onClick={handleClose}
                    style={{ ...buttonStyle, ':hover': { background: '#e81123' } }}
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

const buttonStyle = {
    background: 'transparent',
    border: 'none',
    color: '#ececec',
    width: '32px', // Smaller width
    height: '24px', // Smaller height
    borderRadius: '6px', // Rounded corners
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s'
};

export default TitleBar;
