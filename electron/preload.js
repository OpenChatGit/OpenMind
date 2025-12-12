
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
    sendLocalMessage: (messages) => ipcRenderer.invoke('send-local-message', { messages }),
    onLocalModelProgress: (callback) => ipcRenderer.on('local-model-progress', (event, data) => callback(data)),
    
    // Image/File Selection API
    selectImages: () => ipcRenderer.invoke('select-images'),
    
    // Image Generation API (Local Diffusers)
    generateImage: (params) => ipcRenderer.invoke('generate-image', params),
    loadImageModel: (modelId) => ipcRenderer.invoke('load-image-model', modelId),
    unloadImageModel: () => ipcRenderer.invoke('unload-image-model'),
    checkImageGenStatus: () => ipcRenderer.invoke('check-image-gen-status'),
    checkPythonSetup: () => ipcRenderer.invoke('check-python-setup'),
    onImageGenProgress: (callback) => ipcRenderer.on('image-gen-progress', (event, data) => callback(data)),
    
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
    hfDownloadModel: (modelId) => ipcRenderer.invoke('hf-download-model', modelId),
    hfGetUserInfo: () => ipcRenderer.invoke('hf-get-user-info'),
    onHfDownloadProgress: (callback) => ipcRenderer.on('hf-download-progress', (event, data) => callback(data)),
    
    
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
    
    // PTY Terminal API (real terminal via node-pty)
    ptyCreate: (options) => ipcRenderer.invoke('pty-create', options),
    ptyWrite: (data) => ipcRenderer.invoke('pty-write', data),
    ptyResize: (cols, rows) => ipcRenderer.invoke('pty-resize', { cols, rows }),
    ptyKill: () => ipcRenderer.invoke('pty-kill'),
    ptyStatus: () => ipcRenderer.invoke('pty-status'),
    onPtyData: (callback) => ipcRenderer.on('pty-data', (event, data) => callback(data)),
    onPtyExit: (callback) => ipcRenderer.on('pty-exit', (event, data) => callback(data)),
    removePtyListeners: () => {
        ipcRenderer.removeAllListeners('pty-data');
        ipcRenderer.removeAllListeners('pty-exit');
    },
    
    // SearXNG Web Search API
    searxngSearch: (query, options) => ipcRenderer.invoke('searxng:search', query, options),
    searxngStatus: () => ipcRenderer.invoke('searxng:status'),
    searxngCategories: () => ipcRenderer.invoke('searxng:categories')
});
