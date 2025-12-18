
// Preload script
const { contextBridge, ipcRenderer } = require('electron');

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('minimize-window'),
    maximize: () => ipcRenderer.send('maximize-window'),
    close: () => ipcRenderer.send('close-window'),
    
    // Ollama Server Management (with bundled binary)
    getOllamaServerStatus: () => ipcRenderer.invoke('get-ollama-server-status'),
    startOllamaServer: () => ipcRenderer.invoke('start-ollama-server'),
    stopOllamaServer: () => ipcRenderer.invoke('stop-ollama-server'),
    downloadOllama: () => ipcRenderer.invoke('download-ollama'),
    checkOllamaUpdates: () => ipcRenderer.invoke('check-ollama-updates'),
    onOllamaServerLog: (callback) => ipcRenderer.on('ollama-server-log', (event, log) => callback(log)),
    onOllamaDownloadProgress: (callback) => ipcRenderer.on('ollama-download-progress', (event, data) => callback(data)),
    onOllamaInitProgress: (callback) => ipcRenderer.on('ollama-init-progress', (event, data) => callback(data)),
    
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
    
    // Whisper ASR API
    whisperTranscribe: (audioData, mimeType, endpoint) => 
        ipcRenderer.invoke('whisper-transcribe', { audioData, mimeType, endpoint }),
    
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
