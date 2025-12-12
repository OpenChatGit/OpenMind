import { useState, useCallback, useEffect, useRef } from 'react';
import { Paperclip, ArrowUp, ChevronDown, ChevronRight, Radar, Image, Copy, Info, RotateCcw, Check, Terminal, Square, ExternalLink, Minimize2, X, GripHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import ChartRenderer from './ChartRenderer';
import XTerminal from './XTerminal';
import { useTheme } from '../contexts/ThemeContext';

const ChatArea = ({ activeChatId, messages, onUpdateMessages, onFirstMessage, inferenceSettings }) => {
  const { theme, isDark } = useTheme();
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('selectedModel') || '';
  });
  const [availableModels, setAvailableModels] = useState([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState({});
  const [expandedToolCalls, setExpandedToolCalls] = useState({});
  const [deepSearchEnabled, setDeepSearchEnabled] = useState(() => {
    const saved = localStorage.getItem('deepSearchEnabled');
    return saved === 'true';
  });
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [isWebSearching, setIsWebSearching] = useState(false); // Currently executing web_search tool
  const [isReasoning, setIsReasoning] = useState(false); // Currently in reasoning phase (before content)
  const [searchedFavicons, setSearchedFavicons] = useState([]); // Favicons from searched sites
  const searchedFaviconsRef = useRef([]); // Ref to track current favicons for saving
  const [searchSources, setSearchSources] = useState([]); // URLs from web search
  const [currentSources, setCurrentSources] = useState([]); // Sources for current streaming message
  const [currentPreviews, setCurrentPreviews] = useState([]); // Preview images/cards
  const [currentToolCalls, setCurrentToolCalls] = useState([]); // Live tool calls during DeepSearch
  const [attachedImages, setAttachedImages] = useState([]); // Images attached to current message
  const [imageGenEnabled, setImageGenEnabled] = useState(false); // Image generation mode
  const [isGeneratingImage, setIsGeneratingImage] = useState(false); // Currently generating
  const [diffusionModels, setDiffusionModels] = useState([]); // Available diffusion models
  const [selectedImageModel, setSelectedImageModel] = useState(''); // Selected image gen model

  const [hoveredMessageId, setHoveredMessageId] = useState(null); // Track hovered message for action buttons
  const [hoveredReasoningId, setHoveredReasoningId] = useState(null); // Track hovered reasoning block for favicon animation
  const [copiedMessageId, setCopiedMessageId] = useState(null); // Track which message was copied
  const [showInfoDropdown, setShowInfoDropdown] = useState(null); // Track which message info dropdown is open
  const [infoDropdownPosition, setInfoDropdownPosition] = useState('below'); // 'above' or 'below'
  const [fullscreenImage, setFullscreenImage] = useState(null); // Fullscreen image modal

  // Terminal mode state - now using real PTY terminal
  const [terminalMode, setTerminalMode] = useState(false);
  const [terminalPopout, setTerminalPopout] = useState(false); // Floating terminal window
  const [terminalPosition, setTerminalPosition] = useState({ x: 100, y: 100 });
  const [terminalSize, setTerminalSize] = useState({ width: 600, height: 350 });
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [downloadProgress, setDownloadProgress] = useState(0); // 0-100 for glow effect

  // Zoom level for accessibility (Ctrl + scroll wheel)
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('chat-zoom-level');
    return saved ? parseFloat(saved) : 1;
  });

  // Typewriter effect state
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  
  const isNewChat = !activeChatId || messages.length === 0;

  // Typewriter effect - only runs when new chat is active
  useEffect(() => {
    if (!isNewChat) return; // Don't run when chat is active
    
    const phrases = [
      'What can I help you with?',
      'Ask me anything...',
      'Need help with code?',
      'Let\'s brainstorm ideas...',
      'Ask about the weather...',
      'Explain a concept...',
      'Write something creative...'
    ];
    
    const phrase = phrases[typewriterIndex % phrases.length];
    let charIndex = 0;
    let isDeleting = false;
    let timeout;

    const type = () => {
      if (!isDeleting) {
        setTypewriterText(phrase.substring(0, charIndex + 1));
        charIndex++;
        if (charIndex === phrase.length) {
          timeout = setTimeout(() => {
            isDeleting = true;
            type();
          }, 2000);
          return;
        }
        timeout = setTimeout(type, 80);
      } else {
        setTypewriterText(phrase.substring(0, charIndex));
        charIndex--;
        if (charIndex === 0) {
          isDeleting = false;
          setTypewriterIndex((prev) => (prev + 1) % phrases.length);
          return;
        }
        timeout = setTimeout(type, 40);
      }
    };

    type();
    return () => clearTimeout(timeout);
  }, [typewriterIndex, isNewChat]);

  // Save zoom level to localStorage
  useEffect(() => {
    localStorage.setItem('chat-zoom-level', zoomLevel.toString());
  }, [zoomLevel]);

  // Save deepSearch preference to localStorage
  useEffect(() => {
    localStorage.setItem('deepSearchEnabled', deepSearchEnabled.toString());
  }, [deepSearchEnabled]);

  // Save selected model to localStorage
  useEffect(() => {
    if (selectedModel && selectedModel !== 'No Models Found') {
      localStorage.setItem('selectedModel', selectedModel);
    }
  }, [selectedModel]);

  // Auto-collapse reasoning block when reasoning finishes
  useEffect(() => {
    if (!isReasoning && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.isStreaming && lastMessage?.role === 'assistant') {
        // Collapse the reasoning block for the current streaming message
        setExpandedReasoning(prev => ({
          ...prev,
          [lastMessage.id]: false
        }));
      }
    }
  }, [isReasoning, messages]);

  // Ctrl + scroll wheel to zoom
  const chatContainerRef = useRef(null);
  
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoomLevel(prev => {
          const newZoom = Math.min(2, Math.max(0.5, prev + delta));
          return Math.round(newZoom * 10) / 10; // Round to 1 decimal
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Reset zoom with Ctrl+0
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setZoomLevel(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ESC key to close fullscreen image or popout terminal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (fullscreenImage) setFullscreenImage(null);
        if (terminalPopout) setTerminalPopout(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, terminalPopout]);

  // Terminal drag handlers
  const handleTerminalDragStart = (e) => {
    if (e.target.closest('.terminal-resize-handle')) return;
    setIsDraggingTerminal(true);
    setDragOffset({
      x: e.clientX - terminalPosition.x,
      y: e.clientY - terminalPosition.y
    });
  };

  const handleTerminalDrag = (e) => {
    if (!isDraggingTerminal) return;
    setTerminalPosition({
      x: Math.max(0, e.clientX - dragOffset.x),
      y: Math.max(0, e.clientY - dragOffset.y)
    });
  };

  const handleTerminalDragEnd = () => {
    setIsDraggingTerminal(false);
  };

  // Terminal resize handlers
  const handleTerminalResizeStart = (e) => {
    e.stopPropagation();
    setIsResizingTerminal(true);
  };

  const handleTerminalResize = (e) => {
    if (!isResizingTerminal) return;
    const newWidth = Math.max(400, e.clientX - terminalPosition.x);
    const newHeight = Math.max(200, e.clientY - terminalPosition.y);
    setTerminalSize({ width: newWidth, height: newHeight });
  };

  const handleTerminalResizeEnd = () => {
    setIsResizingTerminal(false);
  };

  // Global mouse handlers for drag/resize
  useEffect(() => {
    if (isDraggingTerminal) {
      // Set cursor to default globally while dragging
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'none';
      
      window.addEventListener('mousemove', handleTerminalDrag);
      window.addEventListener('mouseup', handleTerminalDragEnd);
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleTerminalDrag);
        window.removeEventListener('mouseup', handleTerminalDragEnd);
      };
    }
  }, [isDraggingTerminal, dragOffset]);

  useEffect(() => {
    if (isResizingTerminal) {
      // Set cursor to default globally while resizing
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'none';
      
      window.addEventListener('mousemove', handleTerminalResize);
      window.addEventListener('mouseup', handleTerminalResizeEnd);
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleTerminalResize);
        window.removeEventListener('mouseup', handleTerminalResizeEnd);
      };
    }
  }, [isResizingTerminal, terminalPosition]);


  
  


  const fetchModels = useCallback(async () => {
    // Fetch Ollama models
    if (window.electronAPI?.getOllamaModels) {
      const models = await window.electronAPI.getOllamaModels();
      if (models && models.length > 0) {
        const modelNames = models.map(m => m.name);
        setAvailableModels(modelNames);
        // Check if saved model is still available, otherwise use first available
        setSelectedModel(prev => {
          if (!prev || prev === 'No Models Found') {
            return modelNames[0];
          }
          // If saved model is not in available models, use first one
          if (!modelNames.includes(prev)) {
            return modelNames[0];
          }
          return prev;
        });
      } else {
        setAvailableModels([]);
        setSelectedModel(prev => prev || 'No Models Found');
      }
    }
    
  }, []); // No dependencies - only runs on mount and when explicitly called


  useEffect(() => {
    fetchModels();
    
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
        // Track web search status for UI indicator
        if (data.tool === 'web_search') {
          if (data.status === 'executing') {
            setIsWebSearching(true);
          }
          // Note: setIsWebSearching(false) is called AFTER favicons are set below
        }
        
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
        
        // Track sources, favicons and previews from web search
        if (data.tool === 'web_search' && data.status === 'complete' && data.result?.results) {
          const results = data.result.results;
          const urls = results.filter(r => r.url).map(r => r.url);
          setSearchSources(prev => [...new Set([...prev, ...urls])]);
          setCurrentSources(prev => [...new Set([...prev, ...urls])]);
          
          // Extract favicons from URLs (max 6, deduplicated by domain)
          const seenDomains = new Set();
          const favicons = urls
            .map(url => {
              try {
                const hostname = new URL(url).hostname;
                if (seenDomains.has(hostname)) return null;
                seenDomains.add(hostname);
                return {
                  url: url,
                  domain: hostname
                };
              } catch {
                return null;
              }
            })
            .filter(Boolean)
            .slice(0, 6);
          
          setSearchedFavicons(prev => {
            const existing = new Set(prev.map(f => f.domain));
            const newFavicons = favicons.filter(f => !existing.has(f.domain));
            const updated = [...prev, ...newFavicons].slice(0, 6);
            searchedFaviconsRef.current = updated; // Keep ref in sync
            return updated;
          });
          
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
          
          // Set isWebSearching to false AFTER favicons are set
          setIsWebSearching(false);
        }
      });
    }
  }, [fetchModels]);

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

  // Listen for terminal download progress (ollama pull)
  useEffect(() => {
    if (window.electronAPI?.onOllamaTerminalProgress) {
      window.electronAPI.onOllamaTerminalProgress((data) => {
        if (data.done) {
          // Reset progress immediately when done
          setDownloadProgress(0);
        } else if (data.percent !== undefined && data.percent > 0) {
          setDownloadProgress(data.percent);
        }
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
    setIsReasoning(true); // Start in reasoning phase

    const thinkingListener = (thinking) => {
      currentThinking = thinking;
      setIsReasoning(true); // Still reasoning while thinking updates come in
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
      if (content) setIsReasoning(false); // Reasoning done when content starts
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
      if (deepSearchEnabled) {
        // DeepSearch mode with tool use (includes web search, file search, etc.)
        setIsDeepSearching(true);
        setIsWebSearching(false);
        setSearchSources([]); // Reset sources for new search
        setCurrentSources([]); // Reset current sources
        setCurrentPreviews([]); // Reset previews for new search
        setSearchedFavicons([]); // Reset favicons for new search
        searchedFaviconsRef.current = []; // Reset ref too
        setCurrentToolCalls([]); // Reset tool calls for new search
        setExpandedToolCalls(prev => ({ ...prev, [assistantMessageId]: true })); // Auto-expand tool calls
        setExpandedReasoning(prev => ({ ...prev, [assistantMessageId]: true })); // Auto-expand reasoning during DeepSearch
        
        // Extract URLs from user message and show their favicons immediately
        const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
        const urlsInMessage = inputText.match(urlRegex) || [];
        if (urlsInMessage.length > 0) {
          setIsWebSearching(true); // Show "Searching Web" when URLs are present
          const urlFavicons = urlsInMessage.slice(0, 6).map(url => {
            try {
              const hostname = new URL(url).hostname;
              return { url, domain: hostname };
            } catch {
              return null;
            }
          }).filter(Boolean);
          if (urlFavicons.length > 0) {
            setSearchedFavicons(urlFavicons);
            searchedFaviconsRef.current = urlFavicons;
          }
        }
        
        response = await window.electronAPI.sendDeepSearchMessage(selectedModel, newMessages);
        setIsDeepSearching(false);
        setIsReasoning(false);
      } else {
        // Normal streaming mode (Local Ollama)
        response = await window.electronAPI.sendOllamaMessage(selectedModel, newMessages);
      }
      
      // Use the streamed values to avoid flicker
      // Use ref for favicons to get the current value (state might be stale in callback)
      const finalFavicons = searchedFaviconsRef.current;
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent || response.content,
        thinking: currentThinking || response.thinking,
        sources: deepSearchEnabled ? [...currentSources] : [], // Include search sources
        favicons: deepSearchEnabled ? [...finalFavicons] : [], // Include favicons for hover display
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
      setSearchedFavicons([]); // Clear favicons after saving
      searchedFaviconsRef.current = []; // Clear ref too
      setIsReasoning(false); // Reset reasoning state
      

    } catch (error) {
      console.error('Inference error:', error);
      setIsDeepSearching(false);
      setIsReasoning(false);
      
      // Build helpful error message
      const errorMsg = 'Error: Could not connect to Ollama. Is it running?';
      
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: errorMsg,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: false
      }]);
    }
  }, [input, selectedModel, activeChatId, messages, onUpdateMessages, onFirstMessage, deepSearchEnabled, attachedImages]);

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
    setIsReasoning(true); // Start in reasoning phase

    const thinkingListener = (thinking) => {
      currentThinking = thinking;
      setIsReasoning(true); // Still reasoning
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
      if (content) setIsReasoning(false); // Reasoning done when content starts
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
      // Use the correct API based on provider
      if (deepSearchEnabled) {
        setIsDeepSearching(true);
        setIsWebSearching(false);
        setIsReasoning(true);
        setSearchSources([]);
        setCurrentSources([]);
        setCurrentPreviews([]);
        setSearchedFavicons([]);
        searchedFaviconsRef.current = [];
        setCurrentToolCalls([]);
        response = await window.electronAPI.sendDeepSearchMessage(selectedModel, newMessages);
        setIsDeepSearching(false);
        setIsReasoning(false);
      } else {
        response = await window.electronAPI.sendOllamaMessage(selectedModel, newMessages);
      }
      
      onUpdateMessages(activeChatId, [...newMessages, {
        role: 'assistant',
        content: currentContent || response.content,
        thinking: currentThinking || response.thinking,
        sources: deepSearchEnabled ? [...currentSources] : [],
        favicons: deepSearchEnabled ? [...searchedFaviconsRef.current] : [],
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
      setSearchedFavicons([]);
      searchedFaviconsRef.current = [];
    } catch (error) {
      console.error('Regenerate error:', error);
      setIsDeepSearching(false);
      setIsReasoning(false);
      
      // Build helpful error message
      const errorMsg = error?.message ? `Error: ${error.message}` : 'Error: Could not regenerate response.';
      
      onUpdateMessages(activeChatId, [...newMessages, {
        role: 'assistant',
        content: errorMsg,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: false
      }]);
    }
  }, [selectedModel, activeChatId, messages, onUpdateMessages, deepSearchEnabled, currentSources, currentToolCalls, currentPreviews]);

  const inputBox = (
    <div style={{
      width: '100%',
      background: theme.bgSecondary,
      borderRadius: '20px',
      padding: '16px',
      boxShadow: downloadProgress > 0 
        ? `0 0 ${10 + downloadProgress * 0.3}px rgba(${isDark ? '255,255,255' : '0,0,0'}, ${0.1 + downloadProgress * 0.004}), inset 0 0 ${downloadProgress * 0.5}px rgba(${isDark ? '255,255,255' : '0,0,0'}, 0.05)`
        : (isNewChat 
          ? (isDark ? '0 0 20px rgba(255, 255, 255, 0.04)' : '0 0 20px rgba(0,0,0,0.06)')
          : 'none'),
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      border: downloadProgress > 0
        ? `1px solid rgba(${isDark ? '255,255,255' : '0,0,0'}, ${0.2 + downloadProgress * 0.005})`
        : (isNewChat ? `1px solid ${theme.border}` : 'none'),
      transition: 'box-shadow 0.3s ease, border 0.3s ease',
      position: 'relative'
    }}>
      {/* Download progress bar */}
      {downloadProgress > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          borderRadius: '0 0 20px 20px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${downloadProgress}%`,
            background: isDark 
              ? 'linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.6))'
              : 'linear-gradient(90deg, rgba(0,0,0,0.2), rgba(0,0,0,0.4))',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
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

        {/* Input area - terminal is persistent, just hidden when not active */}
        {/* Terminal - inline mode (not popped out) */}
        {!terminalPopout && (
          <XTerminal isDark={isDark} height={120} isVisible={terminalMode} />
        )}
        
        {/* Normal chat input - hidden when terminal is active */}
        {!terminalMode && (
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
            placeholder={
              imageGenEnabled 
                ? "Describe the image you want to generate..." 
                : (attachedImages.length > 0 ? "Ask about the image(s)..." : "Message AI")
            }
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: theme.text,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: '1rem',
              height: '40px',
              minHeight: '40px'
            }}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Attach Button - expands on hover */}
            <button 
              className="expandable-btn"
              onClick={handleAttachImages}
              style={{
                background: attachedImages.length > 0 ? (isDark ? '#fff' : '#1a1a1a') : 'transparent',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                color: attachedImages.length > 0 ? (isDark ? '#000' : '#fff') : theme.textSecondary,
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

            {/* DeepSearch Button - expands on hover, rotating glow when active */}
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
                  background: deepSearchEnabled ? (isDark ? '#fff' : '#1a1a1a') : (isDark ? '#2c2c2e' : '#f3f4f6'),
                  border: isDeepSearching ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                  color: deepSearchEnabled ? (isDark ? '#000' : '#fff') : theme.textSecondary,
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
                    e.currentTarget.style.background = isDeepSearching ? (isDark ? '#2c2c2e' : '#f3f4f6') : 'transparent';
                    e.currentTarget.style.color = theme.textSecondary;
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

            {/* Image Generation Button */}
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
                  background: imageGenEnabled ? (isDark ? '#fff' : '#1a1a1a') : (isGeneratingImage ? (isDark ? '#2c2c2e' : '#f3f4f6') : 'transparent'),
                  border: isGeneratingImage ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                  color: imageGenEnabled ? (isDark ? '#000' : '#fff') : theme.textSecondary,
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
                    e.currentTarget.style.background = isGeneratingImage ? (isDark ? '#2c2c2e' : '#f3f4f6') : 'transparent';
                    e.currentTarget.style.color = theme.textSecondary;
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
                    style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                    onClick={() => setIsModelMenuOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '8px',
                    background: theme.bgSecondary,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '12px',
                    padding: '4px',
                    minWidth: '200px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    backdropFilter: 'blur(10px)'
                  }}>
                    {imageGenEnabled ? (
                      // Image Generation Models
                      <>
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
                                color: selectedImageModel === model.name ? theme.text : theme.textSecondary,
                                background: selectedImageModel === model.name ? theme.bgActive : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedImageModel !== model.name) {
                                  e.currentTarget.style.background = theme.bgHover;
                                  e.currentTarget.style.color = theme.text;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedImageModel !== model.name) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = theme.textSecondary;
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>{model.name}</span>
                                {selectedImageModel === model.name && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.text }} />}
                              </div>
                              {model.sizeFormatted && (
                                <span style={{ fontSize: '0.7rem', color: theme.textMuted }}>{model.sizeFormatted} • {model.type}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '12px', color: theme.textSecondary, fontSize: '0.85rem', textAlign: 'center' }}>
                            No models in /models folder.<br />
                            <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>Will use SDXL-Turbo from HuggingFace</span>
                          </div>
                        )}
                      </>
                    ) : (
                      // Ollama Models (Local)
                      <>
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
                                color: selectedModel === model ? theme.text : theme.textSecondary,
                                background: selectedModel === model ? theme.bgActive : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedModel !== model) {
                                  e.currentTarget.style.background = theme.bgHover;
                                  e.currentTarget.style.color = theme.text;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedModel !== model) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = theme.textSecondary;
                                }
                              }}
                            >
                              {model}
                              {selectedModel === model && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.text }} />}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '8px 12px', color: theme.textSecondary, fontSize: '0.9rem' }}>
                            No models found. <br /> Is Ollama running?
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Terminal Toggle Button - opens real PTY terminal panel */}
            <button
              onClick={() => setTerminalMode(!terminalMode)}
              style={{
                background: terminalMode 
                  ? (isDark ? 'white' : '#1a1a1a')
                  : 'transparent',
                border: terminalMode 
                  ? 'none'
                  : `2px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                color: terminalMode 
                  ? (isDark ? 'black' : 'white')
                  : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'),
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={terminalMode ? 'Hide Terminal' : 'Open Terminal'}
            >
              <Terminal size={16} />
            </button>

            {/* Popout Terminal Button - only visible in terminal mode */}
            {terminalMode && !terminalPopout && (
              <button
                onClick={() => {
                  setTerminalPopout(true);
                  setTerminalMode(false);
                }}
                style={{
                  background: 'transparent',
                  border: `2px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Pop out terminal"
              >
                <ExternalLink size={14} />
              </button>
            )}

            {/* Kill Terminal Button - only visible in terminal mode */}
            {(terminalMode || terminalPopout) && (
              <button
                onClick={() => {
                  window.electronAPI?.ptyKill?.();
                }}
                style={{
                  background: 'transparent',
                  border: `2px solid ${isDark ? 'rgba(239,68,68,0.5)' : 'rgba(220,38,38,0.5)'}`,
                  color: isDark ? 'rgba(239,68,68,0.8)' : 'rgba(220,38,38,0.8)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.2)' : 'rgba(220,38,38,0.1)';
                  e.currentTarget.style.borderColor = isDark ? 'rgba(239,68,68,0.8)' : 'rgba(220,38,38,0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = isDark ? 'rgba(239,68,68,0.5)' : 'rgba(220,38,38,0.5)';
                }}
                title="Kill Terminal Process"
              >
                <Square size={14} fill="currentColor" />
              </button>
            )}

            <button
              onClick={handleSend}
              style={{
                background: (input.trim() || attachedImages.length > 0) 
                  ? (isDark ? 'white' : '#1a1a1a') 
                  : (isDark ? '#4a4a4a' : '#d1d5db'),
                color: (input.trim() || attachedImages.length > 0) 
                  ? (isDark ? 'black' : 'white') 
                  : '#888',
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

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
    </div>
  );

  return (
    <div 
      ref={chatContainerRef}
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 10,
        overflow: 'hidden'
      }}
    >
      {/* Zoom indicator */}
      {zoomLevel !== 1 && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
          color: theme.text,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          zIndex: 100,
          border: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel(1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textSecondary,
              cursor: 'pointer',
              padding: '0 2px',
              fontSize: '0.7rem'
            }}
            title="Reset zoom (Ctrl+0)"
          >
            ✕
          </button>
        </div>
      )}
      {/* Messages area - always present but empty when new chat */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontSize: `${zoomLevel}rem`,
        lineHeight: 1.6
      }}>
        {isNewChat ? (
          /* Centered welcome content with input */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem',
            gap: '1rem',
            maxWidth: '800px',
            margin: '0 auto',
            width: '100%',
            position: 'relative',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '600',
              color: theme.text,
              textAlign: 'center',
              opacity: 0.9,
              position: 'relative',
              zIndex: 1,
              minHeight: '2.5rem',
              transition: 'opacity 0.3s ease'
            }}>
              {typewriterText}
              <span style={{
                borderRight: `2px solid ${theme.text}`,
                marginLeft: '2px',
                animation: 'blink 1s step-end infinite'
              }} />
              <style>
                {`
                  @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                  }
                `}
              </style>
            </h1>
            <div style={{ width: '100%' }}>
              {inputBox}
            </div>
          </div>
        ) : (
          /* Chat messages */
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
                      background: theme.userMessageBg,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
                      lineHeight: '1.5',
                      color: theme.text
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

                      {/* Reasoning/Web Search block */}
                      {(msg.thinking || (msg.isStreaming && isDeepSearching) || (msg.favicons && msg.favicons.length > 0)) && (
                        <div>
                          <div
                            onClick={() => setExpandedReasoning(prev => ({
                              ...prev,
                              [msg.id]: !prev[msg.id]
                            }))}
                            onMouseEnter={() => setHoveredReasoningId(msg.id)}
                            onMouseLeave={() => setHoveredReasoningId(null)}
                            style={{
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              marginBottom: '0.5rem',
                              color: (msg.isStreaming && (isReasoning || isWebSearching)) ? 'transparent' : (hoveredReasoningId === msg.id ? theme.text : theme.textSecondary),
                              transition: 'color 0.2s',
                              ...((msg.isStreaming && (isReasoning || isWebSearching)) && {
                                backgroundImage: isDark 
                                  ? 'linear-gradient(90deg, #666 0%, #aaa 50%, #666 100%)'
                                  : 'linear-gradient(90deg, #999 0%, #555 50%, #999 100%)',
                                backgroundSize: '200% 100%',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                animation: 'shimmer 2s linear infinite'
                              })
                            }}
                          >
                            {expandedReasoning[msg.id] ? (
                              <ChevronDown size={16} style={{ color: (msg.isStreaming && (isReasoning || isWebSearching)) ? theme.textSecondary : 'inherit', flexShrink: 0 }} />
                            ) : (
                              <ChevronRight size={16} style={{ color: (msg.isStreaming && (isReasoning || isWebSearching)) ? theme.textSecondary : 'inherit', flexShrink: 0 }} />
                            )}
                            <span>
                              {msg.isStreaming 
                                ? (isWebSearching ? 'Searching Web' : (isReasoning ? 'Reasoning' : 'Finished Reasoning'))
                                : 'Finished Reasoning'
                              }
                            </span>
                            
                            {/* Favicons during streaming - always visible when they exist, hidden only when content is being written */}
                            {searchedFavicons.length > 0 && msg.isStreaming && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginLeft: '4px',
                                overflow: 'hidden',
                                maxWidth: (!msg.content || hoveredReasoningId === msg.id) ? '150px' : '0px',
                                opacity: (!msg.content || hoveredReasoningId === msg.id) ? 1 : 0,
                                transition: 'max-width 0.3s ease, opacity 0.3s ease'
                              }}>
                                {searchedFavicons.slice(0, 6).map((fav, idx) => (
                                  <img
                                    key={fav.domain + idx}
                                    src={`https://www.google.com/s2/favicons?domain=${fav.domain}&sz=32`}
                                    alt={fav.domain}
                                    title={fav.domain}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '3px',
                                      opacity: 0.9,
                                      flexShrink: 0
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                            
                            {/* Show saved favicons for completed messages - slide in on hover */}
                            {!msg.isStreaming && msg.favicons && msg.favicons.length > 0 && (
                              <div 
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginLeft: '4px',
                                  overflow: 'hidden',
                                  maxWidth: hoveredReasoningId === msg.id ? '150px' : '0px',
                                  opacity: hoveredReasoningId === msg.id ? 1 : 0,
                                  transition: 'max-width 0.3s ease, opacity 0.3s ease'
                                }}
                              >
                                {msg.favicons.slice(0, 6).map((fav, idx) => (
                                  <img
                                    key={fav.domain + idx}
                                    src={`https://www.google.com/s2/favicons?domain=${fav.domain}&sz=32`}
                                    alt={fav.domain}
                                    title={fav.domain}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '3px',
                                      opacity: 0.9,
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                      transition: 'opacity 0.2s, transform 0.2s'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.electronAPI?.openExternal(fav.url);
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.opacity = 1;
                                      e.target.style.transform = 'scale(1.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.opacity = 0.9;
                                      e.target.style.transform = 'scale(1)';
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {expandedReasoning[msg.id] && msg.thinking && (
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '1rem',
                              background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(0, 0, 0, 0.04)',
                              borderRadius: '8px',
                              border: `1px solid ${theme.border}`,
                              color: theme.textSecondary,
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
                      {/* Thinking indicator for non-reasoning models (not for image generation) - only show when no reasoning block is visible */}
                      {msg.isStreaming && !msg.thinking && !msg.content && !msg.isGenerating && !isDeepSearching && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            backgroundImage: isDark 
                              ? 'linear-gradient(90deg, #666 0%, #aaa 50%, #666 100%)'
                              : 'linear-gradient(90deg, #999 0%, #555 50%, #999 100%)',
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
                        <div style={{ lineHeight: '1.7', color: theme.text }}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
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
                                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                    padding: '0.15em 0.4em',
                                    borderRadius: '4px',
                                    fontSize: '0.9em',
                                    fontFamily: 'ui-monospace, monospace',
                                    color: isDark ? '#f0f0f0' : '#1a1a1a'
                                  }} {...props}>{children}</code>
                                ) : (
                                  <code className={className} style={{
                                    display: 'block',
                                    background: isDark ? 'rgba(30, 30, 30, 0.6)' : '#f6f8fa',
                                    padding: '1em',
                                    borderRadius: '8px',
                                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
                                    overflowX: 'auto',
                                    fontSize: '0.85em',
                                    fontFamily: 'ui-monospace, monospace',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    color: isDark ? '#e0e0e0' : '#24292e'
                                  }} {...props}>{children}</code>
                                );
                              },
                              pre: ({ children }) => <div style={{ margin: '0.5em 0' }}>{children}</div>,
                              p: ({ children }) => <p style={{ margin: '0.5em 0', lineHeight: '1.6' }}>{children}</p>,
                              ul: ({ children }) => <ul style={{ marginLeft: '1.5em', margin: '0.5em 0' }}>{children}</ul>,
                              ol: ({ children }) => <ol style={{ marginLeft: '1.5em', margin: '0.5em 0' }}>{children}</ol>,
                              li: ({ children }) => <li style={{ margin: '0.25em 0' }}>{children}</li>,
                              a: ({ children, href }) => <a href={href} style={{ color: isDark ? '#8ab4f8' : '#1a73e8', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">{children}</a>,
                              blockquote: ({ children }) => <blockquote style={{ borderLeft: `3px solid ${theme.border}`, paddingLeft: '1em', margin: '0.5em 0', color: theme.textSecondary }}>{children}</blockquote>,
                              h1: ({ children }) => <h1 style={{ fontSize: '1.5em', fontWeight: '600', margin: '1em 0 0.5em' }}>{children}</h1>,
                              h2: ({ children }) => <h2 style={{ fontSize: '1.3em', fontWeight: '600', margin: '1em 0 0.5em' }}>{children}</h2>,
                              h3: ({ children }) => <h3 style={{ fontSize: '1.1em', fontWeight: '600', margin: '0.75em 0 0.5em' }}>{children}</h3>,
                              table: ({ children }) => <table style={{ borderCollapse: 'collapse', margin: '0.5em 0', width: '100%' }}>{children}</table>,
                              th: ({ children }) => <th style={{ border: `1px solid ${isDark ? '#555' : '#d0d7de'}`, padding: '0.5em', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>{children}</th>,
                              td: ({ children }) => <td style={{ border: `1px solid ${isDark ? '#555' : '#d0d7de'}`, padding: '0.5em' }}>{children}</td>,
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
                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
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
                                color: showInfoDropdown === msg.id ? theme.textSecondary : theme.textMuted,
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#aaa';
                              }}
                              onMouseLeave={(e) => {
                                if (showInfoDropdown !== msg.id) {
                                  e.currentTarget.style.color = theme.textMuted;
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
                                  background: theme.bgSecondary,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '8px',
                                  padding: '10px 14px',
                                  zIndex: 100,
                                  boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.15)'
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
                                          <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>model:</td>
                                          <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.model.split('/').pop()}</td>
                                        </tr>
                                      )}
                                      {/* Total Duration */}
                                      {msg.stats?.total_duration && (
                                        <tr>
                                          <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>total duration:</td>
                                          <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.total_duration / 1e9).toFixed(2)}s</td>
                                        </tr>
                                      )}
                                      {/* Load Duration */}
                                      {msg.stats?.load_duration && (
                                        <tr>
                                          <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>load duration:</td>
                                          <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.load_duration / 1e6).toFixed(2)}ms</td>
                                        </tr>
                                      )}
                                      {/* Prompt Eval */}
                                      {msg.stats?.prompt_eval_count && (
                                        <>
                                          <tr>
                                            <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>prompt eval count:</td>
                                            <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.stats.prompt_eval_count} token(s)</td>
                                          </tr>
                                          {msg.stats.prompt_eval_duration && (
                                            <tr>
                                              <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>prompt eval duration:</td>
                                              <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.prompt_eval_duration / 1e6).toFixed(2)}ms</td>
                                            </tr>
                                          )}
                                          {msg.stats.prompt_eval_duration && (
                                            <tr>
                                              <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>prompt eval rate:</td>
                                              <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.prompt_eval_count / (msg.stats.prompt_eval_duration / 1e9)).toFixed(2)} tokens/s</td>
                                            </tr>
                                          )}
                                        </>
                                      )}
                                      {/* Eval */}
                                      {msg.stats?.eval_count && (
                                        <>
                                          <tr>
                                            <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>eval count:</td>
                                            <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.stats.eval_count} token(s)</td>
                                          </tr>
                                          {msg.stats.eval_duration && (
                                            <tr>
                                              <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>eval duration:</td>
                                              <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{(msg.stats.eval_duration / 1e6).toFixed(2)}ms</td>
                                            </tr>
                                          )}
                                          <tr>
                                            <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>eval rate:</td>
                                            <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>
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
                                            <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>tokens (est.):</td>
                                            <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.content ? Math.ceil(msg.content.length / 4) : 0}</td>
                                          </tr>
                                          <tr>
                                            <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>characters:</td>
                                            <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.content?.length || 0}</td>
                                          </tr>
                                        </>
                                      )}
                                      {/* Reasoning */}
                                      {msg.thinking && (
                                        <tr>
                                          <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>reasoning:</td>
                                          <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.thinking.length} chars</td>
                                        </tr>
                                      )}
                                      {/* Sources */}
                                      {msg.sources && msg.sources.length > 0 && (
                                        <tr>
                                          <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>sources:</td>
                                          <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.sources.length}</td>
                                        </tr>
                                      )}
                                      {/* Tool Calls */}
                                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                                        <tr>
                                          <td style={{ color: theme.textSecondary, paddingRight: '20px', whiteSpace: 'nowrap' }}>tool calls:</td>
                                          <td style={{ color: theme.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{msg.toolCalls.length}</td>
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
                            <Image size={16} style={{ color: theme.textSecondary }} />
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
        )}
      </div>

      {/* Input box - only at bottom when chat is active */}
      {!isNewChat && (
        <div style={{
          padding: '1.5rem',
          paddingBottom: '2rem',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {inputBox}
        </div>
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

      {/* Floating Terminal Window */}
      {terminalPopout && (
        <div
          style={{
            position: 'fixed',
            left: terminalPosition.x,
            top: terminalPosition.y,
            width: terminalSize.width,
            height: terminalSize.height,
            background: '#0d0d0d',
            borderRadius: '8px 8px 0 0',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            userSelect: (isDraggingTerminal || isResizingTerminal) ? 'none' : 'auto',
            cursor: isDraggingTerminal ? 'default' : 'auto'
          }}
        >
          {/* Compact Title Bar */}
          <div
            onMouseDown={handleTerminalDragStart}
            style={{
              padding: '4px 8px',
              background: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: isDraggingTerminal ? 'default' : 'grab',
              borderRadius: '8px 8px 0 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={12} style={{ color: '#4CAF50' }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: 500 }}>
                Terminal
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {/* Dock back button */}
              <button
                onClick={() => {
                  setTerminalPopout(false);
                  setTerminalMode(true);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: '3px',
                  borderRadius: '3px',
                  display: 'flex'
                }}
                title="Dock to input area"
              >
                <Minimize2 size={12} />
              </button>
              {/* Close button */}
              <button
                onClick={() => {
                  setTerminalPopout(false);
                  setTerminalMode(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: '3px',
                  borderRadius: '3px',
                  display: 'flex'
                }}
                title="Close terminal"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Terminal Content - no border, no rounding */}
          <div style={{ flex: 1, overflow: 'hidden', background: '#0d0d0d' }}>
            <XTerminal isDark={true} height={terminalSize.height - 28} isVisible={true} />
          </div>

          {/* Resize Handle */}
          <div
            className="terminal-resize-handle"
            onMouseDown={handleTerminalResizeStart}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: '20px',
              height: '20px',
              cursor: isResizingTerminal ? 'default' : 'nwse-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.3 }}>
              <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChatArea;
