const https = require('https');
const http = require('http');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getOllamaToolDefinitions, executeTool: executeMcpTool, getEnabledTools } = require('./mcpHandler');

let puppeteer = null;
let browserPath = null;
let browserInstance = null; // Reuse browser instance
let browserReady = false;

// Find installed browser
function findBrowser() {
  if (browserPath) return browserPath;
  
  const platform = os.platform();
  const possiblePaths = [];
  
  if (platform === 'win32') {
    possiblePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      process.env.LOCALAPPDATA + '\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
    );
  } else if (platform === 'darwin') {
    possiblePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
    );
  } else {
    possiblePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/brave-browser',
      '/snap/bin/chromium'
    );
  }
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      browserPath = p;
      console.log('Found browser:', browserPath);
      return browserPath;
    }
  }
  
  return null;
}

// Initialize puppeteer lazily
async function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = require('puppeteer-core');
  }
  return puppeteer;
}

// Initialize browser at app startup (call this from main.js)
async function initBrowser() {
  const browser = findBrowser();
  if (!browser) {
    console.log('No browser found for DeepSearch');
    return false;
  }
  
  try {
    const pptr = await getPuppeteer();
    browserInstance = await pptr.launch({
      executablePath: browser,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    browserReady = true;
    console.log('DeepSearch browser initialized and ready');
    return true;
  } catch (error) {
    console.error('Failed to initialize browser:', error.message);
    return false;
  }
}

// Close browser (call on app quit)
async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
      browserInstance = null;
      browserReady = false;
      console.log('DeepSearch browser closed');
    } catch (e) {
      console.error('Error closing browser:', e.message);
    }
  }
}

// Get browser instance (already initialized)
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  
  // Fallback: try to init if not ready
  if (!browserReady) {
    await initBrowser();
  }
  
  return browserInstance;
}

// Cache for SearXNG instances
let cachedInstances = [];
let instancesCacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

// Fetch available SearXNG instances from searx.space
async function fetchSearxngInstances() {
  // Return cached if still valid
  if (cachedInstances.length > 0 && Date.now() - instancesCacheTime < CACHE_DURATION) {
    return cachedInstances;
  }
  
  return new Promise((resolve) => {
    console.log('Fetching SearXNG instances from searx.space...');
    
    https.get('https://searx.space/data/instances.json', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const instances = [];
          
          // Filter for good HTTPS instances
          for (const [url, info] of Object.entries(json.instances || {})) {
            if (!url.startsWith('https://')) continue;
            if (!info.network_type || info.network_type !== 'normal') continue;
            
            // Check if instance is healthy (grade A or B, good uptime)
            const grade = info.html?.grade || '';
            const uptime = info.uptime?.uptimeDay || 0;
            
            if ((grade === 'A' || grade === 'B' || grade === 'C') && uptime > 90) {
              instances.push({
                url: url.replace(/\/$/, ''), // Remove trailing slash
                grade,
                uptime
              });
            }
          }
          
          // Sort by grade and uptime
          instances.sort((a, b) => {
            if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
            return b.uptime - a.uptime;
          });
          
          // Take top 10
          cachedInstances = instances.slice(0, 10).map(i => i.url);
          instancesCacheTime = Date.now();
          
          console.log(`Found ${cachedInstances.length} healthy SearXNG instances`);
          resolve(cachedInstances);
        } catch (e) {
          console.error('Failed to parse searx.space data:', e.message);
          resolve(getFallbackInstances());
        }
      });
    }).on('error', (e) => {
      console.error('Failed to fetch searx.space:', e.message);
      resolve(getFallbackInstances());
    }).on('timeout', () => {
      console.log('searx.space timeout, using fallback');
      resolve(getFallbackInstances());
    });
  });
}

// Fallback instances if searx.space is unavailable
function getFallbackInstances() {
  return [
    'https://searx.tiekoetter.com',
    'https://search.ononoki.org',
    'https://paulgo.io',
    'https://searx.be'
  ];
}

