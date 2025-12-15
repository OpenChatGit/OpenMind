import { useState, useCallback, useRef } from 'react';

/**
 * Hook for handling DeepSearch state and tool tracking
 * Extracts DeepSearch logic from ChatArea
 */
export const useDeepSearch = () => {
  const [deepSearchEnabled, setDeepSearchEnabled] = useState(() => {
    const saved = localStorage.getItem('deepSearchEnabled');
    return saved === 'true';
  });
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [isReasoning, setIsReasoning] = useState(false);
  const [searchedFavicons, setSearchedFavicons] = useState([]);
  const searchedFaviconsRef = useRef([]);
  const [searchSources, setSearchSources] = useState([]);
  const [currentSources, setCurrentSources] = useState([]);
  const [currentPreviews, setCurrentPreviews] = useState([]);
  const [currentToolCalls, setCurrentToolCalls] = useState([]);

  // Reset all DeepSearch state for new search
  const resetDeepSearchState = useCallback(() => {
    setSearchSources([]);
    setCurrentSources([]);
    setCurrentPreviews([]);
    setSearchedFavicons([]);
    searchedFaviconsRef.current = [];
    setCurrentToolCalls([]);
  }, []);

  // Clear temporary state after message complete
  const clearTempState = useCallback(() => {
    setCurrentSources([]);
    setCurrentToolCalls([]);
    setCurrentPreviews([]);
    setSearchedFavicons([]);
    searchedFaviconsRef.current = [];
    setIsReasoning(false);
  }, []);

  return {
    deepSearchEnabled,
    setDeepSearchEnabled,
    isDeepSearching,
    setIsDeepSearching,
    isWebSearching,
    setIsWebSearching,
    isReasoning,
    setIsReasoning,
    searchedFavicons,
    setSearchedFavicons,
    searchedFaviconsRef,
    searchSources,
    setSearchSources,
    currentSources,
    setCurrentSources,
    currentPreviews,
    setCurrentPreviews,
    currentToolCalls,
    setCurrentToolCalls,
    resetDeepSearchState,
    clearTempState,
  };
};

export default useDeepSearch;
