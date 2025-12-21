/**
 * Plugin UI Registry - Dynamisches UI-System für Plugins
 * 
 * Ermöglicht Plugins:
 * - UI-Elemente in definierten Slots zu registrieren
 * - Custom React Components zu laden
 * - Event-basierte Kommunikation ohne Haupt-Code Änderungen
 * - Persistenten Storage pro Plugin
 */

import * as LucideIcons from 'lucide-react';

// ============ REGISTRIES ============

// Registrierte UI-Elemente pro Slot
const slotElements = new Map();

// Event-Handler pro Plugin
const eventHandlers = new Map();

// Custom Components pro Plugin
const customComponents = new Map();

// Plugin States (für Toggle-Buttons etc.)
const pluginStates = new Map();

// Verfügbare Slots
export const AVAILABLE_SLOTS = [
  'chat-input-left',      // Links vom Chat-Input
  'chat-input-right',     // Rechts vom Chat-Input (nach Send-Button)
  'chat-input-above',     // Über dem Chat-Input
  'chat-toolbar',         // Haupt-Toolbar
  'sidebar-top',          // Oben in der Sidebar
  'sidebar-bottom',       // Unten in der Sidebar
  'message-actions',      // Aktionen auf Nachrichten
  'settings-tab',         // Custom Settings Tab
  'model-selector',       // Model-Dropdown Erweiterungen
];

// ============ ICON SYSTEM ============

/**
 * Holt ein Lucide Icon by Name
 * Unterstützt alle 500+ Lucide Icons dynamisch
 */
export const getIcon = (iconName) => {
  if (!iconName) return LucideIcons.Zap;
  
  // Direkt aus LucideIcons holen
  const icon = LucideIcons[iconName];
  if (icon) return icon;
  
  // Fallback: PascalCase konvertieren
  const pascalCase = iconName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  return LucideIcons[pascalCase] || LucideIcons.Zap;
};

// ============ SLOT MANAGEMENT ============

/**
 * Registriert ein UI-Element in einem Slot
 */
export const registerSlotElement = (pluginId, slot, config) => {
  if (!AVAILABLE_SLOTS.includes(slot)) {
    console.warn(`[PluginUI] Unknown slot: ${slot}. Available: ${AVAILABLE_SLOTS.join(', ')}`);
    return false;
  }
  
  if (!slotElements.has(slot)) {
    slotElements.set(slot, []);
  }
  
  // Prüfen ob Element bereits existiert
  const existing = slotElements.get(slot).findIndex(
    el => el.pluginId === pluginId && el.id === config.id
  );
  
  const element = {
    pluginId,
    id: config.id,
    type: config.type || 'button',
    icon: config.icon,
    label: config.label,
    tooltip: config.tooltip,
    stateKey: config.stateKey,
    priority: config.priority || 50,
    component: config.component,
    props: config.props || {},
  };
  
  if (existing >= 0) {
    // Update existing
    slotElements.get(slot)[existing] = element;
  } else {
    // Add new
    slotElements.get(slot).push(element);
  }
  
  // Nach Priorität sortieren (höher = weiter links/oben)
  slotElements.get(slot).sort((a, b) => b.priority - a.priority);
  
  console.log(`[PluginUI] Registered "${config.id}" in slot "${slot}" from plugin "${pluginId}"`);
  
  // Event für UI-Update auslösen
  window.dispatchEvent(new CustomEvent('plugin-slot-update', { 
    detail: { slot, pluginId } 
  }));
  
  return true;
};

/**
 * Entfernt alle UI-Elemente eines Plugins
 */
export const unregisterPluginElements = (pluginId) => {
  for (const [slot, elements] of slotElements.entries()) {
    const filtered = elements.filter(el => el.pluginId !== pluginId);
    if (filtered.length !== elements.length) {
      slotElements.set(slot, filtered);
      window.dispatchEvent(new CustomEvent('plugin-slot-update', { 
        detail: { slot, pluginId } 
      }));
    }
  }
  
  // Event-Handler entfernen
  for (const key of eventHandlers.keys()) {
    if (key.startsWith(`${pluginId}:`)) {
      eventHandlers.delete(key);
    }
  }
  
  // States entfernen
  pluginStates.delete(pluginId);
  
  console.log(`[PluginUI] Unregistered all elements from plugin "${pluginId}"`);
};

/**
 * Holt alle Elemente für einen Slot
 */
export const getSlotElements = (slot) => {
  return slotElements.get(slot) || [];
};

/**
 * Holt alle registrierten Slots mit Elementen
 */