// Web search using browser-based SearXNG (most reliable, bypasses rate limiting)
async function webSearch(query) {
  console.log('webSearch called with query:', query);
  
  // Try DuckDuckGo first (more reliable results)
  const ddgResult = await duckduckgoSearch(query);
  if (ddgResult && ddgResult.results && ddgResult.results.length > 0) {
    return ddgResult;
  }
  
  // Fallback to SearXNG
  console.log('DuckDuckGo failed, trying SearXNG');
  const browserResult = await browserSearxngSearch(query);
  if (browserResult) return browserResult;
  
  // Last resort: API search
  console.log('All browser searches failed, trying API');
  return await apiSearch(query);
}

// Search using SearXNG JSON API
function searxngSearch(instance, query) {
  return new Promise((resolve, reject) => {
    // Use 'general' category and request more results, filter later
    const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=en`;
    
    https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 8000
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          // Filter and clean results
          const lowercaseQuery = query.toLowerCase();
          const isImageSearch = lowercaseQuery.includes('image') || lowercaseQuery.includes('picture') || lowercaseQuery.includes('photo');
          
          const results = (json.results || [])
            .filter(r => {
              // Skip results without proper URL or title
              if (!r.url || !r.title) return false;
              const url = r.url.toLowerCase();
              const title = r.title.toLowerCase();
              
              // Skip coordinate/map results
              if (url.includes('openstreetmap') || url.includes('maps.google')) return false;
              // Skip results that look like coordinates
              if (/^\d+\.\d+,\s*-?\d+\.\d+/.test(r.title)) return false;
              
              // For image searches, skip dictionary/definition sites
              if (isImageSearch) {
                if (url.includes('merriam-webster') || url.includes('dictionary.') || 
                    url.includes('thesaurus.') || url.includes('vocabulary.com') ||
                    url.includes('wiktionary') || title.includes('definition')) return false;
              }
              
              return true;
            })
            .slice(0, 6)
            .map(r => ({
              title: r.title || '',
              url: r.url || '',
              snippet: r.content || r.description || ''
            }));
          
          resolve({ success: true, results, query });
        } catch (e) {
          reject(new Error('Parse error'));
        }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

// Browser-based SearXNG search (bypasses rate limiting)
async function browserSearxngSearch(query) {
  const browser = await getBrowser();
  if (!browser) {
    console.log('No browser for SearXNG');
    return null;
  }
  
  // Updated list of reliable SearXNG instances
  const instances = [
    'https://search.sapti.me',
    'https://searx.tiekoetter.com', 
    'https://search.bus-hit.me',
    'https://searx.be',
    'https://paulgo.io'
  ];
  const lowerQuery = query.toLowerCase();
  const isImageSearch = lowerQuery.includes('image') || lowerQuery.includes('picture') || 
                        lowerQuery.includes('photo') || lowerQuery.includes('bilder');
  
  for (const instance of instances) {
    try {
      console.log(`Browser SearXNG: ${instance}`);
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Use images category if it's an image search
      const category = isImageSearch ? '&categories=images' : '';
      await page.goto(`${instance}/search?q=${encodeURIComponent(query)}&language=en${category}`, { 
        waitUntil: 'networkidle2', 
        timeout: 12000 
      });
      
      const results = await page.evaluate((searchQuery, isImg) => {
        const items = [];
        
        if (isImg) {
          // Image search - get image results
          document.querySelectorAll('.result-images, .image_result, .result').forEach((el) => {
            if (items.length >= 8) return;
            const imgEl = el.querySelector('img');
            const linkEl = el.querySelector('a[href^="http"]');
            
            if (imgEl?.src || linkEl?.href) {
              const thumbnail = imgEl?.src || '';
              const url = linkEl?.href || '';
              // Skip if thumbnail is a data URL or searx internal
              if (thumbnail.startsWith('data:') || thumbnail.includes('searx')) return;
              
              items.push({
                title: imgEl?.alt || el.textContent?.trim()?.slice(0, 50) || 'Image',
                url: url,
                snippet: '',
                thumbnail: thumbnail,
                type: 'image'
              });
            }
          });
        }
        
        // Regular web results
        const selectors = '.result, article.result, .result-default';
        document.querySelectorAll(selectors).forEach((el) => {
          if (items.length >= 6) return;
          
          const linkEl = el.querySelector('a.url_wrapper, h3 a, h4 a, a[href^="http"]');
          const titleEl = el.querySelector('h3, h4, .title, .result-title');
          const snippetEl = el.querySelector('.content, .result-content, p, .result-snippet');
          const imgEl = el.querySelector('img.image, img.thumbnail, .result-image img');
          
          if (linkEl?.href) {
            const url = linkEl.href.toLowerCase();
            const title = (titleEl?.textContent?.trim() || linkEl.textContent?.trim() || '').toLowerCase();
            
            // Skip unwanted results
            if (url.includes('searx') || url.includes('openstreetmap') || url.includes('maps.')) return;
            if (/^\d+\.\d+/.test(title)) return;
            
            // Detect result type
            let type = 'web';
            if (url.includes('github.com')) type = 'github';
            else if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
            else if (url.includes('wikipedia.org')) type = 'wikipedia';
            
            items.push({
              title: titleEl?.textContent?.trim() || linkEl.textContent?.trim() || '',
              url: linkEl.href,
              snippet: snippetEl?.textContent?.trim() || '',
              thumbnail: imgEl?.src || null,
              type: type
            });
          }
        });
        return items;
      }, query, isImageSearch);
      
      await page.close();
      
      if (results.length > 0) {
        console.log(`Browser SearXNG success: ${results.length} results`);
        
        // For image searches, also try to get preview images
        const enrichedResults = await enrichResultsWithPreviews(results, browser, isImageSearch);
        return { success: true, results: enrichedResults, query, hasImages: isImageSearch };
      }
    } catch (error) {
      console.log(`Browser SearXNG ${instance} error:`, error.message);
    }
  }
  return null;
}

// Enrich results with preview images (for image sites like Unsplash, Pexels, etc.)
async function enrichResultsWithPreviews(results, browser, isImageSearch) {
  // If already image search with thumbnails, return as-is
  if (isImageSearch && results.some(r => r.thumbnail)) {
    return results;
  }
  
  // Try to get preview images for top results from known image sites
  const enriched = await Promise.all(results.map(async (result) => {
    try {
      const url = result.url.toLowerCase();
      
      // For image hosting sites, try to extract preview
      if (url.includes('unsplash.com') || url.includes('pexels.com') || 
          url.includes('pixabay.com') || url.includes('flickr.com')) {
        // Use Open Graph image
        const ogImage = await getOpenGraphImage(browser, result.url);
        if (ogImage) {
          return { ...result, thumbnail: ogImage, type: 'image' };
        }
      }
      
      // For GitHub, extract repo info
      if (url.includes('github.com') && !url.includes('/blob/') && !url.includes('/issues/')) {
        const match = result.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (match) {
          return { 
            ...result, 
            type: 'github',
            thumbnail: `https://opengraph.githubassets.com/1/${match[1]}/${match[2]}`
          };
        }
      }
      
      // For YouTube, extract video thumbnail
      if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
        const videoId = url.includes('youtu.be') 
          ? url.split('youtu.be/')[1]?.split('?')[0]
          : url.match(/[?&]v=([^&]+)/)?.[1];
        if (videoId) {
          return {
            ...result,
            type: 'youtube',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
          };
        }
      }
      
      return result;
    } catch (e) {
      return result;
    }
  }));
  
  return enriched;
}

