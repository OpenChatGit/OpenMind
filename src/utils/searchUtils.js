// Search utility functions

// Escape special regex characters
export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\' + '$' + '&');
}

// Highlight matches in text - returns array of strings and React elements
export function getHighlightParts(text, query) {
  if (!query || !text) return [text || ''];
  
  try {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const parts = [];
    let lastIndex = 0;
    let index = lowerText.indexOf(lowerQuery);
    
    while (index !== -1) {
      // Add text before match
      if (index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, index), isMatch: false });
      }
      // Add match
      parts.push({ 
        text: text.substring(index, index + query.length), 
        isMatch: true 
      });
      lastIndex = index + query.length;
      index = lowerText.indexOf(lowerQuery, lastIndex);
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isMatch: false });
    }
    
    return parts.length > 0 ? parts : [{ text, isMatch: false }];
  } catch (e) {
    return [{ text, isMatch: false }];
  }
}
