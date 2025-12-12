const { ipcMain } = require('electron');

// Local SearXNG instance URL (Docker)
const SEARXNG_URL = 'http://localhost:8888';

// Cache status to avoid repeated checks
let lastStatusCheck = 0;
let cachedStatus = false;
const STATUS_CACHE_DURATION = 30000; // 30 seconds

/**
 * Perform a web search using local SearXNG instance
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object>} Search results
 */
async function searchWeb(query, options = {}) {
  const {
    categories = 'general',
    language = 'de-DE',
    pageNo = 1,
    timeRange = '',
    safesearch = 0
  } = options;

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    categories,
    language,
    pageno: pageNo.toString(),
    safesearch: safesearch.toString()
  });

  if (timeRange) {
    params.append('time_range', timeRange);
  }

  try {
    const response = await fetch(`${SEARXNG_URL}/search?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`SearXNG error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      query: data.query,
      results: data.results.map(result => ({
        title: result.title,
        url: result.url,
        content: result.content || '',
        engine: result.engine,
        publishedDate: result.publishedDate || null,
        thumbnail: result.thumbnail || null
      })),
      suggestions: data.suggestions || [],
      infoboxes: data.infoboxes || [],
      totalResults: data.number_of_results || data.results.length
    };
  } catch (error) {
    console.error('SearXNG search error:', error);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
}

/**
 * Check if SearXNG is running (with caching)
 * @returns {Promise<boolean>}
 */
async function checkSearXNGStatus() {
  // Return cached status if recent
  if (Date.now() - lastStatusCheck < STATUS_CACHE_DURATION) {
    return cachedStatus;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${SEARXNG_URL}/`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    cachedStatus = response.ok;
    lastStatusCheck = Date.now();
    return cachedStatus;
  } catch (error) {
    cachedStatus = false;
    lastStatusCheck = Date.now();
    return false;
  }
}

/**
 * Get available search categories from SearXNG
 * @returns {Promise<string[]>}
 */
async function getCategories() {
  // SearXNG standard categories
  return [
    'general',
    'images',
    'videos',
    'news',
    'map',
    'music',
    'it',
    'science',
    'files',
    'social media'
  ];
}

/**
 * Setup IPC handlers for SearXNG
 */
function setupSearXNGHandlers() {
  ipcMain.handle('searxng:search', async (event, query, options) => {
    return await searchWeb(query, options);
  });

  ipcMain.handle('searxng:status', async () => {
    return await checkSearXNGStatus();
  });

  ipcMain.handle('searxng:categories', async () => {
    return await getCategories();
  });
}

module.exports = {
  searchWeb,
  checkSearXNGStatus,
  getCategories,
  setupSearXNGHandlers
};