// Get Open Graph image from a page
async function getOpenGraphImage(browser, url) {
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
    
    const ogImage = await page.evaluate(() => {
      const meta = document.querySelector('meta[property="og:image"]');
      return meta?.content || null;
    });
    
    await page.close();
    return ogImage;
  } catch (e) {
    return null;
  }
}

// DuckDuckGo browser scraping (primary search)
async function duckduckgoSearch(query) {
  const browser = await getBrowser();
  if (!browser) {
    console.log('No browser available for DuckDuckGo');
    return null;
  }
  
  let page = null;
  try {
    console.log('Trying DuckDuckGo browser search for:', query);
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Use HTML version for more reliable scraping
    await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    const results = await page.evaluate(() => {
      const items = [];
      // HTML version selectors
      document.querySelectorAll('.result, .web-result').forEach((el) => {
        if (items.length >= 6) return;
        const linkEl = el.querySelector('.result__a, a.result__url');
        const titleEl = el.querySelector('.result__title, .result__a');
        const snippetEl = el.querySelector('.result__snippet');
        
        const url = linkEl?.href || '';
        if (url && !url.includes('duckduckgo.com') && !url.includes('ad_domain')) {
          items.push({
            title: titleEl?.textContent?.trim() || '',
            url: url,
            snippet: snippetEl?.textContent?.trim() || ''
          });
        }
      });
      return items;
    });
    
    await page.close();
    page = null;
    console.log('DuckDuckGo HTML results:', results.length);
    
    if (results.length > 0) {
      return { success: true, results, query };
    }
    return null;
  } catch (error) {
    console.error('DuckDuckGo error:', error.message);
    if (page) {
      try { await page.close(); } catch (e) {}
    }
    return null;
  }
}

