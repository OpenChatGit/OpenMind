import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

// 80s Retro Synthwave Animation
const RetroAnimation = () => {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #0a0010 0%, #1a0030 50%, #0a0020 100%)'
        }}>
            {/* Scanlines overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
                pointerEvents: 'none',
                zIndex: 10
            }} />
            
            {/* Perspective Grid */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: '-50%',
                width: '200%',
                height: '50%',
                background: `
                    linear-gradient(90deg, transparent 0%, transparent calc(50% - 1px), #ff00ff40 50%, transparent calc(50% + 1px), transparent 100%),
                    repeating-linear-gradient(90deg, #00ffff20 0px, #00ffff20 1px, transparent 1px, transparent 80px)
                `,
                transform: 'perspective(500px) rotateX(60deg)',
                transformOrigin: 'center top',
                animation: 'gridMove 2s linear infinite'
            }} />
            
            {/* Horizontal grid lines */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: '-50%',
                width: '200%',
                height: '50%',
                background: 'repeating-linear-gradient(0deg, #ff00ff30 0px, #ff00ff30 1px, transparent 1px, transparent 40px)',
                transform: 'perspective(500px) rotateX(60deg)',
                transformOrigin: 'center top',
                animation: 'gridMoveVertical 1s linear infinite'
            }} />
            
            {/* Sun */}
            <div style={{
                position: 'absolute',
                bottom: '45%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'linear-gradient(180deg, #ff6b00 0%, #ff0080 50%, #8000ff 100%)',
                boxShadow: '0 0 60px #ff008080, 0 0 120px #ff006040',
                clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%, 0 55%, 100% 55%, 100% 60%, 0 60%, 0 65%, 100% 65%, 100% 70%, 0 70%, 0 75%, 100% 75%, 100% 100%, 0 100%)'
            }} />
            
            {/* Neon glow lines */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: 0,
                width: '100%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #00ffff, transparent)',
                boxShadow: '0 0 10px #00ffff, 0 0 20px #00ffff',
                animation: 'neonPulse 2s ease-in-out infinite'
            }} />
            <div style={{
                position: 'absolute',
                top: '25%',
                left: 0,
                width: '100%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, #ff00ff80, transparent)',
                boxShadow: '0 0 8px #ff00ff',
                animation: 'neonPulse 2s ease-in-out infinite 0.5s'
            }} />
            
            {/* Stars */}
            {[...Array(30)].map((_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    top: `${Math.random() * 40}%`,
                    left: `${Math.random() * 100}%`,
                    width: `${1 + Math.random() * 2}px`,
                    height: `${1 + Math.random() * 2}px`,
                    background: '#fff',
                    borderRadius: '50%',
                    animation: `twinkle ${1 + Math.random() * 2}s ease-in-out infinite ${Math.random() * 2}s`
                }} />
            ))}
            
            {/* CSS Animations */}
            <style>{`
                @keyframes gridMove {
                    0% { background-position-x: 0px; }
                    100% { background-position-x: 80px; }
                }
                @keyframes gridMoveVertical {
                    0% { background-position-y: 0px; }
                    100% { background-position-y: 40px; }
                }
                @keyframes neonPulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

// Spinning Circles Animation (original)
const CirclesAnimation = ({ isDark }) => {
    return (
        <>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '500px',
                height: '500px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: '50%',
                animation: 'spin 20s linear infinite'
            }} />
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '400px',
                height: '400px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: '50%',
                animation: 'spin 15s linear infinite reverse'
            }} />
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '300px',
                height: '300px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                borderRadius: '50%',
                animation: 'spin 25s linear infinite'
            }} />
            <style>{`
                @keyframes spin {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `}</style>
        </>
    );
};

const Background = () => {
    const { theme, isDark, showAnimations, animationType } = useTheme();
    
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
                background: animationType === 'retro' && showAnimations 
                    ? 'linear-gradient(180deg, #0a0010 0%, #1a0030 50%, #0a0020 100%)'
                    : theme.bg
            }}
        >
            {showAnimations && animationType === 'circles' && <CirclesAnimation isDark={isDark} />}
            {showAnimations && animationType === 'retro' && <RetroAnimation />}
        </div>
    );
};

export default Background;
