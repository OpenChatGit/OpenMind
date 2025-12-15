import { useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const LoginModal = ({ isOpen, onClose, onLogin, isLoggingIn, loginError, tokenInput, setTokenInput, setLoginError }) => {
  const { theme } = useTheme();
  const tokenInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => tokenInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}
      onClick={onClose}
    >
      <div style={{
        background: '#2a2a2a',
        borderRadius: '12px',
        padding: '24px',
        width: '340px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          marginBottom: '16px' 
        }}>
          <span style={{ fontSize: '24px' }}>🤗</span>
          <h3 style={{ 
            margin: 0, 
            color: '#ececec', 
            fontSize: '1.1rem',
            fontWeight: 600
          }}>
            Login with Hugging Face
          </h3>
        </div>
        
        <p style={{ 
          color: '#888', 
          fontSize: '0.85rem', 
          marginBottom: '16px',
          lineHeight: 1.5
        }}>
          Enter your Hugging Face Access Token. You can create one at{' '}
          <span 
            style={{ color: '#FFD21E', cursor: 'pointer' }}
            onClick={() => window.electronAPI?.openExternal('https://huggingface.co/settings/tokens')}
          >
            huggingface.co/settings/tokens
          </span>
        </p>

        <input
          ref={tokenInputRef}
          type="password"
          value={tokenInput}
          onChange={(e) => {
            setTokenInput(e.target.value);
            if (loginError) setLoginError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && onLogin()}
          placeholder="hf_xxxxxxxxxxxxxxxxx"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#1b1b1c',
            border: loginError ? `1px solid ${theme.error}` : '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#ececec',
            fontSize: '0.9rem',
            outline: 'none',
            marginBottom: '8px',
            boxSizing: 'border-box'
          }}
        />

        {loginError && (
          <p style={{ 
            color: theme.error, 
            fontSize: '0.8rem', 
            margin: '0 0 12px 0' 
          }}>
            {loginError}
          </p>
        )}

        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginTop: '16px' 
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = '#ececec';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#888';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            style={{
              flex: 1,
              padding: '10px',
              background: '#FFD21E',
              border: 'none',
              borderRadius: '8px',
              color: '#1b1b1c',
              cursor: isLoggingIn ? 'wait' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              opacity: isLoggingIn ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