// Super fast API search with aggressive timeout
async function apiSearch(query) {
  return new Promise((resolve) => {
    const encodedQuery = encodeURIComponent(query);
    
    const options = {
      hostname: 'api.duckduckgo.com',
      path: `/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const results = [];
          
          if (json.Abstract) {
            results.push({
              title: json.Heading || query,
              snippet: json.Abstract,
              url: json.AbstractURL || ''
            });
          }
          
          if (json.RelatedTopics) {
            for (const topic of json.RelatedTopics.slice(0, 3)) {
              if (topic.Text) {
                results.push({
                  title: topic.Text.split(' - ')[0] || '',
                  snippet: topic.Text,
                  url: topic.FirstURL || ''
                });
              }
            }
          }
          
          resolve({ success: true, results, query });
        } catch (e) {
          resolve({ success: true, results: [], query, message: 'No results found' });
        }
      });
    });

    req.on('error', () => resolve({ success: true, results: [], query }));
    req.setTimeout(2500, () => {
      req.destroy();
      resolve({ success: true, results: [], query });
    });
    req.end();
  });
}

// System file search - FAST parallel search
async function systemSearch(query, searchPath = null) {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  // Only search most common directories for speed
  const searchDirs = searchPath ? [searchPath] : [];
  
  if (!searchPath) {
    if (platform === 'win32') {
      searchDirs.push(
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Downloads')
      );
    } else {
      searchDirs.push(
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Downloads')
      );
    }
  }
  
  // Filter to existing dirs only
  const existingDirs = searchDirs.filter(d => fs.existsSync(d));
  
  // Search ALL directories in PARALLEL with race timeout
  const searchPromises = existingDirs.map(dir => 
    searchInDirectory(dir, query, platform).catch(() => [])
  );
  
  // Race against timeout
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 3000));
  const resultsArrays = await Promise.race([
    Promise.all(searchPromises),
    timeoutPromise.then(() => searchPromises.map(() => []))
  ]);
  
  const allResults = resultsArrays.flat();
  
  // Remove duplicates and limit
  const uniqueResults = allResults
    .filter((item, index, self) => 
      index === self.findIndex(t => t.path === item.path)
    )
    .slice(0, 8);
  
  return { 
    success: true, 
    results: uniqueResults, 
    query,
    searchedLocations: existingDirs
  };
}

// Search in a single directory (FAST - 2.5s timeout)
function searchInDirectory(searchDir, query, platform) {
  return new Promise((resolve) => {
    let command;
    
    if (platform === 'win32') {
      // Use dir command (faster than PowerShell), limit depth
      const escapedQuery = query.replace(/"/g, '""');
      command = `dir /s /b "${searchDir}\\*${escapedQuery}*" 2>nul | findstr /n "^" | findstr "^[1-6]:"`;
    } else {
      command = `find "${searchDir}" -maxdepth 3 -iname "*${query}*" 2>/dev/null | head -6`;
    }

    exec(command, { timeout: 2500, maxBuffer: 256 * 1024 }, (error, stdout) => {
      if (error && !stdout) {
        resolve([]);
        return;
      }
      
      const files = stdout.trim().split('\n')
        .filter(f => f.length > 0 && f !== '')
        .slice(0, 6)
        .map(filePath => {
          // Remove line numbers from Windows output
          const cleanPath = filePath.replace(/^\d+:/, '').trim();
          return {
            path: cleanPath,
            name: path.basename(cleanPath),
            type: path.extname(cleanPath) || 'folder',
            directory: path.dirname(cleanPath)
          };
        });
      
      resolve(files);
    });
  });
}

// List directory contents
async function listDirectory(directory) {
  const homeDir = os.homedir();
  const platform = os.platform();
  
  // Map common names to actual paths
  const dirMap = {
    'desktop': path.join(homeDir, 'Desktop'),
    'documents': path.join(homeDir, 'Documents'),
    'downloads': path.join(homeDir, 'Downloads'),
    'pictures': path.join(homeDir, 'Pictures'),
    'videos': path.join(homeDir, 'Videos'),
    'music': path.join(homeDir, 'Music'),
    'home': homeDir
  };
  
  // For Desktop on Windows, also check Public Desktop
  const isDesktopRequest = directory.toLowerCase() === 'desktop';
  const publicDesktop = platform === 'win32' ? 'C:\\Users\\Public\\Desktop' : null;
  
  // Resolve the directory path
  let dirPath = dirMap[directory.toLowerCase()] || directory;
  
  // If it's a relative path, try common locations
  if (!path.isAbsolute(dirPath) && !fs.existsSync(dirPath)) {
    dirPath = path.join(homeDir, directory);
  }
  
  try {
    if (!fs.existsSync(dirPath)) {
      return { success: false, error: `Directory not found: ${directory}` };
    }
    
    // Collect entries from user desktop
    let allEntries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    // For Desktop, also include Public Desktop items (Windows)
    if (isDesktopRequest && publicDesktop && fs.existsSync(publicDesktop)) {
      const publicEntries = fs.readdirSync(publicDesktop, { withFileTypes: true });
      // Mark public entries and add them
      publicEntries.forEach(entry => {
        entry._isPublic = true;
        entry._publicPath = publicDesktop;
      });
      allEntries = [...allEntries, ...publicEntries];
    }
    
    // Filter and process entries
    const seenNames = new Set();
    const items = allEntries
      .filter(entry => {
        // Skip hidden files (starting with .) and system files
        if (entry.name.startsWith('.')) return false;
        if (entry.name === 'desktop.ini') return false;
        if (entry.name === 'Thumbs.db') return false;
        if (entry.name === '.DS_Store') return false;
        // Skip duplicates (same name from user and public desktop)
        if (seenNames.has(entry.name.toLowerCase())) return false;
        seenNames.add(entry.name.toLowerCase());
        return true;
      })
      .slice(0, 50)
      .map(entry => {
        const basePath = entry._isPublic ? entry._publicPath : dirPath;
        const fullPath = path.join(basePath, entry.name);
        const isDir = entry.isDirectory();
        let size = null;
        
        // Get file size for files
        if (!isDir) {
          try {
            const stats = fs.statSync(fullPath);
            size = formatFileSize(stats.size);
          } catch (e) { /* ignore */ }
        }
        
        return {
          name: entry.name,
          type: isDir ? 'folder' : getFileType(entry.name),
          size: size,
          path: fullPath
        };
      });
    
    // Sort: folders first, then files alphabetically
    items.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Add note about virtual items for Desktop
    let note = null;
    if (isDesktopRequest) {
      note = 'Note: Some desktop icons like Recycle Bin are virtual Windows items, not files.';
    }
    
    return { 
      success: true, 
      directory: dirPath,
      items,
      totalCount: allEntries.length,
      shownCount: items.length,
      note
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Helper: Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// Helper: Get file type from extension
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image', '.svg': 'image',
    '.mp4': 'video', '.mkv': 'video', '.avi': 'video', '.mov': 'video', '.webm': 'video',
    '.mp3': 'audio', '.wav': 'audio', '.flac': 'audio', '.ogg': 'audio',
    '.pdf': 'document', '.doc': 'document', '.docx': 'document', '.txt': 'document', '.rtf': 'document',
    '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.csv': 'spreadsheet',
    '.zip': 'archive', '.rar': 'archive', '.7z': 'archive', '.tar': 'archive', '.gz': 'archive',
    '.exe': 'executable', '.msi': 'executable', '.lnk': 'shortcut',
    '.js': 'code', '.ts': 'code', '.py': 'code', '.java': 'code', '.cpp': 'code', '.html': 'code', '.css': 'code'
  };
  return types[ext] || 'file';
}

// Read file content
async function readFileContent(filePath, maxLines = 100) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(filePath)) {
        resolve({ success: false, error: 'File not found' });
        return;
      }
      
      const stats = fs.statSync(filePath);
      if (stats.size > 1024 * 1024) {
        resolve({ success: false, error: 'File too large' });
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, maxLines).join('\n');
      
      resolve({ success: true, content: lines, path: filePath });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

// Tools definition for Ollama
function getDeepSearchTools() {
  const baseTools = [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the internet for current information, news, facts, or any topic. Use this when you need up-to-date information or facts you are not certain about.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to look up on the internet'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'system_search',
        description: 'Search for files on the local computer/system. Use this to find documents, images, code files, or any files the user might be referring to.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The filename or part of filename to search for'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'read_file',
        description: 'Read the content of a file found through system_search. Use this to get the actual content of a file.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The full path to the file to read'
            }
          },
          required: ['path']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_directory',
        description: 'List files and folders in a directory. Use this when user asks what is on their Desktop, Documents, or any folder.',
        parameters: {
          type: 'object',
          properties: {
            directory: {
              type: 'string',
              description: 'The directory to list. Use "Desktop", "Documents", "Downloads" or a full path.'
            }
          },
          required: ['directory']
        }
      }
    }
  ];
  
  // Add enabled MCP tools
  const mcpTools = getOllamaToolDefinitions();
  return [...baseTools, ...mcpTools];
}

// Get Research Mode tools (subset for research)
// Execute a tool call
async function executeToolCall(toolName, args) {
  console.log('executeToolCall:', toolName, JSON.stringify(args));
  
  // Check for MCP tools first (they start with mcp_)
  if (toolName.startsWith('mcp_')) {
    const mcpToolId = toolName.replace('mcp_', '');
    console.log(`Executing MCP tool: ${mcpToolId}`, args);
    return await executeMcpTool(mcpToolId, args);
  }
  
  switch (toolName) {
    case 'web_search':
      console.log('Calling webSearch with:', args.query);
      const webResult = await webSearch(args.query);
      console.log('webSearch returned:', webResult.success, 'results:', webResult.results?.length || 0);
      return webResult;
    case 'system_search':
      return await systemSearch(args.query);
    case 'read_file':
      return await readFileContent(args.path);
    case 'list_directory':
      console.log('Listing directory:', args.directory);
      return await listDirectory(args.directory);
    default:
      console.log('Unknown tool:', toolName);
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

module.exports = {
  initBrowser,
  closeBrowser,
  webSearch,
  systemSearch,
  readFileContent,
  getDeepSearchTools,
  executeToolCall
};
