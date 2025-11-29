import { useState, useCallback, useEffect } from 'react';
import { Paperclip, ArrowUp, ChevronDown, ChevronRight, Radar, Wrench, FolderOpen, RefreshCw, Image, Copy, Info, RotateCcw, Check, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import ChartRenderer from './ChartRenderer';

const ChatArea = ({ activeChatId, messages, onUpdateMessages, onFirstMessage, inferenceSettings }) => {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState({});
  const [expandedToolCalls, setExpandedToolCalls] = useState({});
  const [deepSearchEnabled, setDeepSearchEnabled] = useState(false);
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [isMcpProcessing, setIsMcpProcessing] = useState(false);
  const [searchSources, setSearchSources] = useState([]); // URLs from web search
  const [currentSources, setCurrentSources] = useState([]); // Sources for current streaming message
  const [currentPreviews, setCurrentPreviews] = useState([]); // Preview images/cards
  const [mcpTools, setMcpTools] = useState([]);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [currentToolCalls, setCurrentToolCalls] = useState([]); // Live tool calls during DeepSearch
  const [attachedImages, setAttachedImages] = useState([]); // Images attached to current message
  const [imageGenEnabled, setImageGenEnabled] = useState(false); // Image generation mode
  const [isGeneratingImage, setIsGeneratingImage] = useState(false); // Currently generating
  const [diffusionModels, setDiffusionModels] = useState([]); // Available diffusion models
  const [selectedImageModel, setSelectedImageModel] = useState(''); // Selected image gen model
  const [hfModels, setHfModels] = useState([]); // HuggingFace inference models
  const [hfSearchQuery, setHfSearchQuery] = useState(''); // Search query for HF models
  const [hfSearchResults, setHfSearchResults] = useState([]); // Search results
  const [isSearchingHf, setIsSearchingHf] = useState(false); // Loading state
  const [hoveredMessageId, setHoveredMessageId] = useState(null); // Track hovered message for action buttons
  const [copiedMessageId, setCopiedMessageId] = useState(null); // Track which message was copied
  const [showInfoDropdown, setShowInfoDropdown] = useState(null); // Track which message info dropdown is open
  const [infoDropdownPosition, setInfoDropdownPosition] = useState('below'); // 'above' or 'below'
  const [hiddenButtons, setHiddenButtons] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('hiddenButtons');
    return saved ? JSON.parse(saved) : [];
  });
  const [isButtonsMenuOpen, setIsButtonsMenuOpen] = useState(false); // Dropup menu for hiding buttons
  const [fullscreenImage, setFullscreenImage] = useState(null); // Fullscreen image modal
  
  // Save hidden buttons to localStorage when changed
  useEffect(() => {
    localStorage.setItem('hiddenButtons', JSON.stringify(hiddenButtons));
  }, [hiddenButtons]);

  // ESC key to close fullscreen image
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage]);

  const toggleButtonVisibility = (buttonId) => {
    setHiddenButtons(prev => 
      prev.includes(buttonId) 
        ? prev.filter(id => id !== buttonId)
        : [...prev, buttonId]
    );
  };
  
  // Get current inference provider
  const inferenceProvider = inferenceSettings?.inferenceProvider || 'local';
  
  // Search HF models with debounce
  const searchHfModels = useCallback(async (query) => {
    if (!query.trim()) {
      setHfSearchResults([]);
      return;
    }
    setIsSearchingHf(true);
    try {
      const result = await window.electronAPI?.searchHfInferenceModels(query);
      if (result?.success) {
        setHfSearchResults(result.models);
      }
    } catch (e) {
      console.error('HF search error:', e);
    }
    setIsSearchingHf(false);
  }, []);

  const fetchModels = useCallback(async () => {
    // Fetch Ollama models
    if (window.electronAPI?.getOllamaModels) {
      const models = await window.electronAPI.getOllamaModels();
      if (models && models.length > 0) {
        setAvailableModels(models.map(m => m.name));
        if (inferenceProvider === 'local' && (!selectedModel || selectedModel === 'No Models Found')) {
          setSelectedModel(models[0].name);
        }
      } else {
        setAvailableModels([]);
        if (inferenceProvider === 'local') {
          setSelectedModel('No Models Found');
        }
      }
    }
    
    // Fetch HuggingFace inference models
    if (window.electronAPI?.getHfInferenceModels) {
      const result = await window.electronAPI.getHfInferenceModels();
      if (result?.success && result.models) {
        setHfModels(result.models);
        if (inferenceProvider === 'huggingface' && !selectedModel) {
          setSelectedModel(result.models[0]?.id || '');
        }
      }
    }
  }, [selectedModel, inferenceProvider]);

  // Handle provider change - select appropriate default model
  // Only auto-select when switching providers, not when user manually selects a model
  const [lastProvider, setLastProvider] = useState(inferenceProvider);
  
  useEffect(() => {
    // Only auto-select default model when provider actually changes
    if (inferenceProvider !== lastProvider) {
      setLastProvider(inferenceProvider);
      
      if (inferenceProvider === 'huggingface' && hfModels.length > 0) {
        // Switching to HuggingFace - select first HF model
        setSelectedModel(hfModels[0].id);
      } else if (inferenceProvider === 'local' && availableModels.length > 0) {
        // Switching to Local - select first Ollama model
        setSelectedModel(availableModels[0]);
      }
    } else {
      // Validate current model matches provider (in case of mismatch)
      const isHfModel = selectedModel?.includes('/');
      if (inferenceProvider === 'huggingface' && !isHfModel && hfModels.length > 0) {
        setSelectedModel(hfModels[0].id);
      } else if (inferenceProvider === 'local' && isHfModel && availableModels.length > 0) {
        setSelectedModel(availableModels[0]);
      }
    }
  }, [inferenceProvider, hfModels, availableModels, lastProvider, selectedModel]);

  useEffect(() => {
    fetchModels();
    fetchMcpTools();
    
    // Fetch diffusion models
    const loadDiffusionModels = async () => {
      if (window.electronAPI?.scanDiffusionModels) {
        const result = await window.electronAPI.scanDiffusionModels();
        if (result.success && result.models.length > 0) {
          setDiffusionModels(result.models);
          setSelectedImageModel(prev => prev || result.models[0].name);
        } else {
          setDiffusionModels([{ 
            name: 'SDXL-Turbo (Download)', 
            hfModelId: 'stabilityai/sdxl-turbo',
            type: 'huggingface'
          }]);
          setSelectedImageModel(prev => prev || 'SDXL-Turbo (Download)');
        }
      }
    };
    loadDiffusionModels();
    
    // Reload models when Ollama connects
    if (window.electronAPI?.onOllamaConnected) {
      window.electronAPI.onOllamaConnected(() => {
        fetchModels();
      });
    }
    
    // Listen for DeepSearch tool results to show sources and live tool calls
    if (window.electronAPI?.onDeepSearchToolUse) {
      window.electronAPI.onDeepSearchToolUse((data) => {
        // Track live tool calls (with deduplication)
        if (data.status === 'executing') {
          setCurrentToolCalls(prev => {
            // Check if we already have this tool call
            const key = `${data.tool}:${JSON.stringify(data.args)}`;
            const exists = prev.some(tc => `${tc.tool}:${JSON.stringify(tc.args)}` === key);
            if (exists) return prev; // Skip duplicate
            return [...prev, { 
              tool: data.tool, 
              args: data.args, 
              status: 'executing',
              timestamp: Date.now()
            }];
          });
        } else if (data.status === 'complete') {
          setCurrentToolCalls(prev => prev.map(tc => 
            tc.tool === data.tool && tc.status === 'executing'
              ? { ...tc, status: 'complete', result: data.result }
              : tc
          ));
        }
        
        // Track sources and previews from web search
        if (data.tool === 'web_search' && data.status === 'complete' && data.result?.results) {
          const results = data.result.results;
          const urls = results.filter(r => r.url).map(r => r.url);
          setSearchSources(prev => [...new Set([...prev, ...urls])]);
          setCurrentSources(prev => [...new Set([...prev, ...urls])]);
          
          // Extract previews (images, thumbnails)
          const previews = results
            .filter(r => r.thumbnail || r.type === 'image' || r.type === 'youtube' || r.type === 'github')
            .slice(0, 4)
            .map(r => ({
              url: r.url,
              thumbnail: r.thumbnail,
              title: r.title,
              type: r.type || 'web'
            }));
          if (previews.length > 0) {
            setCurrentPreviews(prev => [...prev, ...previews]);
          }
        }
      });
    }
  }, [fetchModels]);

  const fetchMcpTools = async () => {
    if (window.electronAPI?.mcpGetTools) {
      const tools = await window.electronAPI.mcpGetTools();
      setMcpTools(tools || []);
    }
  };

  const handleToggleTool = async (toolId, enabled) => {
    if (window.electronAPI?.mcpToggleTool) {
      await window.electronAPI.mcpToggleTool(toolId, enabled);
      fetchMcpTools();
    }
  };

  const handleOpenToolsFolder = async () => {
    if (window.electronAPI?.mcpOpenToolsFolder) {
      await window.electronAPI.mcpOpenToolsFolder();
    }
  };

  const handleRefreshTools = async () => {
    if (window.electronAPI?.mcpRefreshTools) {
      await window.electronAPI.mcpRefreshTools();
      fetchMcpTools();
    }
  };

  const handleAttachImages = async () => {
    if (window.electronAPI?.selectImages) {
      const result = await window.electronAPI.selectImages();
      if (result.success && result.images.length > 0) {
        setAttachedImages(prev => [...prev, ...result.images]);
      }
    }
  };

  const handleRemoveImage = (index) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle paste from clipboard (screenshots, copied images)
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target.result.split(',')[1];
            const mimeType = file.type;
            const dataUrl = event.target.result;
            setAttachedImages(prev => [...prev, {
              name: `Pasted Image ${Date.now()}`,
              base64,
              mimeType,
              dataUrl
            }]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }, []);

  // Image generation progress state
  const [imageGenProgress, setImageGenProgress] = useState('');

  // Listen for image generation progress
  useEffect(() => {
    if (window.electronAPI?.onImageGenProgress) {
      window.electronAPI.onImageGenProgress((data) => {
        setImageGenProgress(data.message || '');
      });
    }
  }, []);

  // Handle Image Generation
  const handleGenerateImage = useCallback(async (prompt) => {
    if (!prompt.trim()) return null;
    
    setIsGeneratingImage(true);
    setImageGenProgress('Starting...');
    try {
      // Find the selected model details
      const modelInfo = diffusionModels.find(m => m.name === selectedImageModel);
      const isLocalModel = modelInfo && modelInfo.path;
      const hfModelId = modelInfo?.hfModelId || 'stabilityai/sdxl-turbo';
      
      const result = await window.electronAPI?.generateImage({
        prompt: prompt,
        negativePrompt: 'blurry, bad quality, distorted, ugly, deformed',
        width: 512,
        height: 512,
        steps: isLocalModel ? 20 : 4, // Local models need more steps, SDXL-Turbo only needs 4
        guidance: isLocalModel ? 7.5 : 0.0, // SDXL-Turbo works best with 0 guidance
        model: hfModelId,
        localPath: isLocalModel ? modelInfo.path : null
      });
      
      if (result?.success) {
        return result.image;
      } else {
        console.error('Image generation failed:', result?.error);
        return { error: result?.error || 'Generation failed' };
      }
    } catch (error) {
      console.error('Image generation error:', error);
      return { error: error.message };
    } finally {
      setIsGeneratingImage(false);
      setImageGenProgress('');
    }
  }, [diffusionModels, selectedImageModel]);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedImages.length === 0) || (!imageGenEnabled && (!selectedModel || selectedModel === 'No Models Found'))) return;

    const userMessage = { 
      role: 'user', 
      content: input || (attachedImages.length > 0 ? 'What do you see in this image?' : ''), 
      id: Date.now(),
      images: attachedImages.length > 0 ? attachedImages : undefined
    };

    // Image Generation Mode
    if (imageGenEnabled && input.trim()) {
      const inputText = input;
      setInput('');
      
      let chatId = activeChatId;
      let currentMessages = [...messages];
      
      const assistantMessageId = Date.now() + 1;
      const newMessages = [...currentMessages, userMessage];
      const messagesWithPlaceholder = [...newMessages, {
        role: 'assistant',
        content: '',
        id: assistantMessageId,
        isStreaming: true,
        isGenerating: true
      }];
      
      if (!chatId) {
        chatId = onFirstMessage(inputText, messagesWithPlaceholder);
      } else {
        onUpdateMessages(chatId, messagesWithPlaceholder);
      }
      
      const generatedImage = await handleGenerateImage(inputText);
      
      if (generatedImage && !generatedImage.error) {
        onUpdateMessages(chatId, [...newMessages, {
          role: 'assistant',
          content: `Generated image for: "${inputText}"`,
          generatedImage: generatedImage,
          id: assistantMessageId,
          isStreaming: false
        }]);
      } else {
        const errorMsg = generatedImage?.error || 'Unknown error';
        let helpText = '';
        if (errorMsg.includes('Missing dependencies') || errorMsg.includes('torch')) {
          helpText = '\n\nInstall required packages:\n```\npip install torch diffusers transformers accelerate\n```';
        } else if (errorMsg.includes('Python')) {
          helpText = '\n\nMake sure Python 3.8+ is installed.';
        }
        onUpdateMessages(chatId, [...newMessages, {
          role: 'assistant',
          content: `Failed to generate image: ${errorMsg}${helpText}`,
          id: assistantMessageId,
          isStreaming: false
        }]);
      }
      return;
    }
    const inputText = input || 'Image';
    setInput('');
    setAttachedImages([]);

    let chatId = activeChatId;
    let currentMessages = [...messages];

    const assistantMessageId = Date.now() + 1;
    const newMessages = [...currentMessages, userMessage];
    const messagesWithPlaceholder = [...newMessages, {
      role: 'assistant',
      content: '',
      thinking: '',
      id: assistantMessageId,
      isStreaming: true
    }];

    // If no active chat, create one with first message as name and initial messages
    if (!chatId) {
      chatId = onFirstMessage(inputText, messagesWithPlaceholder);
    } else {
      onUpdateMessages(chatId, messagesWithPlaceholder);
    }

    let currentThinking = '';
    let currentContent = '';

    const thinkingListener = (thinking) => {
      currentThinking = thinking;
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: true
      }]);
    };

    const messageListener = (content) => {
      currentContent = content;
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: true
      }]);
    };

    window.electronAPI.onThinkingUpdate(thinkingListener);
    window.electronAPI.onMessageUpdate(messageListener);

    try {
      let response;
      const enabledMcpTools = mcpTools.filter(t => t.enabled);
      
      if (deepSearchEnabled) {
        // DeepSearch mode with tool use (includes web search, file search, etc.)
        setIsDeepSearching(true);
        setSearchSources([]); // Reset sources for new search
        setCurrentSources([]); // Reset current sources
        setCurrentPreviews([]); // Reset previews for new search
        setCurrentToolCalls([]); // Reset tool calls for new search
        setExpandedToolCalls(prev => ({ ...prev, [assistantMessageId]: true })); // Auto-expand tool calls
        setExpandedReasoning(prev => ({ ...prev, [assistantMessageId]: true })); // Auto-expand reasoning during DeepSearch
        response = await window.electronAPI.sendDeepSearchMessage(selectedModel, newMessages);
        setIsDeepSearching(false);
      } else if (enabledMcpTools.length > 0) {
        // MCP Tools mode (only MCP tools, no DeepSearch)
        setIsMcpProcessing(true);
        const enabledToolIds = enabledMcpTools.map(t => t.id);
        response = await window.electronAPI.sendMcpMessage(selectedModel, newMessages, enabledToolIds);
        setIsMcpProcessing(false);
      } else if (inferenceProvider === 'huggingface') {
        // HuggingFace Inference API
        response = await window.electronAPI.sendHfMessage(selectedModel, newMessages);
      } else {
        // Normal streaming mode (Local Ollama)
        response = await window.electronAPI.sendOllamaMessage(selectedModel, newMessages);
      }
      
      // Use the streamed values to avoid flicker
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent || response.content,
        thinking: currentThinking || response.thinking,
        sources: deepSearchEnabled ? [...currentSources] : [], // Include search sources
        toolCalls: deepSearchEnabled ? [...currentToolCalls] : [], // Include tool calls
        previews: deepSearchEnabled ? [...currentPreviews] : [], // Include preview images

        stats: response.stats || {}, // Include inference stats
        model: selectedModel, // Include model used
        id: assistantMessageId,
        isStreaming: false
      }]);
      setCurrentSources([]); // Clear after saving
      setCurrentToolCalls([]); // Clear tool calls after saving
      setCurrentPreviews([]); // Clear previews after saving
      

    } catch (error) {
      console.error('Inference error:', error);
      setIsDeepSearching(false);
      setIsMcpProcessing(false);
      
      // Build helpful error message
      let errorMsg;
      if (inferenceProvider === 'huggingface') {
        if (error?.message?.includes('not supported')) {
          errorMsg = `Error: Model "${selectedModel}" is not available for inference. Try a different model.`;
        } else if (error?.message?.includes('API token')) {
          errorMsg = 'Error: HuggingFace API key not set. Check Settings.';
        } else {
          errorMsg = `Error: ${error?.message || 'Could not connect to HuggingFace.'}`;
        }
      } else {
        errorMsg = 'Error: Could not connect to Ollama. Is it running?';
      }
      
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: errorMsg,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: false
      }]);
    }
  }, [input, selectedModel, activeChatId, messages, onUpdateMessages, onFirstMessage, mcpTools, deepSearchEnabled, attachedImages, inferenceProvider]);

  // Copy message content to clipboard
  const handleCopyMessage = useCallback(async (messageContent) => {
    try {
      await navigator.clipboard.writeText(messageContent);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  }, []);

  // Regenerate AI response for a specific message
  const handleRegenerate = useCallback(async (messageIndex) => {
    if (!selectedModel || selectedModel === 'No Models Found') return;
    
    // Validate model matches provider
    const isHfModel = selectedModel.includes('/'); // HF models have format "org/model"
    if (inferenceProvider === 'huggingface' && !isHfModel) {
      console.error('Cannot regenerate: Selected model is not a HuggingFace model');
      return;
    }
    if (inferenceProvider === 'local' && isHfModel) {
      console.error('Cannot regenerate: Selected model is not an Ollama model');
      return;
    }
    
    // Find the user message before this AI message
    const aiMessage = messages[messageIndex];
    if (aiMessage.role !== 'assistant') return;
    
    // Get all messages up to (but not including) this AI message
    const messagesBeforeAi = messages.slice(0, messageIndex);
    
    // Find the last user message
    const lastUserMessage = messagesBeforeAi[messagesBeforeAi.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') return;
    
    const assistantMessageId = Date.now();
    const newMessages = [...messagesBeforeAi];
    
    // Add placeholder for new response
    const messagesWithPlaceholder = [...newMessages, {
      role: 'assistant',
      content: '',
      thinking: '',
      id: assistantMessageId,
      isStreaming: true
    }];
    
    onUpdateMessages(activeChatId, messagesWithPlaceholder);
    
    let currentThinking = '';
    let currentContent = '';

    const thinkingListener = (thinking) => {
      currentThinking = thinking;
      onUpdateMessages(activeChatId, [...newMessages, {
        role: 'assistant',
        content: currentContent,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: true
      }]);
    };

    const messageListener = (content) => {
      currentContent = content;
      onUpdateMessages(activeChatId, [...newMessages, {
        role: 'assistant',
        content: currentContent,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: true
      }]);
    };

    window.electronAPI.onThinkingUpdate(thinkingListener);
    window.electronAPI.onMessageUpdate(messageListener);

    try {
      let response;
      const enabledMcpTools = mcpTools.filter(t => t.enabled);
      
      // Use the correct API based on provider
      if (deepSearchEnabled) {
        setIsDeepSearching(true);
        setSearchSources([]);
        setCurrentSources([]);
        setCurrentPreviews([]);
        setCurrentToolCalls([]);
        response = await window.electronAPI.sendDeepSearchMessage(selectedModel, newMessages);
        setIsDeepSearching(false);
      } else if (enabledMcpTools.length > 0) {
        setIsMcpProcessing(true);
        const enabledToolIds = enabledMcpTools.map(t => t.id);
        response = await window.electronAPI.sendMcpMessage(selectedModel, newMessages, enabledToolIds);
        setIsMcpProcessing(false);
      } else if (inferenceProvider === 'huggingface') {
        response = await window.electronAPI.sendHfMessage(selectedModel, newMessages);
      } else {
        response = await window.electronAPI.sendOllamaMessage(selectedModel, newMessages);
      }
      
      onUpdateMessages(activeChatId, [...newMessages, {
        role: 'assistant',
        content: currentContent || response.content,
        thinking: currentThinking || response.thinking,
        sources: deepSearchEnabled ? [...currentSources] : [],
        toolCalls: deepSearchEnabled ? [...currentToolCalls] : [],
        previews: deepSearchEnabled ? [...currentPreviews] : [],
        stats: response.stats || {},
        model: selectedModel,
        id: assistantMessageId,
        isStreaming: false
      }]);
      setCurrentSources([]);
      setCurrentToolCalls([]);
      setCurrentPreviews([]);
    } catch (error) {
      console.error('Regenerate error:', error);
      setIsDeepSearching(false);
      setIsMcpProcessing(false);
      
      // Build helpful error message
      let errorMsg = 'Error: Could not regenerate response.';
      if (error?.message) {
        if (error.message.includes('not supported')) {
          errorMsg = `Error: Model "${selectedModel}" is not available for inference. Try a different model.`;
        } else if (error.message.includes('API token')) {
          errorMsg = 'Error: HuggingFace API key not set. Check Settings.';
        } else {
          errorMsg = `Error: ${error.message}`;
        }
      }
      
      onUpdateMessages(activeChatId, [...newMessages, {
        role: 'assistant',
        content: errorMsg,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: false
      }]);
    }
  }, [selectedModel, activeChatId, messages, onUpdateMessages, mcpTools, deepSearchEnabled, inferenceProvider, currentSources, currentToolCalls, currentPreviews]);

  const isNewChat = !activeChatId || messages.length === 0;

  const inputBox = (
    <div style={{
      padding: isNewChat ? '0' : '1.5rem',
      paddingBottom: isNewChat ? '0' : '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      width: '100%'
    }}>
      <div style={{
        width: '100%',
        background: '#2c2c2e',
        borderRadius: '20px',
        padding: '16px',
        boxShadow: '0 0 20px rgba(255, 255, 255, 0.05), 0 4px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Attached Images Preview */}
        {attachedImages.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '8px'
          }}>
            {attachedImages.map((img, index) => (
              <div key={index} style={{
                position: 'relative',
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <img 
                  src={img.dataUrl} 
                  alt={img.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onPaste={handlePaste}
          placeholder={imageGenEnabled ? "Describe the image you want to generate..." : (attachedImages.length > 0 ? "Ask about the image(s)..." : "Message AI")}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'white',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: '1rem',
            height: '40px',
            minHeight: '40px'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Attach Button - expands on hover */}
            {!hiddenButtons.includes('attach') && (
            <button 
              className="expandable-btn"
              onClick={handleAttachImages}
              style={{
                background: attachedImages.length > 0 ? '#fff' : 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: attachedImages.length > 0 ? '#000' : '#888',
                cursor: 'pointer',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: attachedImages.length > 0 ? '6px' : '0px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (attachedImages.length === 0) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#ccc';
                }
                e.currentTarget.style.gap = '6px';
                e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                e.currentTarget.querySelector('.btn-label').style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                if (attachedImages.length === 0) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#888';
                  e.currentTarget.style.gap = '0px';
                  e.currentTarget.querySelector('.btn-label').style.width = '0';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '0';
                }
              }}
            >
              <Paperclip size={16} />
              <span className="btn-label" style={{ 
                width: attachedImages.length > 0 ? 'auto' : '0', 
                opacity: attachedImages.length > 0 ? '1' : '0', 
                overflow: 'hidden', 
                transition: 'all 0.3s ease' 
              }}>
                {attachedImages.length > 0 ? `${attachedImages.length} Image${attachedImages.length > 1 ? 's' : ''}` : 'Attach'}
              </span>
            </button>
            )}

            {/* DeepSearch Button - expands on hover, rotating glow when active */}
            {!hiddenButtons.includes('deepsearch') && (
            <div style={{ 
              position: 'relative',
              borderRadius: '20px',
              padding: isDeepSearching ? '2px' : '0',
              background: isDeepSearching 
                ? 'conic-gradient(from var(--angle, 0deg), #ff6b6b, #feca57, #48dbfb, #ff9ff3, #ff6b6b)' 
                : 'transparent',
              animation: isDeepSearching ? 'rotate-glow 2s linear infinite' : 'none'
            }}>
              <style>
                {`
                  @property --angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                  }
                  @keyframes rotate-glow {
                    from { --angle: 0deg; }
                    to { --angle: 360deg; }
                  }
                `}
              </style>
              <button
                onClick={() => {
                  const newValue = !deepSearchEnabled;
                  setDeepSearchEnabled(newValue);
                }}
                style={{
                  background: deepSearchEnabled ? '#fff' : '#2c2c2e',
                  border: isDeepSearching ? 'none' : '1px solid rgba(255,255,255,0.3)',
                  color: deepSearchEnabled ? '#000' : '#888',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px',
                  borderRadius: '18px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!deepSearchEnabled) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#ccc';
                  }
                  e.currentTarget.style.gap = '6px';
                  e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (!deepSearchEnabled) {
                    e.currentTarget.style.background = isDeepSearching ? '#2c2c2e' : 'transparent';
                    e.currentTarget.style.color = '#888';
                  }
                  e.currentTarget.style.gap = '0px';
                  e.currentTarget.querySelector('.btn-label').style.width = '0';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '0';
                }}
              >
                <Radar size={16} />
                <span className="btn-label" style={{ 
                  width: '0', 
                  opacity: '0', 
                  overflow: 'hidden', 
                  transition: 'all 0.3s ease' 
                }}>DeepSearch</span>
              </button>
            </div>

            )}

            {/* Image Generation Button */}
            {!hiddenButtons.includes('imagegen') && (
            <div style={{ 
              position: 'relative',
              borderRadius: '20px',
              padding: isGeneratingImage ? '2px' : '0',
              background: isGeneratingImage 
                ? 'conic-gradient(from var(--angle, 0deg), #ff6b6b, #feca57, #48dbfb, #ff9ff3, #ff6b6b)' 
                : 'transparent',
              animation: isGeneratingImage ? 'rotate-glow 2s linear infinite' : 'none'
            }}>
              <button
                onClick={() => setImageGenEnabled(!imageGenEnabled)}
                style={{
                  background: imageGenEnabled ? '#fff' : (isGeneratingImage ? '#2c2c2e' : 'transparent'),
                  border: isGeneratingImage ? 'none' : '1px solid rgba(255,255,255,0.3)',
                  color: imageGenEnabled ? '#000' : '#888',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px',
                  borderRadius: '18px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!imageGenEnabled) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#ccc';
                  }
                  e.currentTarget.style.gap = '6px';
                  e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (!imageGenEnabled) {
                    e.currentTarget.style.background = isGeneratingImage ? '#2c2c2e' : 'transparent';
                    e.currentTarget.style.color = '#888';
                  }
                  e.currentTarget.style.gap = '0px';
                  e.currentTarget.querySelector('.btn-label').style.width = '0';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '0';
                }}
              >
                <Image size={16} />
                <span className="btn-label" style={{ 
                  width: '0', 
                  opacity: '0', 
                  overflow: 'hidden', 
                  transition: 'all 0.3s ease' 
                }}>Generate</span>
              </button>
            </div>
            )}

            {/* MCP Tools Button - expands on hover, rotating glow when processing */}
            {!hiddenButtons.includes('mcptools') && (
            <div style={{ 
              position: 'relative',
              borderRadius: '20px',
              padding: isMcpProcessing ? '2px' : '0',
              background: isMcpProcessing 
                ? 'conic-gradient(from var(--angle, 0deg), #ff6b6b, #feca57, #48dbfb, #ff9ff3, #ff6b6b)' 
                : 'transparent',
              animation: isMcpProcessing ? 'rotate-glow 2s linear infinite' : 'none'
            }}>
              <button
                onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                style={{
                  background: mcpTools.some(t => t.enabled) ? '#fff' : (isMcpProcessing ? '#2c2c2e' : 'transparent'),
                  border: isMcpProcessing ? 'none' : '1px solid rgba(255,255,255,0.3)',
                  color: mcpTools.some(t => t.enabled) ? '#000' : '#888',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px',
                  borderRadius: '18px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!mcpTools.some(t => t.enabled)) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#ccc';
                  }
                  e.currentTarget.style.gap = '6px';
                  e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (!mcpTools.some(t => t.enabled)) {
                    e.currentTarget.style.background = isMcpProcessing ? '#2c2c2e' : 'transparent';
                    e.currentTarget.style.color = '#888';
                  }
                  e.currentTarget.style.gap = '0px';
                  e.currentTarget.querySelector('.btn-label').style.width = '0';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '0';
                }}
              >
                <Wrench size={16} />
                <span className="btn-label" style={{ 
                  width: '0', 
                  opacity: '0', 
                  overflow: 'hidden', 
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Tools
                  {mcpTools.filter(t => t.enabled).length > 0 && (
                    <span style={{ fontSize: '0.75rem' }}>({mcpTools.filter(t => t.enabled).length})</span>
                  )}
                </span>
              </button>

              {isToolsMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setIsToolsMenuOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: '8px',
                    background: '#1f1f1f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '220px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: '500' }}>MCP Tools</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={handleRefreshTools}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                          title="Refresh tools"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={handleOpenToolsFolder}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                          title="Open tools folder"
                        >
                          <FolderOpen size={14} />
                        </button>
                      </div>
                    </div>

                    {mcpTools.length > 0 ? (
                      mcpTools.map(tool => (
                        <div
                          key={tool.id}
                          onClick={() => handleToggleTool(tool.id, !tool.enabled)}
                          style={{
                            padding: '8px 10px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s',
                            marginBottom: '2px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: tool.enabled ? 'none' : '1px solid #555',
                            background: tool.enabled ? '#4caf50' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {tool.enabled && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#ececec', fontWeight: '500' }}>{tool.name}</div>
                            {tool.description && (
                              <div style={{
                                color: '#888',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {tool.description}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '12px', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
                        No tools installed.<br />
                        <span
                          onClick={handleOpenToolsFolder}
                          style={{ color: '#6ea8fe', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Open tools folder
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            )}

            {/* Button Visibility Settings */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsButtonsMenuOpen(!isButtonsMenuOpen)}
                style={{
                  background: hiddenButtons.length > 0 ? 'rgba(255,165,0,0.2)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: hiddenButtons.length > 0 ? '#ffa500' : '#888',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.gap = '6px';
                  e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = hiddenButtons.length > 0 ? 'rgba(255,165,0,0.2)' : 'transparent';
                  e.currentTarget.style.color = hiddenButtons.length > 0 ? '#ffa500' : '#888';
                  e.currentTarget.style.gap = '0px';
                  e.currentTarget.querySelector('.btn-label').style.width = '0';
                  e.currentTarget.querySelector('.btn-label').style.opacity = '0';
                }}
              >
                <SlidersHorizontal size={16} />
                <span className="btn-label" style={{ 
                  width: '0', 
                  opacity: '0', 
                  overflow: 'hidden', 
                  transition: 'all 0.3s ease' 
                }}>Buttons</span>
              </button>

              {isButtonsMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setIsButtonsMenuOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: '8px',
                    background: '#1f1f1f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '180px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#888',
                      fontWeight: '500',
                      marginBottom: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      Show/Hide Buttons
                    </div>
                    
                    {[
                      { id: 'attach', label: 'Attach', icon: <Paperclip size={14} /> },
                      { id: 'deepsearch', label: 'DeepSearch', icon: <Radar size={14} /> },
                      { id: 'imagegen', label: 'Image Gen', icon: <Image size={14} /> },
                      { id: 'mcptools', label: 'MCP Tools', icon: <Wrench size={14} /> }
                    ].map(btn => (
                      <div
                        key={btn.id}
                        onClick={() => toggleButtonVisibility(btn.id)}
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s',
                          marginBottom: '2px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: hiddenButtons.includes(btn.id) ? '1px solid #555' : 'none',
                          background: hiddenButtons.includes(btn.id) ? 'transparent' : '#4caf50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {!hiddenButtons.includes(btn.id) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ececec' }}>
                          {btn.icon}
                          {btn.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                style={{
                  background: imageGenEnabled ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: imageGenEnabled ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  color: imageGenEnabled ? '#fff' : '#888',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = imageGenEnabled ? 'rgba(255,255,255,0.08)' : 'transparent';
                  e.currentTarget.style.color = imageGenEnabled ? '#fff' : '#888';
                }}
              >
                {imageGenEnabled ? (selectedImageModel || 'Select Image Model') : (selectedModel || 'Select Model')}
                <ChevronDown size={14} />
              </button>

              {isModelMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setIsModelMenuOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '8px',
                    background: '#1f1f1f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '4px',
                    minWidth: '200px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    backdropFilter: 'blur(10px)'
                  }}>
                    {imageGenEnabled ? (
                      // Image Generation Models
                      <>
                        <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#888', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px' }}>
                          🎨 Image Generation Models
                        </div>
                        {diffusionModels.length > 0 ? (
                          diffusionModels.map(model => (
                            <div
                              key={model.name}
                              onClick={() => {
                                setSelectedImageModel(model.name);
                                setIsModelMenuOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: selectedImageModel === model.name ? 'white' : '#aaa',
                                background: selectedImageModel === model.name ? 'rgba(255,255,255,0.1)' : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedImageModel !== model.name) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                  e.currentTarget.style.color = '#ddd';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedImageModel !== model.name) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#aaa';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>{model.name}</span>
                                {selectedImageModel === model.name && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                              </div>
                              {model.sizeFormatted && (
                                <span style={{ fontSize: '0.7rem', color: '#666' }}>{model.sizeFormatted} • {model.type}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '12px', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
                            No models in /models folder.<br />
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>Will use SDXL-Turbo from HuggingFace</span>
                          </div>
                        )}
                      </>
                    ) : inferenceProvider === 'huggingface' ? (
                      // HuggingFace Inference Models with Search
                      <>
                        <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#FFD21E', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          🤗 HuggingFace Inference
                        </div>
                        {/* Search Bar */}
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <input
                            type="text"
                            value={hfSearchQuery}
                            onChange={(e) => {
                              setHfSearchQuery(e.target.value);
                              searchHfModels(e.target.value);
                            }}
                            placeholder="Search models..."
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '0.85rem',
                              outline: 'none'
                            }}
                          />
                        </div>
                        {/* Search Results or Default Models */}
                        {isSearchingHf ? (
                          <div style={{ padding: '12px', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
                            Searching...
                          </div>
                        ) : (hfSearchQuery && hfSearchResults.length > 0) ? (
                          // Show search results
                          hfSearchResults.map(model => (
                            <div
                              key={model.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Selected HF model:', model.id);
                                setSelectedModel(model.id);
                                setIsModelMenuOpen(false);
                                setHfSearchQuery('');
                                setHfSearchResults([]);
                              }}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: selectedModel === model.id ? 'white' : '#aaa',
                                background: selectedModel === model.id ? 'rgba(255,210,30,0.15)' : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedModel !== model.id) {
                                  e.currentTarget.style.background = 'rgba(255,210,30,0.08)';
                                  e.currentTarget.style.color = '#ececec';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedModel !== model.id) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#aaa';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8rem' }}>{model.id}</span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#666' }}>{model.size} • {model.downloads?.toLocaleString()} downloads</span>
                            </div>
                          ))
                        ) : hfSearchQuery && hfSearchResults.length === 0 ? (
                          <div style={{ padding: '12px', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
                            No models found
                          </div>
                        ) : (
                          // Show default models
                          hfModels.map(model => (
                            <div
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model.id);
                                setIsModelMenuOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: selectedModel === model.id ? 'white' : '#aaa',
                                background: selectedModel === model.id ? 'rgba(255,210,30,0.15)' : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedModel !== model.id) {
                                  e.currentTarget.style.background = 'rgba(255,210,30,0.08)';
                                  e.currentTarget.style.color = '#ececec';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedModel !== model.id) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#aaa';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>{model.name}</span>
                                {selectedModel === model.id && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFD21E' }} />}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#666' }}>{model.size}</span>
                            </div>
                          ))
                        )}
                      </>
                    ) : (
                      // Ollama Models (Local)
                      <>
                        <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#888', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px' }}>
                          💻 Local (Ollama)
                        </div>
                        {availableModels.length > 0 ? (
                          availableModels.map(model => (
                            <div
                              key={model}
                              onClick={() => {
                                setSelectedModel(model);
                                setIsModelMenuOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                color: selectedModel === model ? 'white' : '#aaa',
                                background: selectedModel === model ? 'rgba(255,255,255,0.1)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedModel !== model) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                  e.currentTarget.style.color = '#ececec';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedModel !== model) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#aaa';
                                }
                              }}
                            >
                              {model}
                              {selectedModel === model && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '8px 12px', color: '#888', fontSize: '0.9rem' }}>
                            No models found. <br /> Is Ollama running?
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleSend}
              style={{
                background: (input.trim() || attachedImages.length > 0) ? 'white' : '#4a4a4a',
                color: (input.trim() || attachedImages.length > 0) ? 'black' : '#888',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (input.trim() || attachedImages.length > 0) ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
            >
              <ArrowUp size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      flex: 1,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 10,
      overflow: 'hidden'
    }}>
      {isNewChat ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          gap: '0.5rem',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '600',
            color: 'white',
            textAlign: 'center',
            opacity: 0.9
          }}>
            What can I help you with?
          </h1>
          {inputBox}
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <div style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              maxWidth: '800px',
              margin: '0 auto',
              width: '100%'
            }}>
              {messages.map((msg, i) => (
                <div key={msg.id || i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}>
                  {msg.role === 'user' ? (
                    <div style={{
                      maxWidth: '70%',
                      padding: '1rem 1.5rem',
                      borderRadius: '20px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.3)',
                      lineHeight: '1.5',
                      color: 'white'
                    }}>
                      {/* Show attached images */}
                      {msg.images && msg.images.length > 0 && (
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: msg.content ? '10px' : '0'
                        }}>
                          {msg.images.map((img, imgIndex) => (
                            <img 
                              key={imgIndex}
                              src={img.dataUrl || `data:${img.mimeType};base64,${img.base64}`}
                              alt={img.name || 'Attached image'}
                              style={{
                                maxWidth: '200px',
                                maxHeight: '150px',
                                borderRadius: '8px',
                                objectFit: 'contain',
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {msg.content}
                    </div>
                  ) : (
                    <div 
                      style={{
                        maxWidth: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => {
                        setHoveredMessageId(null);
                        // Close info dropdown when leaving message area
                        if (showInfoDropdown === msg.id) {
                          setShowInfoDropdown(null);
                        }
                      }}
                    >
                      {/* TODO: Sources, Previews, and Tool Calls will be redesigned later */}

                      {/* Reasoning block for reasoning models */}
                      {msg.thinking && (
                        <div>
                          <div
                            onClick={() => setExpandedReasoning(prev => ({
                              ...prev,
                              [msg.id]: !prev[msg.id]
                            }))}
                            style={msg.isStreaming ? {
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              marginBottom: '0.5rem',
                              backgroundImage: 'linear-gradient(90deg, #666 0%, #aaa 50%, #666 100%)',
                              backgroundSize: '200% 100%',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              color: 'transparent',
                              animation: 'shimmer 2s linear infinite'
                            } : {
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              marginBottom: '0.5rem',
                              color: '#888',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!msg.isStreaming) e.currentTarget.style.color = '#bbb';
                            }}
                            onMouseLeave={(e) => {
                              if (!msg.isStreaming) e.currentTarget.style.color = '#888';
                            }}
                          >
                            {expandedReasoning[msg.id] ? (
                              <ChevronDown size={16} style={{ color: msg.isStreaming ? '#aaa' : 'inherit', flexShrink: 0 }} />
                            ) : (
                              <ChevronRight size={16} style={{ color: msg.isStreaming ? '#aaa' : 'inherit', flexShrink: 0 }} />
                            )}
                            <span>{msg.isStreaming ? 'Reasoning' : 'Finished Reasoning'}</span>
                          </div>

                          {expandedReasoning[msg.id] && (
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '1rem',
                              background: 'rgba(30, 30, 30, 0.6)',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              color: '#aaa',
                              fontSize: '0.85rem',
                              lineHeight: '1.6',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: 'monospace',
                              maxHeight: msg.isStreaming ? 'none' : '400px',
                              overflowY: msg.isStreaming ? 'visible' : 'auto'
                            }}>
                              {msg.thinking}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Thinking indicator for non-reasoning models (not for image generation) */}
                      {msg.isStreaming && !msg.thinking && !msg.content && !msg.isGenerating && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            backgroundImage: 'linear-gradient(90deg, #666 0%, #aaa 50%, #666 100%)',
                            backgroundSize: '200% 100%',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent',
                            animation: 'shimmer 2s linear infinite'
                          }}
                        >
                          <span>Thinking</span>
                        </div>
                      )}
                      {/* Content - always show if there's content, even while streaming */}
                      {msg.content && (
                        <div style={{ lineHeight: '1.6', color: '#e0e0e0' }}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              code: ({ node, className, children, ...props }) => {
                                const codeContent = String(children).replace(/\n$/, '');
                                const language = className?.replace('language-', '') || '';
                                
                                // Check for chart code blocks
                                if (language === 'chart' || language === 'graph') {
                                  try {
                                    return <ChartRenderer config={codeContent} />;
                                  } catch (e) {
                                    // Fall through to regular code block
                                  }
                                }
                                
                                // Check if it's inline code (no newlines, short content, no language)
                                const isInline = !className && !codeContent.includes('\n') && codeContent.length < 100;
                                
                                return isInline ? (
                                  <code style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.9em',
                                    fontFamily: 'ui-monospace, monospace',
                                    color: '#f0f0f0'
                                  }} {...props}>{children}</code>
                                ) : (
                                  <code className={className} style={{
                                    display: 'block',
                                    background: 'rgba(30, 30, 30, 0.6)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    overflowX: 'auto',
                                    fontSize: '0.85rem',
                                    fontFamily: 'ui-monospace, monospace',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                  }} {...props}>{children}</code>
                                );
                              },
                              pre: ({ children }) => <div style={{ margin: '0.5rem 0' }}>{children}</div>,
                              p: ({ children }) => <p style={{ margin: '0.5rem 0', lineHeight: '1.6' }}>{children}</p>,
                              ul: ({ children }) => <ul style={{ marginLeft: '1.5rem', margin: '0.5rem 0' }}>{children}</ul>,
                              ol: ({ children }) => <ol style={{ marginLeft: '1.5rem', margin: '0.5rem 0' }}>{children}</ol>,
                              li: ({ children }) => <li style={{ margin: '0.25rem 0' }}>{children}</li>,
                              a: ({ children, href }) => <a href={href} style={{ color: '#6ea8fe', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">{children}</a>,
                              blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #555', paddingLeft: '1rem', margin: '0.5rem 0', color: '#aaa' }}>{children}</blockquote>,
                              h1: ({ children }) => <h1 style={{ fontSize: '1.5rem', fontWeight: '600', margin: '1rem 0 0.5rem' }}>{children}</h1>,
                              h2: ({ children }) => <h2 style={{ fontSize: '1.3rem', fontWeight: '600', margin: '1rem 0 0.5rem' }}>{children}</h2>,
                              h3: ({ children }) => <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0.75rem 0 0.5rem' }}>{children}</h3>,
                              table: ({ children }) => <table style={{ borderCollapse: 'collapse', margin: '0.5rem 0', width: '100%' }}>{children}</table>,
                              th: ({ children }) => <th style={{ border: '1px solid #555', padding: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>{children}</th>,
                              td: ({ children }) => <td style={{ border: '1px solid #555', padding: '0.5rem' }}>{children}</td>,
                              img: ({ src, alt }) => (
                                <img 
                                  src={src} 
                                  alt={alt || 'Image'} 
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '300px',
                                    borderRadius: '8px',
                                    margin: '0.5rem 0',
                                    objectFit: 'contain',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                  }}
                                  loading="lazy"
                                />
                              )
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      {/* Generated Image Display */}
                      {msg.generatedImage && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <img 
                            src={msg.generatedImage.dataUrl}
                            alt="Generated image"
                            onClick={() => setFullscreenImage(msg.generatedImage.dataUrl)}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '512px',
                              borderRadius: '12px',
                              border: '1px solid rgba(255,255,255,0.1)',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                              cursor: 'pointer',
                              transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.02)';
                              e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,0,0,0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                            }}
                            title="Click to view fullscreen"
                          />
                        </div>
                      )}

                      {/* Action Buttons - Show on hover */}
                      {!msg.isStreaming && !msg.isGenerating && (msg.content || msg.generatedImage) && (
                        <div style={{
                          display: 'flex',
                          gap: '2px',
                          marginTop: '8px',
                          opacity: hoveredMessageId === msg.id ? 1 : 0,
                          transition: 'opacity 0.2s ease',
                          pointerEvents: hoveredMessageId === msg.id ? 'auto' : 'none'
                        }}>
                          {/* Copy Button */}
                          <button
                            onClick={async () => {
                              const success = await handleCopyMessage(msg.content || '');
                              if (success) {
                                setCopiedMessageId(msg.id);
                                setTimeout(() => setCopiedMessageId(null), 2000);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: copiedMessageId === msg.id ? '#4ade80' : '#666',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = copiedMessageId === msg.id ? '#4ade80' : '#aaa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = copiedMessageId === msg.id ? '#4ade80' : '#666';
                            }}
                            title="Copy message"
                          >
                            {copiedMessageId === msg.id ? <Check size={16} /> : <Copy size={16} />}
                          </button>

                          {/* Info Button with Dropdown */}
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={(e) => {
                                if (showInfoDropdown === msg.id) {
                                  setShowInfoDropdown(null);
                                } else {
                                  // Calculate if dropdown should open above or below
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  // Dropdown is roughly 300px tall, prefer below if enough space
                                  setInfoDropdownPosition(spaceBelow > 320 || spaceBelow > spaceAbove ? 'below' : 'above');
                                  setShowInfoDropdown(msg.id);
                                }
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: showInfoDropdown === msg.id ? '#aaa' : '#666',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#aaa';
                              }}
                              onMouseLeave={(e) => {
                                if (showInfoDropdown !== msg.id) {
                                  e.currentTarget.style.color = '#666';
                                }
                              }}
                              title="Message info"
                            >
                              <Info size={16} />
                            </button>

                            {/* Info Dropdown */}
                            {showInfoDropdown === msg.id && (
                              <>
                                <div 
                                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                                  onClick={() => setShowInfoDropdown(null)}
                                />
                                <div style={{
                                  position: 'absolute',
                                  ...(infoDropdownPosition === 'above' 
                                    ? { bottom: '100%', marginBottom: '4px' } 
                                    : { top: '100%', marginTop: '4px' }),
                                  left: '0',
                                  background: '#1e1e1e',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px',
                                  padding: '10px 14px',
                                  zIndex: 100,
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                }}>
                                  <table style={{ 
                                    borderCollapse: 'collapse', 
                                    fontSize: '0.72rem', 
                                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                                    lineHeight: '1.4'
                                  }}>
                                    <tbody>
                                      {/* Model */}
                                      {msg.model && (
                                        <tr>
                                          <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>model:</td>
                                          <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.model.split('/').pop()}</td>
                                        </tr>
                                      )}
                                      {/* Total Duration */}
                                      {msg.stats?.total_duration && (
                                        <tr>
                                          <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>total duration:</td>
                                          <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.total_duration / 1e9).toFixed(2)}s</td>
                                        </tr>
                                      )}
                                      {/* Load Duration */}
                                      {msg.stats?.load_duration && (
                                        <tr>
                                          <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>load duration:</td>
                                          <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.load_duration / 1e6).toFixed(2)}ms</td>
                                        </tr>
                                      )}
                                      {/* Prompt Eval */}
                                      {msg.stats?.prompt_eval_count && (
                                        <>
                                          <tr>
                                            <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>prompt eval count:</td>
                                            <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.stats.prompt_eval_count} token(s)</td>
                                          </tr>
                                          {msg.stats.prompt_eval_duration && (
                                            <tr>
                                              <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>prompt eval duration:</td>
                                              <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.prompt_eval_duration / 1e6).toFixed(2)}ms</td>
                                            </tr>
                                          )}
                                          {msg.stats.prompt_eval_duration && (
                                            <tr>
                                              <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>prompt eval rate:</td>
                                              <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.prompt_eval_count / (msg.stats.prompt_eval_duration / 1e9)).toFixed(2)} tokens/s</td>
                                            </tr>
                                          )}
                                        </>
                                      )}
                                      {/* Eval */}
                                      {msg.stats?.eval_count && (
                                        <>
                                          <tr>
                                            <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>eval count:</td>
                                            <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.stats.eval_count} token(s)</td>
                                          </tr>
                                          {msg.stats.eval_duration && (
                                            <tr>
                                              <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>eval duration:</td>
                                              <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.eval_duration / 1e6).toFixed(2)}ms</td>
                                            </tr>
                                          )}
                                          <tr>
                                            <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>eval rate:</td>
                                            <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                              {msg.stats.eval_rate 
                                                ? `${msg.stats.eval_rate} tokens/s`
                                                : msg.stats.eval_duration 
                                                  ? `${(msg.stats.eval_count / (msg.stats.eval_duration / 1e9)).toFixed(2)} tokens/s`
                                                  : 'N/A'}
                                            </td>
                                          </tr>
                                        </>
                                      )}
                                      {/* Fallback */}
                                      {!msg.stats?.total_duration && !msg.stats?.eval_count && (
                                        <>
                                          <tr>
                                            <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>tokens (est.):</td>
                                            <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.content ? Math.ceil(msg.content.length / 4) : 0}</td>
                                          </tr>
                                          <tr>
                                            <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>characters:</td>
                                            <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.content?.length || 0}</td>
                                          </tr>
                                        </>
                                      )}
                                      {/* Reasoning */}
                                      {msg.thinking && (
                                        <tr>
                                          <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>reasoning:</td>
                                          <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.thinking.length} chars</td>
                                        </tr>
                                      )}
                                      {/* Sources */}
                                      {msg.sources && msg.sources.length > 0 && (
                                        <tr>
                                          <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>sources:</td>
                                          <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.sources.length}</td>
                                        </tr>
                                      )}
                                      {/* Tool Calls */}
                                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                                        <tr>
                                          <td style={{ color: '#888', paddingRight: '20px', whiteSpace: 'nowrap' }}>tool calls:</td>
                                          <td style={{ color: '#e0e0e0', textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.toolCalls.length}</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Regenerate Button */}
                          <button
                            onClick={() => handleRegenerate(i)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#666',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#aaa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#666';
                            }}
                            title="Regenerate response"
                          >
                            <RotateCcw size={16} />
                          </button>
                        </div>
                      )}
                      {/* Image Generation Loading Indicator - Copilot style blur reveal */}
                      {msg.isGenerating && (
                        <div>
                          {/* Progress indicator like Reasoning */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              marginBottom: '0.5rem',
                              backgroundImage: 'linear-gradient(90deg, #666 0%, #aaa 50%, #666 100%)',
                              backgroundSize: '200% 100%',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              color: 'transparent',
                              animation: 'shimmer 2s linear infinite'
                            }}
                          >
                            <Image size={16} style={{ color: '#aaa' }} />
                            <span>{imageGenProgress || 'Generating image...'}</span>
                          </div>
                          {/* Image placeholder */}
                          <div style={{
                            width: '320px',
                            height: '320px',
                            borderRadius: '12px',
                            background: '#1a1a1c',
                            border: '1px solid rgba(255,255,255,0.1)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            {/* Animated gradient background */}
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(135deg, #2a2a2e 0%, #1a1a1c 50%, #2a2a2e 100%)',
                              backgroundSize: '200% 200%',
                              animation: 'shimmer-bg 3s ease-in-out infinite'
                            }} />
                            {/* Noise texture overlay */}
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                              opacity: 0.1,
                              mixBlendMode: 'overlay'
                            }} />
                          </div>
                          <style>{`
                            @keyframes shimmer-bg {
                              0%, 100% { background-position: 0% 50%; }
                              50% { background-position: 100% 50%; }
                            }
                          `}</style>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {inputBox}
        </>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          onClick={() => setFullscreenImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            backdropFilter: 'blur(10px)'
          }}
        >
          <img
            src={fullscreenImage}
            alt="Fullscreen view"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 0 60px rgba(0,0,0,0.8)',
              cursor: 'default'
            }}
          />
          {/* Close button */}
          <button
            onClick={() => setFullscreenImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '24px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            ×
          </button>
          {/* Hint text */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.85rem'
          }}>
            Click anywhere or press ESC to close
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
