/**
 * PopupContainer - Renders all active popups
 */

import { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { subscribe, closePopup, getPopups } from '../utils/popupManager';

const PopupContainer = memo(() => {
  const [popups, setPopups] = useState([]);
  const { theme, isDark } = useTheme();

  useEffect(() => {
    // Initial popups
    setPopups(getPopups());
    
    // Subscribe to changes
    const unsubscribe = subscribe(setPopups);
    return unsubscribe;
  }, []);

  // Separate toasts from dialogs
  const dialogs = popups.filter(p => p.type !== 'toast');
  const toasts = popups.filter(p => p.type === 'toast');

  return createPortal(
    <>
      {/* Dialog Overlay */}
      {dialogs.length > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
          }}
          onClick={() => {
            const top = dialogs[dialogs.length - 1];
            if (top?.closable !== false) {
              closePopup(top.id, null);
            }
          }}
        >
          {dialogs.map((popup, index) => (
            <DialogPopup
              key={popup.id}
              popup={popup}
              theme={theme}
              isDark={isDark}
              isTop={index === dialogs.length - 1}
            />
          ))}
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} theme={theme} />
    </>,
    document.body
  );
});

// ============ DIALOG POPUP ============

const DialogPopup = memo(({ popup, theme, isDark, isTop }) => {
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState(popup.defaultValue || '');
  const [error, setError] = useState('');

  // Focus input on mount
  useEffect(() => {
    if (popup.type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [popup.type]);

  const Icon = popup.icon ? LucideIcons[popup.icon] || LucideIcons.Info : null;

  const handleConfirm = () => {
    if (popup.type === 'prompt') {
      // Validate if validation function exists
      if (popup.validation) {
        const result = popup.validation(inputValue);
        if (result !== true) {
          setError(typeof result === 'string' ? result : 'Invalid input');
          return;
        }
      }
      closePopup(popup.id, inputValue);
    } else if (popup.type === 'confirm') {
      closePopup(popup.id, true);
    } else {
      closePopup(popup.id, true);
    }
  };

  const handleCancel = () => {
    closePopup(popup.id, popup.type === 'confirm' ? false : null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && popup.type !== 'custom') {
      handleConfirm();
    }
  };

  const getButtonColor = (color) => {
    switch (color) {
      case 'danger': return '#ef4444';
      case 'success': return '#22c55e';
      case 'primary': return theme.accent;
      default: return theme.accent;
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      style={{
        background: theme.bg,
        borderRadius: '12px',
        width: popup.width || 400,
        maxWidth: '90vw',
        boxShadow: isDark
          ? '0 20px 60px rgba(0,0,0,0.5)'
          : '0 20px 60px rgba(0,0,0,0.2)',
        border: `1px solid ${theme.border}`,
        overflow: 'hidden',
        opacity: isTop ? 1 : 0.5,
        transform: isTop ? 'scale(1)' : 'scale(0.95)',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Header */}
      {popup.title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          {Icon && (
            <Icon
              size={20}
              color={popup.iconColor || theme.accent}
            />
          )}
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: '600',
              color: theme.text,
            }}
          >
            {popup.title}
          </h3>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Message */}
        {popup.message && (
          <p
            style={{
              margin: 0,
              marginBottom: popup.type === 'prompt' ? '16px' : 0,
              color: theme.textSecondary,
              lineHeight: '1.5',
            }}
          >
            {popup.message}
          </p>
        )}

        {/* Prompt Input */}
        {popup.type === 'prompt' && (
          <div>
            <input
              ref={inputRef}
              type={popup.inputType || 'text'}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError('');
              }}
              placeholder={popup.placeholder}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: theme.bgSecondary,
                border: `1px solid ${error ? '#ef4444' : theme.border}`,
                borderRadius: '6px',
                color: theme.text,
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p
                style={{
                  margin: '8px 0 0 0',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </p>
            )}
          </div>
        )}

        {/* Custom Content */}
        {popup.type === 'custom' && popup.content && (
          <div>{typeof popup.content === 'function' ? popup.content() : popup.content}</div>
        )}
      </div>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '12px 20px',
          borderTop: `1px solid ${theme.border}`,
          background: theme.bgSecondary,
        }}
      >
        {popup.type === 'alert' && (
          <Button
            onClick={handleConfirm}
            color={theme.accent}
            theme={theme}
            primary
          >
            {popup.buttonText}
          </Button>
        )}

        {popup.type === 'confirm' && (
          <>
            <Button onClick={handleCancel} theme={theme}>
              {popup.cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              color={getButtonColor(popup.confirmColor)}
              theme={theme}
              primary
            >
              {popup.confirmText}
            </Button>
          </>
        )}

        {popup.type === 'prompt' && (
          <>
            <Button onClick={handleCancel} theme={theme}>
              {popup.cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              color={theme.accent}
              theme={theme}
              primary
            >
              {popup.confirmText}
            </Button>
          </>
        )}

        {popup.type === 'custom' && popup.buttons?.map((btn, i) => (
          <Button
            key={i}
            onClick={() => closePopup(popup.id, btn.value)}
            color={getButtonColor(btn.color)}
            theme={theme}
            primary={btn.variant === 'primary'}
          >
            {btn.text}
          </Button>
        ))}
      </div>
    </div>
  );
});

