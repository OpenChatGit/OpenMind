
// Preload script
const { contextBridge, ipcRenderer } = require('electron');

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('minimize-window'),
    maximize: () => ipcRenderer.send('maximize-window'),
    close: () => ipcRenderer.send('close-window'),
    
    // Ollama API
    onOllamaStatus: (callback) => ipcRenderer.on('ollama-status', (event, status) => callback(status)),
    onOllamaConnected: (callback) => ipcRenderer.on('ollama-connected', () => callback()),
    getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
    pullOllamaModel: (modelName) => ipcRenderer.invoke('pull-ollama-model', modelName),
    deleteOllamaModel: (modelName) => ipcRenderer.invoke('delete-ollama-model', modelName),
    getOllamaModelInfo: (modelName) => ipcRenderer.invoke('get-ollama-model-info', modelName),
    onOllamaPullProgress: (callback) => ipcRenderer.on('ollama-pull-progress', (event, data) => callback(data)),
    sendOllamaMessage: (model, messages) => ipcRenderer.invoke('send-ollama-message', { model, messages }),
    sendDeepSearchMessage: (model, messages) => ipcRenderer.invoke('send-deepsearch-message', { model, messages }),
    executeOllamaCommand: (command) => ipcRenderer.invoke('execute-ollama-command', command),
    onOllamaTerminalProgress: (callback) => ipcRenderer.on('ollama-terminal-progress', (event, data) => callback(data)),
    ollamaVerboseTest: (model, prompt) => ipcRenderer.invoke('ollama-verbose-test', { model, prompt }),
    
    onThinkingUpdate: (callback) => ipcRenderer.on('ollama-thinking-update', (event, thinking) => callback(thinking)),
    onMessageUpdate: (callback) => ipcRenderer.on('ollama-message-update', (event, message) => callback(message)),
    onDeepSearchToolUse: (callback) => ipcRenderer.on('deepsearch-tool-use', (event, data) => callback(data)),
    
    // Local LLM API (node-llama-cpp - no Ollama needed!)
    getLocalModels: () => ipcRenderer.invoke('get-local-models'),
    loadLocalModel: (modelPath) => ipcRenderer.invoke('load-local-model', modelPath),
    unloadLocalModel: () => ipcRenderer.invoke('unload-local-model'),
    getLocalLlmStatus: () => ipcRenderer.invoke('get-local-llm-status'),
    sendLocalMessage: (messages, modelName) => ipcRenderer.invoke('send-local-message', { messages, modelName }),
    onLocalModelProgress: (callback) => ipcRenderer.on('local-model-progress', (event, data) => callback(data)),
    
    // OpenMind Model API (Custom GGUF model configurations)
    openmindListModels: () => ipcRenderer.invoke('openmind-list-models'),
    openmindGetModel: (name) => ipcRenderer.invoke('openmind-get-model', name),
    openmindCreateModel: (config) => ipcRenderer.invoke('openmind-create-model', config),
    openmindUpdateModel: (name, updates) => ipcRenderer.invoke('openmind-update-model', { name, updates }),
    openmindDeleteModel: (name) => ipcRenderer.invoke('openmind-delete-model', name),
    openmindScanGGUF: () => ipcRenderer.invoke('openmind-scan-gguf'),
    openmindImportModel: (sourcePath) => ipcRenderer.invoke('openmind-import-model', sourcePath),
    openmindGetPresets: () => ipcRenderer.invoke('openmind-get-presets'),
    openmindGetTemplates: () => ipcRenderer.invoke('openmind-get-templates'),
    openmindParseGGUF: (filePath) => ipcRenderer.invoke('openmind-parse-gguf', filePath),
    openmindLoadModel: (modelName) => ipcRenderer.invoke('openmind-load-model', modelName),
    openmindSelectGGUF: () => ipcRenderer.invoke('openmind-select-gguf'),
    onOpenmindCreateProgress: (callback) => ipcRenderer.on('openmind-create-progress', (event, data) => callback(data)),
    onOpenmindImportProgress: (callback) => ipcRenderer.on('openmind-import-progress', (event, data) => callback(data)),
    
    // Image/File Selection API
    selectImages: () => ipcRenderer.invoke('select-images'),
    
    // Image Generation API (Local Diffusers)
    generateImage: (params) => ipcRenderer.invoke('generate-image', params),
    loadImageModel: (modelId) => ipcRenderer.invoke('load-image-model', modelId),
    unloadImageModel: () => ipcRenderer.invoke('unload-image-model'),
    checkImageGenStatus: () => ipcRenderer.invoke('check-image-gen-status'),
    checkPythonSetup: () => ipcRenderer.invoke('check-python-setup'),
    onImageGenProgress: (callback) => ipcRenderer.on('image-gen-progress', (event, data) => callback(data)),
    
    // Docker API
    checkDockerStatus: () => ipcRenderer.invoke('check-docker-status'),
    getDockerContainers: () => ipcRenderer.invoke('get-docker-containers'),
    dockerStartContainer: (containerId) => ipcRenderer.invoke('docker-start-container', containerId),
    dockerStopContainer: (containerId) => ipcRenderer.invoke('docker-stop-container', containerId),
    dockerRestartContainer: (containerId) => ipcRenderer.invoke('docker-restart-container', containerId),
    dockerRemoveContainer: (containerId) => ipcRenderer.invoke('docker-remove-container', containerId),
    dockerPullAndRun: (options) => ipcRenderer.invoke('docker-pull-and-run', options),
    dockerComposeUp: (serviceName) => ipcRenderer.invoke('docker-compose-up', serviceName),
    dockerComposeDown: (serviceName) => ipcRenderer.invoke('docker-compose-down', serviceName),
    loadPluginRegistry: () => ipcRenderer.invoke('load-plugin-registry'),
    loadOnlinePluginRegistry: () => ipcRenderer.invoke('load-online-plugin-registry'),
    loadAPIPluginRegistry: () => ipcRenderer.invoke('load-api-plugin-registry'),
    checkInstalledPlugins: () => ipcRenderer.invoke('native-plugins-check-installed'),
    downloadPlugin: (pluginId, pluginPath) => ipcRenderer.invoke('native-plugin-download', { pluginId, pluginPath }),
    uninstallPlugin: (pluginId, pluginPath) => ipcRenderer.invoke('native-plugin-uninstall', { pluginId, pluginPath }),
    onPluginDownloadProgress: (callback) => ipcRenderer.on('plugin-download-progress', (event, data) => callback(data)),
    
    // Chat Persistence API
    loadChats: () => ipcRenderer.invoke('load-chats'),
    saveChats: (chats) => ipcRenderer.invoke('save-chats', chats),
    saveChat: (chat) => ipcRenderer.invoke('save-chat', chat),
    deleteChat: (chatId) => ipcRenderer.invoke('delete-chat', chatId),
    
    // Model Scanner API
    scanModelsFolder: () => ipcRenderer.invoke('scan-models-folder'),
    scanDiffusionModels: () => ipcRenderer.invoke('scan-diffusion-models'),
    getModelInfo: (modelPath) => ipcRenderer.invoke('get-model-info', modelPath),
    
    // Hugging Face API
    hfSetToken: (token) => ipcRenderer.invoke('hf-set-token', token),
    hfLoadToken: () => ipcRenderer.invoke('hf-load-token'),
    hfClearToken: () => ipcRenderer.invoke('hf-clear-token'),
    hfSearchModels: (query) => ipcRenderer.invoke('hf-search-models', query),
    hfGetModelInfo: (modelId) => ipcRenderer.invoke('hf-get-model-info', modelId),
    hfDownloadModel: (modelId) => ipcRenderer.invoke('hf-download-model', modelId),
    hfDownloadGGUF: (modelId, filename) => ipcRenderer.invoke('hf-download-gguf', modelId, filename),
    hfGetUserInfo: () => ipcRenderer.invoke('hf-get-user-info'),
    onHfDownloadProgress: (callback) => ipcRenderer.on('hf-download-progress', (event, data) => callback(data)),
    onHfGGUFDownloadProgress: (callback) => ipcRenderer.on('hf-gguf-download-progress', (event, data) => callback(data)),
    
    
    // External Links
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    revealInExplorer: (filePath) => ipcRenderer.invoke('reveal-in-explorer', filePath),
    
    // Model Creator API
    createOllamaModel: (config) => ipcRenderer.invoke('create-ollama-model', config),
    onModelCreateProgress: (callback) => ipcRenderer.on('model-create-progress', (event, data) => callback(data)),
    
    // Settings API
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    
    // HuggingFace Inference API
    getHfInferenceModels: () => ipcRenderer.invoke('hf-get-inference-models'),
    searchHfInferenceModels: (query) => ipcRenderer.invoke('hf-search-inference-models', query),
    sendHfMessage: (model, messages) => ipcRenderer.invoke('send-hf-message', { model, messages }),
    
    // SearXNG Web Search API
    searxngSearch: (query, options) => ipcRenderer.invoke('searxng:search', query, options),
    searxngStatus: () => ipcRenderer.invoke('searxng:status'),
    searxngCategories: () => ipcRenderer.invoke('searxng:categories'),
    
    // ============ UNIVERSAL PLUGIN API v2.0 ============
    // Core plugin system - works with ANY plugin type
    
    // Universal API caller - the main entry point for all plugin calls
    pluginCall: (pluginId, apiType, action, params, options) => 
        ipcRenderer.invoke('plugin-call', { pluginId, apiType, action, params, options }),
    
    // Registry functions
    pluginGetRegistry: (forceRefresh) => 
        ipcRenderer.invoke('plugin-get-registry', { forceRefresh }),
    pluginGet: (pluginId) => 
        ipcRenderer.invoke('plugin-get', pluginId),
    pluginGetByType: (apiType) => 
        ipcRenderer.invoke('plugin-get-by-type', apiType),
    pluginGetByCategory: (category) => 
        ipcRenderer.invoke('plugin-get-by-category', category),
    pluginGetRunning: (containers) => 
        ipcRenderer.invoke('plugin-get-running', containers),
    pluginGetTypes: () => 
        ipcRenderer.invoke('plugin-get-types'),
    
    // Convenience functions for common plugin types
    pluginTtsSpeak: (text, pluginId, options) => 
        ipcRenderer.invoke('plugin-tts-speak', { text, pluginId, options }),
    pluginSttTranscribe: (audioData, mimeType, pluginId, options) => 
        ipcRenderer.invoke('plugin-stt-transcribe', { audioData, mimeType, pluginId, options }),
    pluginSearch: (query, pluginId, options) => 
        ipcRenderer.invoke('plugin-search', { query, pluginId, options }),
    pluginImageGenerate: (prompt, pluginId, options) => 
        ipcRenderer.invoke('plugin-image-generate', { prompt, pluginId, options }),
    pluginEmbed: (text, pluginId, options) => 
        ipcRenderer.invoke('plugin-embed', { text, pluginId, options }),
    pluginCodeExecute: (code, language, pluginId, options) => 
        ipcRenderer.invoke('plugin-code-execute', { code, language, pluginId, options }),
    
    // Legacy APIs (kept for backwards compatibility)
    whisperTranscribe: (audioData, mimeType, endpoint) => 
        ipcRenderer.invoke('whisper-transcribe', { audioData, mimeType, endpoint }),
    ttsSpeak: (text, endpoint) => 
        ipcRenderer.invoke('tts-speak', { text, endpoint }),
    
    // ============ NATIVE PLUGIN API ============
    // For JS/Python plugins that run locally without Docker
    
    // Scan and load all native plugins
    nativePluginsScan: () => 
        ipcRenderer.invoke('native-plugins-scan'),
    
    // List all loaded native plugins
    nativePluginsList: () => 
        ipcRenderer.invoke('native-plugins-list'),
    
    // Load a specific plugin
    nativePluginLoad: (pluginPath) => 
        ipcRenderer.invoke('native-plugin-load', pluginPath),
    
    // Unload a plugin
    nativePluginUnload: (pluginId) => 
        ipcRenderer.invoke('native-plugin-unload', pluginId),
    
    // Call a method on a native plugin
    nativePluginCall: (pluginId, method, args) => 
        ipcRenderer.invoke('native-plugin-call', { pluginId, method, args }),
    
    // Get all UI slots with registered elements
    nativePluginsUISlots: () => 
        ipcRenderer.invoke('native-plugins-ui-slots'),
    
    // Get UI elements for a specific slot
    nativePluginsUISlot: (slotName) => 
        ipcRenderer.invoke('native-plugins-ui-slot', slotName),
    
    // Auth API (Local account system)
    authRegister: (email, password, name) => ipcRenderer.invoke('auth-register', { email, password, name }),
    authLogin: (email, password) => ipcRenderer.invoke('auth-login', { email, password }),
    authLogout: () => ipcRenderer.invoke('auth-logout'),
    authGetCurrentUser: () => ipcRenderer.invoke('auth-get-current-user'),
    authUpdateProfile: (updates) => ipcRenderer.invoke('auth-update-profile', updates),
    authConnectHuggingFace: (token, username) => ipcRenderer.invoke('auth-connect-huggingface', { token, username }),
    authDisconnectHuggingFace: () => ipcRenderer.invoke('auth-disconnect-huggingface'),
    authChangePassword: (currentPassword, newPassword) => ipcRenderer.invoke('auth-change-password', { currentPassword, newPassword }),
    
    // Secure Token Storage (for API keys, HF tokens, etc.)
    authStoreToken: (key, value) => ipcRenderer.invoke('auth-store-token', { key, value }),
    authGetToken: (key) => ipcRenderer.invoke('auth-get-token', key),
    authDeleteToken: (key) => ipcRenderer.invoke('auth-delete-token', key),
    
    // Training API (OpenMind Train)
    trainingCheckOrgMembership: (hfToken) => ipcRenderer.invoke('training-check-org-membership', hfToken),
    trainingGetBaseModels: () => ipcRenderer.invoke('training-get-base-models'),
    trainingGetPresets: () => ipcRenderer.invoke('training-get-presets'),
    trainingValidateData: (data, format) => ipcRenderer.invoke('training-validate-data', { data, format }),
    trainingGetSubscriptionTiers: () => ipcRenderer.invoke('training-get-subscription-tiers'),
    trainingStart: (config, hfToken) => ipcRenderer.invoke('training-start', { config, hfToken }),
    trainingCheckStatus: (jobId, hfToken) => ipcRenderer.invoke('training-check-status', { jobId, hfToken }),
});
