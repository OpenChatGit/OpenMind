/**
 * Prompt Manager - Global System Prompt Management
 * 
 * Ermöglicht Plugins, System Prompts zu registrieren die dann
 * mit dem Haupt-System-Prompt zusammengeführt werden.
 * 
 * Features:
 * - Plugin System Prompts registrieren/entfernen
 * - Prioritätsbasierte Sortierung
 * - Konditionale Prompts (nur wenn Plugin aktiv)
 * - Context Injection (dynamische Daten)
 * - Prompt Templates
 */

// Registered system prompts from plugins
const pluginPrompts = new Map();

// Base system prompt (can be overridden)
let baseSystemPrompt = '';

// Context providers for dynamic data
const contextProviders = new Map();

// Event listeners
const listeners = new Set();

/**
 * Benachrichtigt alle Listener über Änderungen
 */
const notifyListeners = () => {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (err) {
      console.error('[PromptManager] Listener error:', err);
    }
  });
};

/**
 * Registriert einen Listener für Prompt-Änderungen
 */
export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// ============ BASE PROMPT ============

/**
 * Setzt den Basis-System-Prompt
 */
export const setBasePrompt = (prompt) => {
  baseSystemPrompt = prompt;
  notifyListeners();
};

/**
 * Holt den Basis-System-Prompt
 */
export const getBasePrompt = () => baseSystemPrompt;

// ============ PLUGIN PROMPTS ============

/**
 * Registriert einen System Prompt für ein Plugin
 * 
 * @param {string} pluginId - Plugin ID
 * @param {object} config - Prompt Konfiguration
 * @param {string} config.prompt - Der System Prompt Text
 * @param {number} config.priority - Priorität (höher = weiter oben im finalen Prompt)
 * @param {string} config.position - 'before' oder 'after' dem Base Prompt
 * @param {boolean} config.enabled - Ob der Prompt aktiv ist
 * @param {function} config.condition - Optional: Funktion die true/false zurückgibt
 */
export const registerPluginPrompt = (pluginId, config) => {
  const promptConfig = {
    pluginId,
    prompt: config.prompt || '',
    priority: config.priority ?? 50,
    position: config.position || 'after', // 'before' or 'after'
    enabled: config.enabled !== false,
    condition: config.condition || null,
    template: config.template || false, // If true, prompt can contain {{variables}}
  };
  
  pluginPrompts.set(pluginId, promptConfig);
  console.log(`[PromptManager] Registered prompt for plugin "${pluginId}"`);
  notifyListeners();
};

/**
 * Aktualisiert einen Plugin Prompt
 */
export const updatePluginPrompt = (pluginId, updates) => {
  const existing = pluginPrompts.get(pluginId);
  if (existing) {
    pluginPrompts.set(pluginId, { ...existing, ...updates });
    notifyListeners();
  }
};

/**
 * Aktiviert/Deaktiviert einen Plugin Prompt
 */
export const setPluginPromptEnabled = (pluginId, enabled) => {
  const existing = pluginPrompts.get(pluginId);
  if (existing) {
    existing.enabled = enabled;
    notifyListeners();
  }
};

/**
 * Entfernt einen Plugin Prompt
 */
export const unregisterPluginPrompt = (pluginId) => {
  if (pluginPrompts.has(pluginId)) {
    pluginPrompts.delete(pluginId);
    console.log(`[PromptManager] Unregistered prompt for plugin "${pluginId}"`);
    notifyListeners();
  }
};

/**
 * Holt alle registrierten Plugin Prompts
 */
export const getPluginPrompts = () => {
  return Array.from(pluginPrompts.values());
};

// ============ CONTEXT PROVIDERS ============

/**
 * Registriert einen Context Provider für dynamische Daten
 * 
 * @param {string} key - Context Key (z.B. 'currentDate', 'userName')
 * @param {function} provider - Funktion die den Wert zurückgibt
 */
export const registerContextProvider = (key, provider) => {
  contextProviders.set(key, provider);
};

/**
 * Entfernt einen Context Provider
 */
export const unregisterContextProvider = (key) => {
  contextProviders.delete(key);
};

/**
 * Holt alle Context-Werte
 */
const getContextValues = () => {
  const context = {};
  for (const [key, provider] of contextProviders.entries()) {
    try {
      context[key] = typeof provider === 'function' ? provider() : provider;
    } catch (err) {
      console.error(`[PromptManager] Context provider error for "${key}":`, err);
      context[key] = '';
    }
  }
  return context;
};

/**
 * Ersetzt Template-Variablen in einem String
 */