export const getAllSlots = () => {
  const result = {};
  for (const [slot, elements] of slotElements.entries()) {
    if (elements.length > 0) {
      result[slot] = elements;
    }
  }
  return result;
};

// ============ EVENT SYSTEM ============

/**
 * Registriert einen Event-Handler für ein Plugin
 */
export const registerEventHandler = (pluginId, eventType, handler) => {
  const key = `${pluginId}:${eventType}`;
  eventHandlers.set(key, handler);
};

/**
 * Entfernt einen Event-Handler
 */
export const unregisterEventHandler = (pluginId, eventType) => {
  const key = `${pluginId}:${eventType}`;
  eventHandlers.delete(key);
};

/**
 * Sendet ein Event an ein Plugin
 */
export const emitPluginEvent = (pluginId, eventType, data) => {
  const key = `${pluginId}:${eventType}`;
  const handler = eventHandlers.get(key);
  
  if (handler) {
    try {
      return handler(data);
    } catch (err) {
      console.error(`[PluginUI] Error in event handler ${key}:`, err);
    }
  }
  
  // Auch als DOM Event für Renderer-Plugins
  window.dispatchEvent(new CustomEvent(`plugin-event:${pluginId}`, {
    detail: { eventType, data }
  }));
};

/**
 * Broadcast Event an alle Plugins
 */
export const broadcastEvent = (eventType, data) => {
  const pluginIds = new Set();
  for (const key of eventHandlers.keys()) {
    const [pluginId] = key.split(':');
    pluginIds.add(pluginId);
  }
  
  for (const pluginId of pluginIds) {
    emitPluginEvent(pluginId, eventType, data);
  }
};

// ============ STATE MANAGEMENT ============

/**
 * Setzt Plugin-State
 */
export const setPluginState = (pluginId, key, value) => {
  if (!pluginStates.has(pluginId)) {
    pluginStates.set(pluginId, new Map());
  }
  pluginStates.get(pluginId).set(key, value);
  
  // Event auslösen
  window.dispatchEvent(new CustomEvent('plugin-state-change', {
    detail: { pluginId, key, value }
  }));
};

/**
 * Holt Plugin-State
 */
export const getPluginState = (pluginId, key) => {
  return pluginStates.get(pluginId)?.get(key);
};

/**
 * Holt alle States eines Plugins
 */
export const getAllPluginStates = (pluginId) => {
  const states = pluginStates.get(pluginId);
  if (!states) return {};
  return Object.fromEntries(states);
};

// ============ CUSTOM COMPONENTS ============

/**
 * Registriert eine Custom Component
 */
export const registerComponent = (pluginId, componentId, component) => {
  const key = `${pluginId}:${componentId}`;
  customComponents.set(key, component);
  console.log(`[PluginUI] Registered component "${componentId}" from plugin "${pluginId}"`);
};

/**
 * Holt eine Custom Component
 */
export const getComponent = (pluginId, componentId) => {
  const key = `${pluginId}:${componentId}`;
  return customComponents.get(key);
};

// ============ PLUGIN CONTEXT ============

/**
 * Erstellt einen Kontext für ein Plugin
 * Wird beim Laden des Plugins übergeben
 */
