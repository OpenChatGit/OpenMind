/**
 * Popup Manager - Custom Popup/Dialog System
 * 
 * Ersetzt Browser-Standard-Popups (alert, confirm, prompt) mit
 * gestylten, themefähigen Dialogen.
 * 
 * Features:
 * - Alert, Confirm, Prompt Dialoge
 * - Custom Dialoge mit beliebigem Content
 * - Toast Notifications
 * - Plugin API Integration
 * - Theming Support
 * - Keyboard Navigation (Escape, Enter)
 * - Stacking/Queue System
 */

// Active popups stack
const popupStack = [];
let popupIdCounter = 0;

// Event listeners
const listeners = new Set();

/**
 * Generiert eine eindeutige Popup-ID
 */
const generateId = () => `popup-${++popupIdCounter}`;

/**
 * Benachrichtigt alle Listener über Änderungen
 */
const notifyListeners = () => {
  listeners.forEach(listener => {
    try {
      listener([...popupStack]);
    } catch (err) {
      console.error('[PopupManager] Listener error:', err);
    }
  });
};

/**
 * Registriert einen Listener für Popup-Änderungen
 */
export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Holt alle aktiven Popups
 */
export const getPopups = () => [...popupStack];

/**
 * Schließt ein Popup by ID
 */
export const closePopup = (id, result = null) => {
  const index = popupStack.findIndex(p => p.id === id);
  if (index >= 0) {
    const popup = popupStack[index];
    popupStack.splice(index, 1);
    notifyListeners();
    
    // Resolve promise if exists
    if (popup.resolve) {
      popup.resolve(result);
    }
  }
};

/**
 * Schließt alle Popups
 */
export const closeAllPopups = () => {
  while (popupStack.length > 0) {
    const popup = popupStack.pop();
    if (popup.resolve) {
      popup.resolve(null);
    }
  }
  notifyListeners();
};

// ============ POPUP TYPES ============

/**
 * Alert Dialog - Einfache Nachricht mit OK Button
 */
export const alert = (message, options = {}) => {
  return new Promise((resolve) => {
    const popup = {
      id: generateId(),
      type: 'alert',
      title: options.title || 'Alert',
      message,
      icon: options.icon || 'AlertCircle',
      iconColor: options.iconColor,
      buttonText: options.buttonText || 'OK',
      resolve,
      pluginId: options.pluginId,
    };
    
    popupStack.push(popup);
    notifyListeners();
  });
};

/**
 * Confirm Dialog - Ja/Nein Entscheidung
 */
export const confirm = (message, options = {}) => {
  return new Promise((resolve) => {
    const popup = {
      id: generateId(),
      type: 'confirm',
      title: options.title || 'Confirm',
      message,
      icon: options.icon || 'HelpCircle',
      iconColor: options.iconColor,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      confirmColor: options.confirmColor, // 'danger', 'success', 'primary'
      resolve,
      pluginId: options.pluginId,
    };
    
    popupStack.push(popup);
    notifyListeners();
  });
};

/**
 * Prompt Dialog - Text-Eingabe
 */
export const prompt = (message, options = {}) => {
  return new Promise((resolve) => {
    const popup = {
      id: generateId(),
      type: 'prompt',
      title: options.title || 'Input',
      message,
      icon: options.icon || 'Edit3',
      iconColor: options.iconColor,
      placeholder: options.placeholder || '',
      defaultValue: options.defaultValue || '',
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      inputType: options.inputType || 'text', // text, password, number, email
      validation: options.validation, // (value) => true/false or error message
      resolve,
      pluginId: options.pluginId,
    };
    
    popupStack.push(popup);
    notifyListeners();
  });
};

/**
 * Custom Dialog - Beliebiger Content
 */
export const custom = (options = {}) => {
  return new Promise((resolve) => {
    const popup = {
      id: generateId(),
      type: 'custom',
      title: options.title,
      content: options.content, // React component or string
      icon: options.icon,
      iconColor: options.iconColor,
      buttons: options.buttons || [], // [{ text, value, color, variant }]
      width: options.width || 400,
      closable: options.closable !== false,
      resolve,
      pluginId: options.pluginId,
    };
    
    popupStack.push(popup);
    notifyListeners();
  });
};

/**
 * Toast Notification - Kurze Nachricht
 */
export const toast = (message, options = {}) => {
  const duration = options.duration || 3000;
  const type = options.type || 'info'; // info, success, warning, error
  
  const popup = {
    id: generateId(),
    type: 'toast',
    message,
    toastType: type,
    icon: options.icon || getToastIcon(type),
    duration,
    position: options.position || 'bottom-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
    pluginId: options.pluginId,
  };
  
  popupStack.push(popup);
  notifyListeners();
  
  // Auto-close
  if (duration > 0) {
    setTimeout(() => {
      closePopup(popup.id);
    }, duration);
  }
  
  return popup.id;
};

/**
 * Holt das Standard-Icon für Toast-Typen
 */
const getToastIcon = (type) => {
  switch (type) {
    case 'success': return 'CheckCircle';
    case 'warning': return 'AlertTriangle';
    case 'error': return 'XCircle';
    default: return 'Info';
  }
};

// ============ PLUGIN API ============

/**
 * Erstellt eine Popup-API für ein Plugin
 */
export const createPluginPopupAPI = (pluginId) => ({
  alert: (message, options = {}) => alert(message, { ...options, pluginId }),
  confirm: (message, options = {}) => confirm(message, { ...options, pluginId }),
  prompt: (message, options = {}) => prompt(message, { ...options, pluginId }),
  custom: (options = {}) => custom({ ...options, pluginId }),
  toast: (message, options = {}) => toast(message, { ...options, pluginId }),
  close: closePopup,
  closeAll: closeAllPopups,
});

// ============ GLOBAL API ============

/**
 * Initialisiert das Popup-System und macht es global verfügbar
 */
export const initPopupSystem = () => {
  // Global verfügbar machen
  window.Popup = {
    alert,
    confirm,
    prompt,
    custom,
    toast,
    close: closePopup,
    closeAll: closeAllPopups,
    subscribe,
    getPopups,
  };
  
  // Keyboard handler für Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popupStack.length > 0) {
      const topPopup = popupStack[popupStack.length - 1];
      if (topPopup.type !== 'toast') {
        closePopup(topPopup.id, null);
      }
    }
  });
  
  console.log('[PopupManager] System initialized');
};

export default {
  alert,
  confirm,
  prompt,
  custom,
  toast,
  closePopup,
  closeAllPopups,
  subscribe,
  getPopups,
  createPluginPopupAPI,
  initPopupSystem,
};