const processTemplate = (text, context) => {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key] !== undefined ? context[key] : match;
  });
};

// ============ PROMPT BUILDING ============

/**
 * Baut den finalen System Prompt zusammen
 * 
 * @param {object} options - Optionen
 * @param {object} options.additionalContext - Zusätzliche Context-Werte
 * @param {string[]} options.enabledPlugins - Liste der aktiven Plugin IDs
 * @returns {string} Der zusammengebaute System Prompt
 */
export const buildSystemPrompt = (options = {}) => {
  const { additionalContext = {}, enabledPlugins = null } = options;
  
  // Get context values
  const context = { ...getContextValues(), ...additionalContext };
  
  // Collect active prompts
  const beforePrompts = [];
  const afterPrompts = [];
  
  for (const config of pluginPrompts.values()) {
    // Check if enabled
    if (!config.enabled) continue;
    
    // Check if plugin is in enabled list (if provided)
    if (enabledPlugins !== null && !enabledPlugins.includes(config.pluginId)) {
      continue;
    }
    
    // Check condition
    if (config.condition && !config.condition(context)) {
      continue;
    }
    
    // Process template if needed
    let promptText = config.prompt;
    if (config.template) {
      promptText = processTemplate(promptText, context);
    }
    
    // Add to appropriate list
    const promptEntry = { text: promptText, priority: config.priority };
    if (config.position === 'before') {
      beforePrompts.push(promptEntry);
    } else {
      afterPrompts.push(promptEntry);
    }
  }
  
  // Sort by priority (higher first)
  beforePrompts.sort((a, b) => b.priority - a.priority);
  afterPrompts.sort((a, b) => b.priority - a.priority);
  
  // Build final prompt
  const parts = [];
  
  // Before prompts
  if (beforePrompts.length > 0) {
    parts.push(beforePrompts.map(p => p.text).join('\n\n'));
  }
  
  // Base prompt
  if (baseSystemPrompt) {
    parts.push(processTemplate(baseSystemPrompt, context));
  }
  
  // After prompts
  if (afterPrompts.length > 0) {
    parts.push(afterPrompts.map(p => p.text).join('\n\n'));
  }
  
  return parts.join('\n\n');
};

/**
 * Schnelle Methode um nur den Base Prompt mit Context zu bekommen
 */
export const getProcessedBasePrompt = (additionalContext = {}) => {
  const context = { ...getContextValues(), ...additionalContext };
  return processTemplate(baseSystemPrompt, context);
};

// ============ PLUGIN API ============

/**
 * Erstellt eine Prompt-API für ein Plugin
 */
export const createPluginPromptAPI = (pluginId) => ({
  // Register this plugin's system prompt
  register: (config) => registerPluginPrompt(pluginId, config),
  
  // Update this plugin's prompt
  update: (updates) => updatePluginPrompt(pluginId, updates),
  
  // Enable/disable this plugin's prompt
  setEnabled: (enabled) => setPluginPromptEnabled(pluginId, enabled),
  
  // Unregister this plugin's prompt
  unregister: () => unregisterPluginPrompt(pluginId),
  
  // Register a context provider
  registerContext: (key, provider) => registerContextProvider(`${pluginId}_${key}`, provider),
  
  // Get the current full system prompt
  getFullPrompt: (options) => buildSystemPrompt(options),
});

// ============ INITIALIZATION ============

/**
 * Initialisiert das Prompt-System
 */
export const initPromptSystem = () => {
  // Register default context providers
  registerContextProvider('currentDate', () => new Date().toLocaleDateString());
  registerContextProvider('currentTime', () => new Date().toLocaleTimeString());
  registerContextProvider('currentDateTime', () => new Date().toLocaleString());
  
  // Make globally available
  window.PromptManager = {
    setBasePrompt,
    getBasePrompt,
    registerPluginPrompt,
    updatePluginPrompt,
    setPluginPromptEnabled,
    unregisterPluginPrompt,
    getPluginPrompts,
    registerContextProvider,
    unregisterContextProvider,
    buildSystemPrompt,
    getProcessedBasePrompt,
    subscribe,
  };
  
  console.log('[PromptManager] System initialized');
};

export default {
  setBasePrompt,
  getBasePrompt,
  registerPluginPrompt,
  updatePluginPrompt,
  setPluginPromptEnabled,
  unregisterPluginPrompt,
  getPluginPrompts,
  registerContextProvider,
  unregisterContextProvider,
  buildSystemPrompt,
  getProcessedBasePrompt,
  createPluginPromptAPI,
  initPromptSystem,
  subscribe,
};