export const createPluginContext = (pluginId, manifest = {}) => ({
  pluginId,
  manifest,
  
  // UI registrieren
  registerUI: (slot, config) => registerSlotElement(pluginId, slot, config),
  
  // UI entfernen
  unregisterUI: () => unregisterPluginElements(pluginId),
  
  // Custom Component registrieren
  registerComponent: (id, component) => registerComponent(pluginId, id, component),
  
  // Event Handler registrieren
  on: (event, handler) => registerEventHandler(pluginId, event, handler),
  
  // Event Handler entfernen
  off: (event) => unregisterEventHandler(pluginId, event),
  
  // Event emittieren (an sich selbst oder andere)
  emit: (event, data) => emitPluginEvent(pluginId, event, data),
  
  // State Management
  state: {
    get: (key) => getPluginState(pluginId, key),
    set: (key, value) => setPluginState(pluginId, key, value),
    getAll: () => getAllPluginStates(pluginId),
  },
  
  // Persistenter Storage (localStorage)
  storage: {
    get: (key) => {
      try {
        const data = localStorage.getItem(`plugin:${pluginId}:${key}`);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(`plugin:${pluginId}:${key}`, JSON.stringify(value));
      } catch (err) {
        console.error(`[PluginUI] Storage error for ${pluginId}:`, err);
      }
    },
    remove: (key) => {
      localStorage.removeItem(`plugin:${pluginId}:${key}`);
    },
  },
  
  // UI Helpers
  ui: {
    // Status-Nachricht anzeigen
    showStatus: (message, type = 'info') => {
      window.dispatchEvent(new CustomEvent('plugin-status', {
        detail: { pluginId, message, type }
      }));
    },
    
    // Input-Feld setzen
    setInput: (text) => {
      window.dispatchEvent(new CustomEvent('plugin-set-input', {
        detail: { pluginId, text }
      }));
    },
    
    // Nachricht senden
    sendMessage: (content, options = {}) => {
      window.dispatchEvent(new CustomEvent('plugin-send-message', {
        detail: { pluginId, content, ...options }
      }));
    },
    
    // Toast/Notification anzeigen (uses Popup system)
    notify: (message, type = 'info') => {
      if (window.Popup?.toast) {
        window.Popup.toast(message, { type, pluginId });
      }
    },
  },
  
  // Popup/Dialog API
  popup: {
    // Alert dialog
    alert: (message, options = {}) => {
      if (window.Popup?.alert) {
        return window.Popup.alert(message, { ...options, pluginId });
      }
      return Promise.resolve();
    },
    
    // Confirm dialog
    confirm: (message, options = {}) => {
      if (window.Popup?.confirm) {
        return window.Popup.confirm(message, { ...options, pluginId });
      }
      return Promise.resolve(false);
    },
    
    // Prompt dialog
    prompt: (message, options = {}) => {
      if (window.Popup?.prompt) {
        return window.Popup.prompt(message, { ...options, pluginId });
      }
      return Promise.resolve(null);
    },
    
    // Custom dialog
    custom: (options = {}) => {
      if (window.Popup?.custom) {
        return window.Popup.custom({ ...options, pluginId });
      }
      return Promise.resolve(null);
    },
    
    // Toast notification
    toast: (message, options = {}) => {
      if (window.Popup?.toast) {
        return window.Popup.toast(message, { ...options, pluginId });
      }
    },
  },
  
  // System Prompt API
  prompt: {
    // Register a system prompt for this plugin
    register: (config) => {
      if (window.PromptManager?.registerPluginPrompt) {
        window.PromptManager.registerPluginPrompt(pluginId, config);
      }
    },
    
    // Update this plugin's prompt
    update: (updates) => {
      if (window.PromptManager?.updatePluginPrompt) {
        window.PromptManager.updatePluginPrompt(pluginId, updates);
      }
    },
    
    // Enable/disable this plugin's prompt
    setEnabled: (enabled) => {
      if (window.PromptManager?.setPluginPromptEnabled) {
        window.PromptManager.setPluginPromptEnabled(pluginId, enabled);
      }
    },
    
    // Unregister this plugin's prompt
    unregister: () => {
      if (window.PromptManager?.unregisterPluginPrompt) {
        window.PromptManager.unregisterPluginPrompt(pluginId);
      }
    },
    
    // Register a context provider for dynamic values
    registerContext: (key, provider) => {
      if (window.PromptManager?.registerContextProvider) {
        window.PromptManager.registerContextProvider(`${pluginId}_${key}`, provider);
      }
    },
  },
  
  // API Zugriff (über Electron)
  api: {
    call: async (method, ...args) => {
      if (window.electronAPI?.[method]) {
        return await window.electronAPI[method](...args);
      }
      throw new Error(`API method not available: ${method}`);
    },
  },
});

// ============ INITIALIZATION ============

/**
 * Initialisiert das Plugin-UI-System
 */
export const initPluginUISystem = () => {
  console.log('[PluginUI] System initialized');
  
  // Global verfügbar machen für Plugins
  window.PluginUI = {
    registerSlotElement,
    unregisterPluginElements,
    getSlotElements,
    getAllSlots,
    registerEventHandler,
    emitPluginEvent,
    broadcastEvent,
    setPluginState,
    getPluginState,
    registerComponent,
    getComponent,
    createPluginContext,
    getIcon,
    AVAILABLE_SLOTS,
  };
};

export default {
  registerSlotElement,
  unregisterPluginElements,
  getSlotElements,
  getAllSlots,
  registerEventHandler,
  unregisterEventHandler,
  emitPluginEvent,
  broadcastEvent,
  setPluginState,
  getPluginState,
  getAllPluginStates,
  registerComponent,
  getComponent,
  createPluginContext,
  initPluginUISystem,
  getIcon,
  AVAILABLE_SLOTS,
};
