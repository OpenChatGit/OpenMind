import { useState, useCallback, useEffect, useRef } from 'react';
import { Paperclip, ArrowUp, ChevronDown, Radar, Mic, Loader2, Volume2, VolumeX } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ImageGenButton from './ImageGenButton';
import { useTheme } from '../contexts/ThemeContext';
import { useModelManager, useDeepSearchPlugin, useImageGenPlugin } from '../hooks';

const ChatArea = ({ activeChatId, messages, onUpdateMessages, onFirstMessage, inferenceSettings, currentUser }) => {
  const { theme, isDark } = useTheme();
  const [input, setInput] = useState('');
  
  // Use extracted hooks for model management
  const {
    selectedModel, setSelectedModel,
    availableModels, setAvailableModels,
    isModelMenuOpen, setIsModelMenuOpen,
    fetchModels, hasValidModel
  } = useModelManager();
  
  // Image Generation Plugin (optional - only active when plugin is enabled)
  const {
    enabled: imageGenEnabled,
    setEnabled: setImageGenEnabled,
    isGenerating: isGeneratingImage,
    models: diffusionModels,
    selectedModel: selectedImageModel,
    selectModel: setSelectedImageModel,
    progress: imageGenProgress,
    generate: handleGenerateImage,
    loadModels: loadDiffusionModels,
    pluginLoaded: imageGenPluginLoaded,
  } = useImageGenPlugin();
  
  // DeepSearch Plugin (optional - only active when plugin is enabled)
  const {
    deepSearchEnabled, setDeepSearchEnabled,
    isDeepSearching, setIsDeepSearching,
    isWebSearching, setIsWebSearching,
    isReasoning, setIsReasoning,
    searchedFavicons, setSearchedFavicons,
    searchedFaviconsRef,
    searchSources, setSearchSources,
    currentSources, setCurrentSources,
    currentPreviews, setCurrentPreviews,
    currentToolCalls, setCurrentToolCalls,
    resetDeepSearchState, clearTempState,
    pluginLoaded: deepSearchPluginLoaded,
  } = useDeepSearchPlugin();
  
  const [expandedReasoning, setExpandedReasoning] = useState({});
  const [expandedToolCalls, setExpandedToolCalls] = useState({});
  const [attachedImages, setAttachedImages] = useState([]);
  const [fullscreenImage, setFullscreenImage] = useState(null); // Fullscreen image modal
  const [downloadProgress, setDownloadProgress] = useState(0); // 0-100 for glow effect
  
  // Voice Chat Mode state
  const [voiceChatMode, setVoiceChatMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [whisperAvailable, setWhisperAvailable] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimeoutRef = useRef(null);
  const voiceChatActiveRef = useRef(false); // Track if voice chat should continue after AI response

  // TTS state (AI voice)
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    const saved = localStorage.getItem('tts-enabled');
    return saved === 'true';
  });
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ttsQueueRef = useRef([]);
  const ttsAudioRef = useRef(null);
  const lastSpokenIndexRef = useRef(0);

  // Zoom level for accessibility (Ctrl + scroll wheel)
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('chat-zoom-level');
    return saved ? parseFloat(saved) : 1;
  });

  // Typewriter effect state
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  
  const isNewChat = !activeChatId || messages.length === 0;

  // Check for available voice plugins (STT and TTS)
  useEffect(() => {
    const checkVoicePlugins = async () => {
      try {
        const dockerStatus = await window.electronAPI?.checkDockerStatus();
        if (!dockerStatus?.running) {
          setWhisperAvailable(false);
          setTtsAvailable(false);
          return;
        }
        
        const result = await window.electronAPI?.getDockerContainers();
        if (result?.success) {
          const containers = result.containers || [];
          
          // Check for any STT plugin (whisper or any stt-api provider)
          const sttRunning = containers.some(c => 
            (c.name?.includes('openmind-whisper') || c.name?.includes('openmind-stt')) && 
            c.state === 'running'
          );
          setWhisperAvailable(sttRunning);
          
          // Check for any TTS plugin (coqui, piper, or any tts-api provider)
          const ttsRunning = containers.some(c => 
            (c.name?.includes('openmind-tts') || c.name?.includes('openmind-coqui') || c.name?.includes('openmind-piper')) && 
            c.state === 'running'
          );
          setTtsAvailable(ttsRunning);
        }
      } catch {
        setWhisperAvailable(false);
        setTtsAvailable(false);
      }
    };
    
    checkVoicePlugins();
    const interval = setInterval(checkVoicePlugins, 10000);
    return () => clearInterval(interval);
  }, []);

  // Save TTS preference
  useEffect(() => {
    localStorage.setItem('tts-enabled', ttsEnabled.toString());
  }, [ttsEnabled]);

  // TTS speak function - speaks text and manages queue (uses generic plugin API)
  const speakText = useCallback(async (text) => {
    if (!ttsAvailable || !ttsEnabled || !text.trim()) return;
    
    try {
      // Use generic plugin TTS API - works with any tts-api plugin
      const result = await window.electronAPI?.pluginTtsSpeak?.(text) 
        || await window.electronAPI?.ttsSpeak?.(text, 'http://localhost:5002');
      
      if (result?.success && result.audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))],
          { type: result.mimeType || 'audio/wav' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return new Promise((resolve) => {
          const audio = new Audio(audioUrl);
          ttsAudioRef.current = audio;
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            ttsAudioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            ttsAudioRef.current = null;
            resolve();
          };
          
          audio.play().catch(() => resolve());
        });
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  }, [ttsAvailable, ttsEnabled]);

  // Process TTS queue
  const processTTSQueue = useCallback(async () => {
    if (isSpeaking || ttsQueueRef.current.length === 0) return;
    
    setIsSpeaking(true);
    
    while (ttsQueueRef.current.length > 0) {
      const text = ttsQueueRef.current.shift();
      if (text) {
        await speakText(text);
      }
    }
    
    setIsSpeaking(false);
  }, [isSpeaking, speakText]);

  // Stop TTS
  const stopTTS = useCallback(() => {
    ttsQueueRef.current = [];
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    setIsSpeaking(false);
    lastSpokenIndexRef.current = 0;
  }, []);

  // Voice Chat Mode - Start listening
  const startListening = useCallback(async () => {
    if (isListening || !whisperAvailable || isTranscribing) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          // Reset silence timeout when audio data comes in
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          // Stop after 2 seconds of no new data (silence detection)
          silenceTimeoutRef.current = setTimeout(() => {
            if (isListening && audioChunksRef.current.length > 0) {
              stopListeningAndTranscribe();
            }
          }, 2000);
        }
      };
      
      mediaRecorderRef.current.start(500); // Collect data every 500ms
      setIsListening(true);
      
      // Auto-stop after 30 seconds max
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopListeningAndTranscribe();
        }
      }, 30000);
      
    } catch (err) {
      console.error('Microphone error:', err);
    }
  }, [isListening, whisperAvailable, isTranscribing]);

  // Stop listening and transcribe
  const stopListeningAndTranscribe = useCallback(async () => {
    if (!mediaRecorderRef.current) return;
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    setIsListening(false);
    
    if (audioChunksRef.current.length === 0) {
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      // If voice chat mode is still on, start listening again
      if (voiceChatActiveRef.current) {
        setTimeout(() => startListening(), 500);
      }
      return;
    }
    
    setIsTranscribing(true);
    const mimeType = mediaRecorderRef.current.mimeType;
    
    mediaRecorderRef.current.onstop = async () => {
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];
      
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        // Use generic plugin STT API - works with any stt-api plugin
        const result = await window.electronAPI?.pluginSttTranscribe?.(base64Audio, mimeType)
          || await window.electronAPI?.whisperTranscribe?.(base64Audio, mimeType, 'http://localhost:9000');
        
        if (result?.success && result.text?.trim()) {
          // Auto-send the transcribed text
          const transcribedText = result.text.trim();
          setInput(transcribedText);
          // Trigger send after a short delay to let state update
          setTimeout(() => {
            handleVoiceSend(transcribedText);
          }, 100);
        } else if (voiceChatActiveRef.current) {
          // No text recognized, start listening again
          setTimeout(() => startListening(), 500);
        }
      } catch (err) {
        console.error('Transcription error:', err);
        if (voiceChatActiveRef.current) {
          setTimeout(() => startListening(), 500);
        }
      } finally {
        setIsTranscribing(false);
      }
    };
    
    mediaRecorderRef.current.stop();
  }, []);

  // Toggle Voice Chat Mode
  const toggleVoiceChatMode = useCallback(() => {
    if (voiceChatMode) {
      // Turn off
      voiceChatActiveRef.current = false;
      setVoiceChatMode(false);
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
        mediaRecorderRef.current.stop();
      }
      stopTTS();
    } else {
      // Turn on - also enable TTS
      voiceChatActiveRef.current = true;
      setVoiceChatMode(true);
      setTtsEnabled(true);
      startListening();
    }
  }, [voiceChatMode, startListening, stopTTS]);

  // Build system prompt with user context
  const getSystemPrompt = useCallback(() => {
    let prompt = 'You are a helpful AI assistant.';
    if (currentUser?.name) {
      prompt += ` The user's name is ${currentUser.name}. Address them by name when appropriate to make the conversation more personal.`;
    }
    return prompt;
  }, [currentUser]);

  // Prepare messages with system prompt for API calls
  const prepareMessagesForAPI = useCallback((chatMessages) => {
    const systemMessage = { role: 'system', content: getSystemPrompt() };
    return [systemMessage, ...chatMessages];
  }, [getSystemPrompt]);

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

  // ESC key to close fullscreen image
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (fullscreenImage) setFullscreenImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage]);


  // Initial load of models (from hooks)
  useEffect(() => {
    fetchModels();
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

  // Voice send - used by voice chat mode, auto-sends and continues listening after response
  const handleVoiceSend = useCallback(async (text) => {
    if (!text?.trim() || (!selectedModel || selectedModel === 'No Models Found')) {
      if (voiceChatActiveRef.current) {
        setTimeout(() => startListening(), 500);
      }
      return;
    }
    
    // Clear input and send
    setInput('');
    
    const userMessage = { 
      role: 'user', 
      content: text.trim(), 
      id: Date.now()
    };

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

    if (!chatId) {
      chatId = onFirstMessage(text.trim(), messagesWithPlaceholder);
    } else {
      onUpdateMessages(chatId, messagesWithPlaceholder);
    }

    let currentThinking = '';
    let currentContent = '';
    setIsReasoning(true);

    const thinkingListener = (thinking) => {
      currentThinking = thinking;
      setIsReasoning(true);
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
      if (content) setIsReasoning(false);
      
      // TTS for voice chat
      if (ttsEnabled && ttsAvailable && content) {
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        const newSentences = sentences.slice(lastSpokenIndexRef.current);
        
        if (newSentences.length > 0) {
          newSentences.forEach(sentence => {
            const cleanSentence = sentence
              .replace(/```[\s\S]*?```/g, '')
              .replace(/`[^`]+`/g, '')
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
              .replace(/[#*_~]/g, '')
              .trim();
            
            if (cleanSentence.length > 5) {
              ttsQueueRef.current.push(cleanSentence);
            }
          });
          lastSpokenIndexRef.current = sentences.length;
          processTTSQueue();
        }
      }
      
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: true
      }]);
    };

    lastSpokenIndexRef.current = 0;
    ttsQueueRef.current = [];

    window.electronAPI.onThinkingUpdate(thinkingListener);
    window.electronAPI.onMessageUpdate(messageListener);

    try {
      let response;
      if (deepSearchEnabled) {
        setIsDeepSearching(true);
        response = await window.electronAPI.sendDeepSearchMessage(selectedModel, prepareMessagesForAPI(newMessages));
        setIsDeepSearching(false);
      } else if (selectedModel.startsWith('⚡ ')) {
        const modelName = selectedModel.replace('⚡ ', '');
        response = await window.electronAPI.sendLocalMessage(prepareMessagesForAPI(newMessages), modelName);
      } else {
        response = await window.electronAPI.sendOllamaMessage(selectedModel, prepareMessagesForAPI(newMessages));
      }
      
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent || response.content,
        thinking: currentThinking || response.thinking,
        stats: response.stats || {},
        model: selectedModel,
        id: assistantMessageId,
        isStreaming: false
      }]);
      
      setIsReasoning(false);
      
      // After AI finishes, wait for TTS to complete then start listening again
      if (voiceChatActiveRef.current) {
        const waitForTTS = () => {
          if (ttsQueueRef.current.length === 0 && !isSpeaking) {
            setTimeout(() => {
              if (voiceChatActiveRef.current) {
                startListening();
              }
            }, 500);
          } else {
            setTimeout(waitForTTS, 500);
          }
        };
        waitForTTS();
      }
      
    } catch (error) {
      console.error('Voice chat error:', error);
      setIsDeepSearching(false);
      setIsReasoning(false);
      
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: 'Error: Could not get response.',
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: false
      }]);
      
      // Still try to continue voice chat
      if (voiceChatActiveRef.current) {
        setTimeout(() => startListening(), 1000);
      }
    }
  }, [selectedModel, activeChatId, messages, onUpdateMessages, onFirstMessage, deepSearchEnabled, ttsEnabled, ttsAvailable, isSpeaking, processTTSQueue, startListening, prepareMessagesForAPI]);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedImages.length === 0) || (!imageGenEnabled && (!selectedModel || selectedModel === 'No Models Found'))) return;

    const userMessage = { 
      role: 'user', 
      content: input || (attachedImages.length > 0 ? 'What do you see in this image?' : ''), 
      id: Date.now(),
      images: attachedImages.length > 0 ? attachedImages : undefined
    };

    // Image Generation Mode (Plugin-based - only if plugin is loaded and enabled)
    if (imageGenEnabled && imageGenPluginLoaded && input.trim()) {
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
      
      const result = await handleGenerateImage(inputText);
      
      if (result?.success && result.image) {
        onUpdateMessages(chatId, [...newMessages, {
          role: 'assistant',
          content: `Generated image for: "${inputText}"`,
          generatedImage: result.image,
          id: assistantMessageId,
          isStreaming: false
        }]);
      } else {
        const errorMsg = result?.error || 'Unknown error';
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
      
      // TTS: Queue complete sentences for speaking
      if (ttsEnabled && ttsAvailable && content) {
        // Find sentences that haven't been spoken yet
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        const newSentences = sentences.slice(lastSpokenIndexRef.current);
        
        if (newSentences.length > 0) {
          newSentences.forEach(sentence => {
            // Clean sentence for TTS
            const cleanSentence = sentence
              .replace(/```[\s\S]*?```/g, '')
              .replace(/`[^`]+`/g, '')
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
              .replace(/[#*_~]/g, '')
              .trim();
            
            if (cleanSentence.length > 5) {
              ttsQueueRef.current.push(cleanSentence);
            }
          });
          lastSpokenIndexRef.current = sentences.length;
          processTTSQueue();
        }
      }
      
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: true
      }]);
    };

    // Reset TTS state for new message
    lastSpokenIndexRef.current = 0;
    ttsQueueRef.current = [];

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
        
        response = await window.electronAPI.sendDeepSearchMessage(selectedModel, prepareMessagesForAPI(newMessages));
        setIsDeepSearching(false);
        setIsReasoning(false);
      } else if (selectedModel.startsWith('⚡ ')) {
        // OpenMind model - use local llama.cpp
        const modelName = selectedModel.replace('⚡ ', '');
        response = await window.electronAPI.sendLocalMessage(prepareMessagesForAPI(newMessages), modelName);
      } else {
        // Normal streaming mode (Local Ollama)
        response = await window.electronAPI.sendOllamaMessage(selectedModel, prepareMessagesForAPI(newMessages));
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
      
      // TTS: Queue complete sentences for speaking
      if (ttsEnabled && ttsAvailable && content) {
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        const newSentences = sentences.slice(lastSpokenIndexRef.current);
        
        if (newSentences.length > 0) {
          newSentences.forEach(sentence => {
            const cleanSentence = sentence
              .replace(/```[\s\S]*?```/g, '')
              .replace(/`[^`]+`/g, '')
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
              .replace(/[#*_~]/g, '')
              .trim();
            
            if (cleanSentence.length > 5) {
              ttsQueueRef.current.push(cleanSentence);
            }
          });
          lastSpokenIndexRef.current = sentences.length;
          processTTSQueue();
        }
      }
      
      onUpdateMessages(activeChatId, [...newMessages, {
        role: 'assistant',
        content: currentContent,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: true
      }]);
    };

    // Reset TTS state for new message
    lastSpokenIndexRef.current = 0;
    ttsQueueRef.current = [];

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
        response = await window.electronAPI.sendDeepSearchMessage(selectedModel, prepareMessagesForAPI(newMessages));
        setIsDeepSearching(false);
        setIsReasoning(false);
      } else if (selectedModel.startsWith('⚡ ')) {
        // OpenMind model - use local llama.cpp
        const modelName = selectedModel.replace('⚡ ', '');
        response = await window.electronAPI.sendLocalMessage(prepareMessagesForAPI(newMessages), modelName);
      } else {
        response = await window.electronAPI.sendOllamaMessage(selectedModel, prepareMessagesForAPI(newMessages));
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

        {/* Chat input */}
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
              (imageGenEnabled && imageGenPluginLoaded)
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

            {/* DeepSearch Button - only shows when plugin is enabled */}
            {deepSearchPluginLoaded && (
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
                  title={deepSearchEnabled ? 'DeepSearch enabled - Click to disable' : 'Enable DeepSearch for web results'}
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
            )}

            {/* TTS Voice Button - only shows when TTS container is running and voice chat is off */}
            {ttsAvailable && !voiceChatMode && (
              <div style={{ 
                position: 'relative',
                borderRadius: '20px',
                padding: isSpeaking ? '2px' : '0',
                background: isSpeaking 
                  ? 'conic-gradient(from var(--angle, 0deg), #4ade80, #22d3ee, #818cf8, #4ade80)' 
                  : 'transparent',
                animation: isSpeaking ? 'rotate-glow 2s linear infinite' : 'none'
              }}>
                <button
                  onClick={() => {
                    if (isSpeaking) {
                      stopTTS();
                    } else {
                      setTtsEnabled(!ttsEnabled);
                    }
                  }}
                  style={{
                    background: ttsEnabled ? (isDark ? '#fff' : '#1a1a1a') : (isSpeaking ? (isDark ? '#2c2c2e' : '#f3f4f6') : 'transparent'),
                    border: isSpeaking ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                    color: ttsEnabled ? (isDark ? '#000' : '#fff') : theme.textSecondary,
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
                    if (!ttsEnabled) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.color = '#ccc';
                    }
                    e.currentTarget.style.gap = '6px';
                    e.currentTarget.querySelector('.btn-label').style.width = 'auto';
                    e.currentTarget.querySelector('.btn-label').style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    if (!ttsEnabled) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = theme.textSecondary;
                    }
                    e.currentTarget.style.gap = '0px';
                    e.currentTarget.querySelector('.btn-label').style.width = '0';
                    e.currentTarget.querySelector('.btn-label').style.opacity = '0';
                  }}
                  title={isSpeaking ? 'Stop speaking' : (ttsEnabled ? 'AI Voice enabled' : 'Enable AI Voice')}
                >
                  {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span className="btn-label" style={{ 
                    width: '0', 
                    opacity: '0', 
                    overflow: 'hidden', 
                    transition: 'all 0.3s ease' 
                  }}>{isSpeaking ? 'Stop' : 'AI Voice'}</span>
                </button>
              </div>
            )}

            {/* Image Generation Button - Only shown when plugin is loaded */}
            {imageGenPluginLoaded && (
              <ImageGenButton
                enabled={imageGenEnabled}
                isGenerating={isGeneratingImage}
                onToggle={() => setImageGenEnabled(!imageGenEnabled)}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                style={{
                  background: (imageGenEnabled && imageGenPluginLoaded) ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: (imageGenEnabled && imageGenPluginLoaded) ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  color: (imageGenEnabled && imageGenPluginLoaded) ? '#fff' : '#888',
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
                  e.currentTarget.style.background = (imageGenEnabled && imageGenPluginLoaded) ? 'rgba(255,255,255,0.08)' : 'transparent';
                  e.currentTarget.style.color = (imageGenEnabled && imageGenPluginLoaded) ? '#fff' : '#888';
                }}
              >
                {(imageGenEnabled && imageGenPluginLoaded) ? (selectedImageModel || 'Select Image Model') : (selectedModel || 'Select Model')}
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
                    {(imageGenEnabled && imageGenPluginLoaded) ? (
                      // Image Generation Models (Plugin)
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Voice Chat Mode Button - Toggle for continuous voice conversation */}
              {whisperAvailable && (
                <div style={{
                  position: 'relative',
                  borderRadius: '50%',
                  padding: (voiceChatMode && isListening) ? '2px' : '0',
                  background: (voiceChatMode && isListening)
                    ? 'conic-gradient(from var(--angle, 0deg), #ef4444, #f97316, #eab308, #ef4444)'
                    : 'transparent',
                  animation: (voiceChatMode && isListening) ? 'rotate-glow 1.5s linear infinite' : 'none'
                }}>
                  <button
                    onClick={toggleVoiceChatMode}
                    disabled={isTranscribing}
                    style={{
                      background: voiceChatMode 
                        ? (isDark ? 'white' : '#1a1a1a')
                        : isTranscribing
                          ? (isDark ? '#333' : '#e5e5e5')
                          : 'transparent',
                      color: voiceChatMode 
                        ? (isDark ? 'black' : 'white')
                        : isTranscribing
                          ? theme.textMuted
                          : theme.textSecondary,
                      border: (voiceChatMode && isListening) ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isTranscribing ? 'wait' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={
                      voiceChatMode 
                        ? (isListening ? 'Listening... Click to stop voice chat' : isTranscribing ? 'Transcribing...' : 'Voice chat active')
                        : 'Start voice chat mode'
                    }
                  >
                    {isTranscribing ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Mic size={16} />
                    )}
                  </button>
                </div>
              )}

              {/* Send Button */}
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
              <MessageBubble
                key={msg.id || i}
                msg={msg}
                index={i}
                theme={theme}
                isDark={isDark}
                isDeepSearching={isDeepSearching}
                isReasoning={isReasoning}
                isWebSearching={isWebSearching}
                searchedFavicons={searchedFavicons}
                imageGenProgress={imageGenProgress}
                onRegenerate={handleRegenerate}
                onCopy={handleCopyMessage}
                onFullscreenImage={setFullscreenImage}
                expandedReasoning={expandedReasoning}
                setExpandedReasoning={setExpandedReasoning}
              />
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

    </div>
  );
};

export default ChatArea;
