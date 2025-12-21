/**
 * Centralized Scan Cache System
 * 
 * Caches results from expensive scan operations to avoid repeated
 * filesystem/network operations. Uses time-based invalidation and
 * optional file-watching for smart cache invalidation.
 * 
 * Supported caches:
 * - diffusionModels: Scanned diffusion models from /models folder
 * - pluginRegistry: Online/local plugin registry
 * - installedPlugins: List of installed plugin IDs
 * - nativePlugins: Loaded native plugins
 * - dockerContainers: Docker container status
 */

// Cache storage
const caches = new Map();

// Default cache durations (in milliseconds)
const CACHE_DURATIONS = {
  diffusionModels: 5 * 60 * 1000,    // 5 minutes - models don't change often
  pluginRegistry: 60 * 1000,          // 1 minute - registry might update
  installedPlugins: 30 * 1000,        // 30 seconds - can change via settings
  nativePlugins: 60 * 1000,           // 1 minute
  dockerContainers: 10 * 1000,        // 10 seconds - containers can start/stop
  ollamaModels: 30 * 1000,            // 30 seconds
};

// Track pending requests to avoid duplicate concurrent fetches
const pendingRequests = new Map();

/**
 * Get cached data or fetch fresh data
 * 
 * @param {string} key - Cache key
 * @param {function} fetcher - Async function to fetch fresh data
 * @param {object} options - Options
 * @param {number} options.maxAge - Max cache age in ms (default from CACHE_DURATIONS)
 * @param {boolean} options.force - Force refresh even if cached
 * @returns {Promise<any>} - Cached or fresh data
 */
export async function getCached(key, fetcher, options = {}) {
  const maxAge = options.maxAge ?? CACHE_DURATIONS[key] ?? 60000;
  const force = options.force ?? false;
  
  // Check cache first (unless forced)
  if (!force) {
    const cached = caches.get(key);
    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return cached.data;
    }
  }
  
  // Check if there's already a pending request for this key
  if (pendingRequests.has(key)) {
    // Wait for the existing request to complete
    return pendingRequests.get(key);
  }
  
  // Create new fetch promise
  const fetchPromise = (async () => {
    try {
      const data = await fetcher();
      
      // Store in cache
      caches.set(key, {
        data,
        timestamp: Date.now(),
      });
      
      return data;
    } finally {
      // Remove from pending
      pendingRequests.delete(key);
    }
  })();
  
  // Store pending request
  pendingRequests.set(key, fetchPromise);
  
  return fetchPromise;
}

/**
 * Invalidate a specific cache
 */
export function invalidateCache(key) {
  caches.delete(key);
}

/**
 * Invalidate all caches
 */
export function invalidateAllCaches() {
  caches.clear();
}

/**
 * Check if cache is valid (not expired)
 */
export function isCacheValid(key, maxAge) {
  const cached = caches.get(key);
  if (!cached) return false;
  
  const age = maxAge ?? CACHE_DURATIONS[key] ?? 60000;
  return (Date.now() - cached.timestamp) < age;
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(key) {
  const cached = caches.get(key);
  if (!cached) return Infinity;
  return Date.now() - cached.timestamp;
}

/**
 * Set cache data directly (useful for updates from events)
 */
export function setCache(key, data) {
  caches.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// ============ CONVENIENCE FUNCTIONS ============

/**
 * Get diffusion models (cached)
 */
export async function getDiffusionModels(force = false) {
  return getCached('diffusionModels', async () => {
    const result = await window.electronAPI?.scanDiffusionModels?.();
    return result?.success ? result.models : [];
  }, { force });
}

/**
 * Get plugin registry (cached)
 */
export async function getPluginRegistry(force = false) {
  return getCached('pluginRegistry', async () => {
    const result = await window.electronAPI?.loadOnlinePluginRegistry?.();
    return result?.success ? result : { plugins: [], iconsBaseUrl: '' };
  }, { force });
}

/**
 * Get API plugin registry (cached)
 */
export async function getAPIPluginRegistry(force = false) {
  return getCached('apiPluginRegistry', async () => {
    const result = await window.electronAPI?.loadAPIPluginRegistry?.();
    return result?.success ? result : { plugins: [], iconsBaseUrl: '' };
  }, { force });
}

/**
 * Get installed plugin IDs (cached)
 */
export async function getInstalledPlugins(force = false) {
  return getCached('installedPlugins', async () => {
    const result = await window.electronAPI?.checkInstalledPlugins?.();
    return result?.success ? result.installedPluginIds : [];
  }, { force });
}

/**
 * Get Docker containers (cached)
 */
export async function getDockerContainers(force = false) {
  return getCached('dockerContainers', async () => {
    const result = await window.electronAPI?.getDockerContainers?.();
    return result?.success ? result.containers : [];
  }, { force });
}

/**
 * Get Ollama models (cached)
 */
export async function getOllamaModels(force = false) {
  return getCached('ollamaModels', async () => {
    const result = await window.electronAPI?.getOllamaModels?.();
    return result?.success ? result.models : [];
  }, { force });
}

// ============ EVENT-BASED INVALIDATION ============

/**
 * Setup event listeners for automatic cache invalidation
 */
export function setupCacheInvalidation() {
  // Invalidate plugin caches when plugin state changes
  window.addEventListener('plugin-state-changed', () => {
    invalidateCache('installedPlugins');
    invalidateCache('nativePlugins');
  });
  
  // Invalidate model cache when models are downloaded/deleted
  if (window.electronAPI?.onModelChange) {
    window.electronAPI.onModelChange(() => {
      invalidateCache('diffusionModels');
      invalidateCache('ollamaModels');
    });
  }
  
  // Invalidate Docker cache when containers change
  if (window.electronAPI?.onDockerChange) {
    window.electronAPI.onDockerChange(() => {
      invalidateCache('dockerContainers');
    });
  }
}

// ============ DEBUG ============

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats() {
  const stats = {};
  for (const [key, value] of caches.entries()) {
    stats[key] = {
      age: Date.now() - value.timestamp,
      ageFormatted: `${Math.round((Date.now() - value.timestamp) / 1000)}s`,
      maxAge: CACHE_DURATIONS[key],
      isValid: isCacheValid(key),
      dataSize: JSON.stringify(value.data).length,
    };
  }
  return stats;
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.ScanCache = {
    getCached,
    invalidateCache,
    invalidateAllCaches,
    isCacheValid,
    getCacheAge,
    setCache,
    getCacheStats,
    getDiffusionModels,
    getPluginRegistry,
    getAPIPluginRegistry,
    getInstalledPlugins,
    getDockerContainers,
    getOllamaModels,
  };
}

export default {
  getCached,
  invalidateCache,
  invalidateAllCaches,
  isCacheValid,
  getCacheAge,
  setCache,
  getCacheStats,
  setupCacheInvalidation,
  getDiffusionModels,
  getPluginRegistry,
  getAPIPluginRegistry,
  getInstalledPlugins,
  getDockerContainers,
  getOllamaModels,
};
