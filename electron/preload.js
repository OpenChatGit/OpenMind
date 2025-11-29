
// Preload script
const { contextBridge, ipcRenderer } = require('electron');

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('minimize-window'),
    maximize: () => ipcRenderer.send('maximize-window'),
    close: () => ipcRenderer.send('close-window'),
    onOllamaStatus: (callback) => ipcRenderer.on('ollama-status', (event, status) => callback(status)),
    onOllamaConnected: (callback) => ipcRenderer.on('ollama-connected', () => callback()),
    getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
    sendOllamaMessage: (model, messages) => ipcRenderer.invoke('send-ollama-message', { model, messages }),
    sendDeepSearchMessage: (model, messages) => ipcRenderer.invoke('send-deepsearch-message', { model, messages }),
    
    onThinkingUpdate: (callback) => ipcRenderer.on('ollama-thinking-update', (event, thinking) => callback(thinking)),
    onMessageUpdate: (callback) => ipcRenderer.on('ollama-message-update', (event, message) => callback(message)),
    onDeepSearchToolUse: (callback) => ipcRenderer.on('deepsearch-tool-use', (event, data) => callback(data)),
    
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
    
    // MCP Tools API
    mcpGetTools: () => ipcRenderer.invoke('mcp-get-tools'),
    mcpToggleTool: (toolId, enabled) => ipcRenderer.invoke('mcp-toggle-tool', { toolId, enabled }),
    mcpRefreshTools: () => ipcRenderer.invoke('mcp-refresh-tools'),
    mcpExecuteTool: (toolId, input) => ipcRenderer.invoke('mcp-execute-tool', { toolId, input }),
    mcpOpenToolsFolder: () => ipcRenderer.invoke('mcp-open-tools-folder'),
    sendMcpMessage: (model, messages, enabledToolIds) => ipcRenderer.invoke('send-mcp-message', { model, messages, enabledToolIds }),
    onMcpToolUse: (callback) => ipcRenderer.on('mcp-tool-use', (event, data) => callback(data)),
    
    // External Links
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Model Creator API
    createOllamaModel: (config) => ipcRenderer.invoke('create-ollama-model', config),
    onModelCreateProgress: (callback) => ipcRenderer.on('model-create-progress', (event, data) => callback(data)),
    
    // Settings API
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    
    // HuggingFace Inference API
    getHfInferenceModels: () => ipcRenderer.invoke('hf-get-inference-models'),
    searchHfInferenceModels: (query) => ipcRenderer.invoke('hf-search-inference-models', query),
    sendHfMessage: (model, messages) => ipcRenderer.invoke('send-hf-message', { model, messages })
});
