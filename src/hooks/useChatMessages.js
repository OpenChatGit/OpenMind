import { useCallback } from 'react';

/**
 * Hook for handling chat message sending and regeneration
 * Extracts the core messaging logic from ChatArea
 */
export const useChatMessages = ({
  selectedModel,
  activeChatId,
  messages,
  onUpdateMessages,
  onFirstMessage,
  deepSearchEnabled,
  prepareMessagesForAPI,
  // DeepSearch state setters
  setIsDeepSearching,
  setIsWebSearching,
  setIsReasoning,
  setSearchSources,
  setCurrentSources,
  setCurrentPreviews,
  setSearchedFavicons,
  searchedFaviconsRef,
  setCurrentToolCalls,
  currentSources,
  currentToolCalls,
  currentPreviews,
  // UI state setters
  setExpandedToolCalls,
  setExpandedReasoning,
  // Image generation
  imageGenEnabled,
  handleGenerateImage,
}) => {

  // Send a new message
  const sendMessage = useCallback(async (input, attachedImages, setInput, setAttachedImages) => {
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

    if (!chatId) {
      chatId = onFirstMessage(inputText, messagesWithPlaceholder);
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
        setIsDeepSearching(true);
        setIsWebSearching(false);
        setSearchSources([]);
        setCurrentSources([]);
        setCurrentPreviews([]);
        setSearchedFavicons([]);
        searchedFaviconsRef.current = [];
        setCurrentToolCalls([]);
        setExpandedToolCalls(prev => ({ ...prev, [assistantMessageId]: true }));
        setExpandedReasoning(prev => ({ ...prev, [assistantMessageId]: true }));
        
        const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
        const urlsInMessage = inputText.match(urlRegex) || [];
        if (urlsInMessage.length > 0) {
          setIsWebSearching(true);
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
        const modelName = selectedModel.replace('⚡ ', '');
        response = await window.electronAPI.sendLocalMessage(prepareMessagesForAPI(newMessages), modelName);
      } else {
        response = await window.electronAPI.sendOllamaMessage(selectedModel, prepareMessagesForAPI(newMessages));
      }
      
      const finalFavicons = searchedFaviconsRef.current;
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: currentContent || response.content,
        thinking: currentThinking || response.thinking,
        sources: deepSearchEnabled ? [...currentSources] : [],
        favicons: deepSearchEnabled ? [...finalFavicons] : [],
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
      setIsReasoning(false);

    } catch (error) {
      console.error('Inference error:', error);
      setIsDeepSearching(false);
      setIsReasoning(false);
      
      const errorMsg = 'Error: Could not connect to Ollama. Is it running?';
      
      onUpdateMessages(chatId, [...newMessages, {
        role: 'assistant',
        content: errorMsg,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: false
      }]);
    }
  }, [selectedModel, activeChatId, messages, onUpdateMessages, onFirstMessage, deepSearchEnabled, imageGenEnabled, handleGenerateImage, prepareMessagesForAPI, currentSources, currentToolCalls, currentPreviews]);

  // Regenerate AI response
  const regenerateMessage = useCallback(async (messageIndex) => {
    if (!selectedModel || selectedModel === 'No Models Found') return;
    
    const aiMessage = messages[messageIndex];
    if (aiMessage.role !== 'assistant') return;
    
    const messagesBeforeAi = messages.slice(0, messageIndex);
    const lastUserMessage = messagesBeforeAi[messagesBeforeAi.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') return;
    
    const assistantMessageId = Date.now();
    const newMessages = [...messagesBeforeAi];
    
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
    setIsReasoning(true);

    const thinkingListener = (thinking) => {
      currentThinking = thinking;
      setIsReasoning(true);
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
      if (content) setIsReasoning(false);
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
      
      const errorMsg = error?.message ? `Error: ${error.message}` : 'Error: Could not regenerate response.';
      
      onUpdateMessages(activeChatId, [...newMessages, {
        role: 'assistant',
        content: errorMsg,
        thinking: currentThinking,
        id: assistantMessageId,
        isStreaming: false
      }]);
    }
  }, [selectedModel, activeChatId, messages, onUpdateMessages, deepSearchEnabled, prepareMessagesForAPI, currentSources, currentToolCalls, currentPreviews]);

  return {
    sendMessage,
    regenerateMessage,
  };
};

export default useChatMessages;