// ============ BUTTON ============

const Button = ({ children, onClick, color, theme, primary }) => {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: primary ? 'none' : `1px solid ${theme.border}`,
        background: primary ? color : hover ? theme.bgHover : 'transparent',
        color: primary ? '#fff' : theme.text,
        fontSize: '0.9rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        opacity: hover && primary ? 0.9 : 1,
      }}
    >
      {children}
    </button>
  );
};

// ============ TOAST CONTAINER ============

const ToastContainer = memo(({ toasts, theme }) => {
  // Group toasts by position
  const positions = {};
  toasts.forEach(toast => {
    const pos = toast.position || 'bottom-right';
    if (!positions[pos]) positions[pos] = [];
    positions[pos].push(toast);
  });

  const getPositionStyle = (position) => {
    const base = { position: 'fixed', zIndex: 20001, display: 'flex', flexDirection: 'column', gap: '8px' };
    switch (position) {
      case 'top-right': return { ...base, top: '20px', right: '20px' };
      case 'top-left': return { ...base, top: '20px', left: '20px' };
      case 'top-center': return { ...base, top: '20px', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-left': return { ...base, bottom: '20px', left: '20px' };
      case 'bottom-center': return { ...base, bottom: '20px', left: '50%', transform: 'translateX(-50%)' };
      default: return { ...base, bottom: '20px', right: '20px' };
    }
  };

  return (
    <>
      {Object.entries(positions).map(([position, posToasts]) => (
        <div key={position} style={getPositionStyle(position)}>
          {posToasts.map(toast => (
            <Toast key={toast.id} toast={toast} theme={theme} />
          ))}
        </div>
      ))}
    </>
  );
});

// ============ TOAST ============

const Toast = memo(({ toast, theme }) => {
  const [visible, setVisible] = useState(false);
  const Icon = toast.icon ? LucideIcons[toast.icon] || LucideIcons.Info : LucideIcons.Info;

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return theme.accent;
    }
  };

  const color = getTypeColor(toast.toastType);

  return (
    <div
      onClick={() => closePopup(toast.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(20px)',
        transition: 'all 0.2s ease',
        maxWidth: '350px',
      }}
    >
      <Icon size={18} color={color} style={{ flexShrink: 0 }} />
      <span
        style={{
          color: theme.text,
          fontSize: '0.9rem',
          lineHeight: '1.4',
        }}
      >
        {toast.message}
      </span>
    </div>
  );
});

export default PopupContainer;
