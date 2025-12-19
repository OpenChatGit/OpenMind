import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { RefreshCw, Play, Square, RotateCcw, ExternalLink, Download, Trash2, Search, Database, Server, Mic, Image, Brain, Wrench, Package, CheckCircle, Filter, Globe, Star, Clock, ShieldCheck, Store, X, Tag, User, Box } from 'lucide-react';
import { FaDocker } from 'react-icons/fa';

// Icon mapping for plugins
const ICON_MAP = {
  search: Search,
  server: Server,
  database: Database,
  mic: Mic,
  image: Image,
  brain: Brain,
  wrench: Wrench,
  default: Package,
};

// Get icon component from string name
const getIconComponent = (iconName) => {
  return ICON_MAP[iconName] || ICON_MAP.default;
};

// Memoized Plugin Card Component for better scroll performance
const PluginCard = memo(({ 
  plugin, 
  theme, 
  isDark, 
  customIconUrl, 
  isInstalling, 
  isInstalled, 
  isRunning, 
  container,
  onSelect, 
  onInstall, 
  onStart, 
  onStop 
}) => {
  const Icon = getIconComponent(plugin.icon);
  
  return (
    <div
      className="plugin-card"
      onClick={() => onSelect(plugin)}
      style={{
        padding: '14px',
        background: theme.bgTertiary,
        borderRadius: '10px',
        border: `1px solid ${theme.border}`,
        opacity: plugin.comingSoon ? 0.6 : 1,
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
    >
      {/* Icon and Title Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: customIconUrl 
            ? 'transparent' 
            : (plugin.official 
              ? 'rgba(34, 197, 94, 0.15)' 
              : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {customIconUrl ? (
            <img 
              src={customIconUrl} 
              alt={plugin.name}
              loading="lazy"
              style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px' }}
            />
          ) : (
            <Icon 
              size={18} 
              color={plugin.official ? '#22c55e' : theme.textSecondary}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>
              {plugin.name}
            </span>
            {plugin.official && <ShieldCheck size={14} color="#22c55e" />}
          </div>
          <div style={{ color: theme.textMuted, fontSize: '0.75rem' }}>
            {plugin.author} • v{plugin.version}
          </div>
        </div>
      </div>
      
      {/* Description */}
      <p style={{ 
        color: theme.textSecondary, 
        fontSize: '0.8rem', 
        margin: '0 0 10px 0',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        lineHeight: '1.4',
      }}>
        {plugin.description}
      </p>

      {/* Status and Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {plugin.comingSoon && (
            <span style={{
              padding: '2px 6px',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderRadius: '4px',
              fontSize: '0.7rem',
              color: theme.textMuted,
            }}>
              Coming Soon
            </span>
          )}
          {plugin.ui?.hasUI && (
            <span style={{
              padding: '2px 6px',
              background: 'rgba(59, 130, 246, 0.15)',
              borderRadius: '4px',
              fontSize: '0.7rem',
              color: '#3b82f6',
            }}>
              +UI
            </span>
          )}
          {isInstalled && (
            <span style={{
              padding: '2px 6px',
              background: isRunning ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
              borderRadius: '4px',
              fontSize: '0.7rem',
              color: isRunning ? '#22c55e' : theme.textMuted,
              fontWeight: '500',
            }}>
              {isRunning ? 'Running' : 'Stopped'}
            </span>
          )}
        </div>
        
        {/* Quick Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isInstalled) {
              onInstall(plugin);
            } else if (!isRunning) {
              onStart(container?.id);
            } else {
              onStop(container?.id);
            }
          }}
          disabled={isInstalling || plugin.comingSoon}
          style={{
            padding: '6px 10px',
            background: !isInstalled 
              ? (isDark ? '#fff' : '#1a1a1a')
              : (isRunning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'),
            border: 'none',
            borderRadius: '6px',
            color: !isInstalled 
              ? (isDark ? '#000' : '#fff')
              : (isRunning ? '#ef4444' : '#22c55e'),
            fontSize: '0.75rem',
            fontWeight: '500',
            cursor: isInstalling || plugin.comingSoon ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: isInstalling ? 0.7 : 1,
          }}
        >
          {isInstalling ? (
            <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Installing</>
          ) : !isInstalled ? (
            <><Download size={12} /> Install</>
          ) : isRunning ? (
            <><Square size={12} /> Stop</>
          ) : (
            <><Play size={12} /> Start</>
          )}
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - re-render if any of these change
  return (
    prevProps.plugin.id === nextProps.plugin.id &&
    prevProps.plugin.official === nextProps.plugin.official &&
    prevProps.plugin.comingSoon === nextProps.plugin.comingSoon &&
    prevProps.plugin.version === nextProps.plugin.version &&
    prevProps.plugin.ui?.hasUI === nextProps.plugin.ui?.hasUI &&
    prevProps.isInstalling === nextProps.isInstalling &&
    prevProps.isInstalled === nextProps.isInstalled &&
    prevProps.isRunning === nextProps.isRunning &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.customIconUrl === nextProps.customIconUrl
  );
});

/**
 * DockerSettings - Component for displaying Docker status and managing containers
 * @param {boolean} embedded - If true, hides the header (used when embedded in PluginsSettings)
 */
const DockerSettings = ({ theme, isDark, embedded = false }) => {
  const [dockerStatus, setDockerStatus] = useState({ running: false, version: null });
  const [containers, setContainers] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [pluginCategories, setPluginCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pluginsLoading, setPluginsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState({}); // Track loading state per container
  const [serviceLoading, setServiceLoading] = useState({}); // Track loading state per service
  const [activeTab, setActiveTab] = useState('containers'); // 'containers', 'services', or 'store'
  const [showAllContainers, setShowAllContainers] = useState(false); // Filter for openmind containers
  
  // Plugin Store state
  const [storePlugins, setStorePlugins] = useState([]);
  const [storeIconsBaseUrl, setStoreIconsBaseUrl] = useState('');
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeInstalling, setStoreInstalling] = useState({});
  const [selectedPlugin, setSelectedPlugin] = useState(null); // For preview modal
  const [selectedTag, setSelectedTag] = useState(null); // For tag/version selection

  // Load plugins from registry
  const loadPlugins = useCallback(async () => {
    try {
      setPluginsLoading(true);
      const registry = await window.electronAPI?.loadPluginRegistry();
      if (registry?.success) {
        setPlugins(registry.plugins || []);
        setPluginCategories(registry.categories || []);
      }
    } catch (error) {
      console.error('Error loading plugins:', error);
    } finally {
      setPluginsLoading(false);
    }
  }, []);

  // Ref to store previous containers for comparison
  const prevContainersRef = useRef([]);
  
  const loadDockerInfo = useCallback(async () => {
    try {
      const status = await window.electronAPI?.checkDockerStatus();
      setDockerStatus(prev => {
        // Only update if changed
        if (prev.running === status?.running && prev.version === status?.version) {
          return prev;
        }
        return status || { running: false };
      });
      
      if (status?.running) {
        const result = await window.electronAPI?.getDockerContainers();
        if (result?.success) {
          const newContainers = result.containers || [];
          // Only update if containers actually changed (compare by id and state)
          const hasChanged = newContainers.length !== prevContainersRef.current.length ||
            newContainers.some((c, i) => {
              const prev = prevContainersRef.current[i];
              return !prev || c.id !== prev.id || c.state !== prev.state;
            });
          
          if (hasChanged) {
            prevContainersRef.current = newContainers;
            setContainers(newContainers);
          }
        }
      } else {
        if (prevContainersRef.current.length > 0) {
          prevContainersRef.current = [];
          setContainers([]);
        }
      }
    } catch (error) {
      console.error('Error loading Docker info:', error);
      setDockerStatus({ running: false, error: error.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Use ref to track docker status for interval without causing re-renders
  const dockerRunningRef = useRef(dockerStatus.running);
  dockerRunningRef.current = dockerStatus.running;
  
  // Track if component is visible/active
  const isActiveRef = useRef(true);

  // Initial load - only once
  useEffect(() => {
    loadDockerInfo();
    loadPlugins();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Separate interval effect - only refresh when tab is active, much longer interval
  useEffect(() => {
    // Only poll when Docker is running and component is visible
    // Use 60 seconds to reduce CPU usage significantly
    const interval = setInterval(() => {
      if (dockerRunningRef.current && isActiveRef.current && document.visibilityState === 'visible') {
        loadDockerInfo();
      }
    }, 60000); // 60 seconds - much less frequent
    
    // Pause when tab is hidden
    const handleVisibility = () => {
      isActiveRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadDockerInfo]);

  // Memoize filtered plugins to avoid recalculation on every render
  const filteredPlugins = useMemo(() => 
    selectedCategory === 'all' 
      ? plugins 
      : plugins.filter(p => p.category === selectedCategory),
    [plugins, selectedCategory]
  );

  // Memoize container filtering
  const { filteredContainers, openmindCount, runningCount } = useMemo(() => {
    const openmindContainers = containers.filter(c => 
      c.isOpenMindPlugin || 
      c.name?.includes('openmind-') || 
      c.image?.includes('teamaiko/openmindlabs-')
    );
    const filtered = showAllContainers ? containers : openmindContainers;
    return {
      filteredContainers: filtered,
      openmindCount: openmindContainers.length,
      runningCount: filtered.filter(c => c.state === 'running').length
    };
  }, [containers, showAllContainers]);

  // Memoized icon URL resolver to avoid recreating on every render
  const resolveIconUrl = useCallback((url, baseUrl) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replace('github.com/OpenChatGit/OpenMindLabs-Plugins/blob/', 
                         'raw.githubusercontent.com/OpenChatGit/OpenMindLabs-Plugins/');
    }
    return baseUrl ? `${baseUrl}${url}` : null;
  }, []);

  // Get plugin icon URL based on theme
  const getPluginIconUrl = useCallback((plugin, baseUrl) => {
    if (isDark && plugin.iconUrlDark) return resolveIconUrl(plugin.iconUrlDark, baseUrl);
    if (!isDark && plugin.iconUrlLight) return resolveIconUrl(plugin.iconUrlLight, baseUrl);
    if (plugin.iconUrl) return resolveIconUrl(plugin.iconUrl, baseUrl);
    return null;
  }, [isDark, resolveIconUrl]);

  // Memoized container lookup map for O(1) access
  const containerByName = useMemo(() => {
    const map = new Map();
    containers.forEach(c => {
      if (c.name) {
        map.set(c.name, c);
        map.set(`/${c.name}`, c);
        // Also map without leading slash
        if (c.name.startsWith('/')) {
          map.set(c.name.slice(1), c);
        }
      }
    });
    return map;
  }, [containers]);

  // Helper to check if plugin is installed
  const getPluginContainer = useCallback((containerName) => {
    return containerByName.get(containerName) || containerByName.get(`/${containerName}`);
  }, [containerByName]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDockerInfo();
  };

  // Load plugins from online store (GitHub-hosted registry)
  const loadStorePlugins = useCallback(async () => {
    setStoreLoading(true);
    try {
      const result = await window.electronAPI?.loadOnlinePluginRegistry();
      console.log('Plugin registry loaded:', result?.source, result?.plugins?.length, 'plugins');
      if (result?.success) {
        // Force new array reference to trigger re-render
        setStorePlugins([...(result.plugins || [])]);
        setStoreIconsBaseUrl(result.iconsBaseUrl || '');
      }
    } catch (error) {
      console.error('Error loading store plugins:', error);
    } finally {
      setStoreLoading(false);
    }
  }, []);

  // Load store plugins when tab is opened (only on first open)
  const storeLoadedRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'store' && !storeLoadedRef.current && !storeLoading) {
      storeLoadedRef.current = true;
      loadStorePlugins();
    }
  }, [activeTab, storeLoading, loadStorePlugins]);
  
  // Force refresh store plugins (called by refresh button)
  const refreshStorePlugins = useCallback(() => {
    storeLoadedRef.current = true;
    loadStorePlugins();
  }, [loadStorePlugins]);

  // Install plugin from store - fully dynamic, reads all config from plugin registry
  const handleStoreInstall = useCallback(async (plugin, customTag = null) => {
    if (plugin.comingSoon) return;
    
    setStoreInstalling(prev => ({ ...prev, [plugin.id]: true }));
    try {
      let result;
      // Build image name with tag
      let imageName = plugin.image;
      if (customTag) {
        // If custom tag provided, use it
        const baseImage = plugin.image.split(':')[0];
        imageName = `${baseImage}:${customTag}`;
      } else if (!plugin.image.includes(':')) {
        // If no tag in image and no custom tag, use default tag from tags array or 'latest'
        const defaultTag = plugin.tags?.find(t => t.default)?.tag || 'latest';
        imageName = `${plugin.image}:${defaultTag}`;
      }
      
      if (plugin.useCompose) {
        result = await window.electronAPI?.dockerComposeUp(plugin.id);
      } else {
        // Pass all dynamic configuration from the plugin registry
        result = await window.electronAPI?.dockerPullAndRun({
          image: imageName,
          name: plugin.containerName,
          ports: plugin.ports || {},
          env: plugin.env || {},           // Environment variables from registry
          volumes: plugin.volumes || {},    // Volume mounts from registry
          restart: plugin.restart || 'unless-stopped', // Restart policy
        });
      }
      if (result?.success) {
        await loadDockerInfo();
      }
    } catch (error) {
      console.error('Store install error:', error);
    } finally {
      setStoreInstalling(prev => ({ ...prev, [plugin.id]: false }));
    }
  }, [loadDockerInfo]);

  const handleContainerAction = useCallback(async (containerId, action) => {
    setActionLoading(prev => ({ ...prev, [containerId]: action }));
    try {
      let result;
      switch (action) {
        case 'start':
          result = await window.electronAPI?.dockerStartContainer(containerId);
          break;
        case 'stop':
          result = await window.electronAPI?.dockerStopContainer(containerId);
          break;
        case 'restart':
          result = await window.electronAPI?.dockerRestartContainer(containerId);
          break;
        default:
          return;
      }
      if (result?.success) {
        // Refresh container list after action
        await loadDockerInfo();
      }
    } catch (error) {
      console.error(`Error ${action}ing container:`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [containerId]: null }));
    }
  }, [loadDockerInfo]);
  
  // Stable callbacks for PluginCard to prevent re-renders
  const handleStartContainer = useCallback((id) => handleContainerAction(id, 'start'), [handleContainerAction]);
  const handleStopContainer = useCallback((id) => handleContainerAction(id, 'stop'), [handleContainerAction]);

  // Check if a service is installed - uses memoized lookup
  const isServiceInstalled = useCallback((service) => {
    return !!getPluginContainer(service.containerName);
  }, [getPluginContainer]);

  // Get service container - uses memoized lookup
  const getServiceContainer = useCallback((service) => {
    return getPluginContainer(service.containerName);
  }, [getPluginContainer]);

  // Install a service
  const handleInstallService = async (service) => {
    if (service.comingSoon) return;
    setServiceLoading(prev => ({ ...prev, [service.id]: 'installing' }));
    try {
      let result;
      if (service.useCompose) {
        // Use docker-compose for services that need custom config
        result = await window.electronAPI?.dockerComposeUp(service.id);
      } else {
        result = await window.electronAPI?.dockerPullAndRun({
          image: service.image,
          name: service.containerName,
          ports: service.ports,
        });
      }
      if (result?.success) {
        await loadDockerInfo();
      }
    } catch (error) {
      console.error(`Error installing ${service.name}:`, error);
    } finally {
      setServiceLoading(prev => ({ ...prev, [service.id]: null }));
    }
  };

  // Remove a service
  const handleRemoveService = async (service) => {
    const container = getServiceContainer(service);
    if (!container) return;
    setServiceLoading(prev => ({ ...prev, [service.id]: 'removing' }));
    try {
      // Stop first if running
      if (container.state === 'running') {
        await window.electronAPI?.dockerStopContainer(container.id);
      }
      const result = await window.electronAPI?.dockerRemoveContainer(container.id);
      if (result?.success) {
        await loadDockerInfo();
      }
    } catch (error) {
      console.error(`Error removing ${service.name}:`, error);
    } finally {
      setServiceLoading(prev => ({ ...prev, [service.id]: null }));
    }
  };

  // Memoized helper functions
  const getStateColor = useCallback((state) => {
    switch (state?.toLowerCase()) {
      case 'running': return '#22c55e';
      case 'exited': return '#ef4444';
      case 'paused': return '#f59e0b';
      case 'restarting': return '#3b82f6';
      default: return '#6b7280';
    }
  }, []);

  const getStateBg = useCallback((state) => {
    switch (state?.toLowerCase()) {
      case 'running': return 'rgba(34, 197, 94, 0.15)';
      case 'exited': return 'rgba(239, 68, 68, 0.15)';
      case 'paused': return 'rgba(245, 158, 11, 0.15)';
      case 'restarting': return 'rgba(59, 130, 246, 0.15)';
      default: return 'rgba(107, 114, 128, 0.15)';
    }
  }, []);

  // Memoized ActionButton component
  const ActionButton = useCallback(({ icon: Icon, onClick, disabled, loading: isLoading, title, color }) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      style={{
        background: 'transparent',
        border: `1px solid ${theme.border}`,
        borderRadius: '6px',
        padding: '6px',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        color: isLoading ? theme.textMuted : (color || theme.textSecondary),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.background = theme.bgHover;
          e.currentTarget.style.borderColor = color || theme.textSecondary;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = theme.border;
      }}
    >
      <Icon size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
    </button>
  ), [theme.border, theme.textMuted, theme.textSecondary, theme.bgHover]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header - hidden when embedded */}
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ color: theme.text, fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
              Docker
            </h3>
            <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
              Manage Docker containers and view status.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: theme.bgTertiary,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              color: theme.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              opacity: refreshing ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      )}

      {/* Refresh button when embedded (header is hidden) */}
      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: theme.bgTertiary,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              color: theme.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      {dockerStatus.running && (
        <div style={{ display: 'flex', gap: '4px', background: theme.bgTertiary, padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('containers')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === 'containers' ? (isDark ? '#fff' : '#1a1a1a') : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeTab === 'containers' ? (isDark ? '#000' : '#fff') : theme.textSecondary,
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Containers ({containers.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === 'services' ? (isDark ? '#fff' : '#1a1a1a') : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeTab === 'services' ? (isDark ? '#000' : '#fff') : theme.textSecondary,
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Plugins
          </button>
          <button
            onClick={() => setActiveTab('store')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === 'store' ? (isDark ? '#fff' : '#1a1a1a') : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeTab === 'store' ? (isDark ? '#000' : '#fff') : theme.textSecondary,
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Store size={14} />
            Plugin Store
          </button>
        </div>
      )}

      {/* Services Section */}
      {dockerStatus.running && activeTab === 'services' && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ 
                color: theme.textSecondary, 
                fontSize: '0.75rem',
                fontWeight: '600', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px'
              }}>
                Available Plugins
              </label>
              {pluginsLoading && (
                <RefreshCw size={14} style={{ color: theme.textMuted, animation: 'spin 1s linear infinite' }} />
              )}
            </div>
            <p style={{ color: theme.textMuted, fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Install pre-configured containers for OpenMind features
            </p>
          </div>

          {/* Category Filter */}
          {pluginCategories.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '6px 12px',
                  background: selectedCategory === 'all' ? (isDark ? '#fff' : '#1a1a1a') : theme.bgTertiary,
                  border: `1px solid ${selectedCategory === 'all' ? 'transparent' : theme.border}`,
                  borderRadius: '6px',
                  color: selectedCategory === 'all' ? (isDark ? '#000' : '#fff') : theme.textSecondary,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Package size={12} />
                All
              </button>
              {pluginCategories.map(cat => {
                const CatIcon = getIconComponent(cat.icon);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '6px 12px',
                      background: selectedCategory === cat.id ? (isDark ? '#fff' : '#1a1a1a') : theme.bgTertiary,
                      border: `1px solid ${selectedCategory === cat.id ? 'transparent' : theme.border}`,
                      borderRadius: '6px',
                      color: selectedCategory === cat.id ? (isDark ? '#000' : '#fff') : theme.textSecondary,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CatIcon size={12} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredPlugins.length === 0 && !pluginsLoading && (
              <div style={{
                padding: '24px',
                background: theme.bgTertiary,
                borderRadius: '10px',
                border: `1px solid ${theme.border}`,
                textAlign: 'center',
              }}>
                <Package size={24} style={{ color: theme.textMuted, marginBottom: '8px' }} />
                <div style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>
                  No plugins available
                </div>
              </div>
            )}
            {filteredPlugins.map((service) => {
              const Icon = getIconComponent(service.icon);
              const installed = isServiceInstalled(service);
              const container = getServiceContainer(service);
              const isRunning = container?.state === 'running';
              const loading = serviceLoading[service.id];

              return (
                <div
                  key={service.id}
                  style={{
                    padding: '16px',
                    background: theme.bgTertiary,
                    borderRadius: '10px',
                    border: `1px solid ${theme.border}`,
                    opacity: service.comingSoon ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: installed 
                        ? (isRunning ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)')
                        : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={20} color={installed ? (isRunning ? '#22c55e' : theme.textMuted) : theme.textSecondary} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: theme.text, fontSize: '0.95rem', fontWeight: '500' }}>
                          {service.name}
                        </span>
                        {service.comingSoon && (
                          <span style={{
                            padding: '2px 6px',
                            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: theme.textMuted,
                          }}>
                            Coming Soon
                          </span>
                        )}
                        {installed && (
                          <span style={{
                            padding: '2px 6px',
                            background: isRunning ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: isRunning ? '#22c55e' : theme.textMuted,
                            fontWeight: '500',
                          }}>
                            {isRunning ? 'Running' : 'Stopped'}
                          </span>
                        )}
                      </div>
                      <p style={{ color: theme.textSecondary, fontSize: '0.8rem', margin: 0 }}>
                        {service.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {!installed ? (
                        <button
                          onClick={() => handleInstallService(service)}
                          disabled={loading || service.comingSoon}
                          style={{
                            padding: '8px 12px',
                            background: service.comingSoon ? theme.bgHover : (isDark ? '#fff' : '#1a1a1a'),
                            border: 'none',
                            borderRadius: '6px',
                            color: service.comingSoon ? theme.textMuted : (isDark ? '#000' : '#fff'),
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: loading || service.comingSoon ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: loading ? 0.7 : 1,
                          }}
                        >
                          <Download size={14} style={{ animation: loading === 'installing' ? 'spin 1s linear infinite' : 'none' }} />
                          {loading === 'installing' ? 'Installing...' : 'Install'}
                        </button>
                      ) : (
                        <>
                          {!isRunning ? (
                            <button
                              onClick={() => handleContainerAction(container.id, 'start')}
                              disabled={actionLoading[container.id]}
                              style={{
                                padding: '8px 12px',
                                background: 'rgba(34, 197, 94, 0.15)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#22c55e',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <Play size={14} />
                              Start
                            </button>
                          ) : (
                            <button
                              onClick={() => handleContainerAction(container.id, 'stop')}
                              disabled={actionLoading[container.id]}
                              style={{
                                padding: '8px 12px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#ef4444',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <Square size={14} />
                              Stop
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveService(service)}
                            disabled={loading}
                            title="Remove"
                            style={{
                              padding: '8px',
                              background: 'transparent',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '6px',
                              color: theme.textSecondary,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={14} style={{ animation: loading === 'removing' ? 'spin 1s linear infinite' : 'none' }} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Containers Section */}
      {dockerStatus.running && activeTab === 'containers' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <label style={{ 
              color: theme.textSecondary, 
              fontSize: '0.75rem',
              fontWeight: '600', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px'
            }}>
              {showAllContainers ? `All Containers (${containers.length})` : `OpenMind Containers (${openmindCount})`}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: theme.textMuted, fontSize: '0.7rem' }}>
                {runningCount} running
              </span>
              <button
                onClick={() => setShowAllContainers(!showAllContainers)}
                style={{
                  padding: '4px 8px',
                  background: showAllContainers ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  color: theme.textSecondary,
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                      {showAllContainers ? 'Show OpenMind Only' : 'Show All'}
                    </button>
                  </div>
                </div>
          
          {filteredContainers.length === 0 ? (
            <div style={{
              padding: '32px',
              background: theme.bgTertiary,
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              textAlign: 'center',
            }}>
              <FaDocker size={32} style={{ fill: theme.textMuted }} />
              <div style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>
                No containers found
              </div>
              <div style={{ color: theme.textMuted, fontSize: '0.8rem', marginTop: '4px' }}>
                Start a container to see it here
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredContainers.map((container) => {
                const isRunning = container.state === 'running';
                const isLoading = actionLoading[container.id];
                
                return (
                  <div
                    key={container.id}
                    style={{
                      padding: '14px 16px',
                      background: theme.bgTertiary,
                      borderRadius: '10px',
                      border: `1px solid ${theme.border}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Container Header */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      marginBottom: '10px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '150px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getStateColor(container.state),
                          boxShadow: isRunning ? `0 0 6px ${getStateColor(container.state)}` : 'none',
                          flexShrink: 0,
                        }} />
                        <span style={{ 
                          color: theme.text, 
                          fontSize: '0.95rem', 
                          fontWeight: '500',
                          wordBreak: 'break-word',
                        }}>
                          {container.name}
                        </span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {isRunning ? (
                          <>
                            <ActionButton
                              icon={RotateCcw}
                              onClick={() => handleContainerAction(container.id, 'restart')}
                              loading={isLoading === 'restart'}
                              disabled={!!isLoading}
                              title="Restart"
                              color="#3b82f6"
                            />
                            <ActionButton
                              icon={Square}
                              onClick={() => handleContainerAction(container.id, 'stop')}
                              loading={isLoading === 'stop'}
                              disabled={!!isLoading}
                              title="Stop"
                              color="#ef4444"
                            />
                          </>
                        ) : (
                          <ActionButton
                            icon={Play}
                            onClick={() => handleContainerAction(container.id, 'start')}
                            loading={isLoading === 'start'}
                            disabled={!!isLoading}
                            title="Start"
                            color="#22c55e"
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Container Info */}
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '8px 16px',
                      fontSize: '0.8rem',
                      color: theme.textSecondary,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: theme.textMuted }}>Image:</span>
                        <span style={{ 
                          color: theme.text,
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}>
                          {container.image?.split(':')[0]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: theme.textMuted }}>Status:</span>
                        <span style={{
                          padding: '2px 6px',
                          background: getStateBg(container.state),
                          color: getStateColor(container.state),
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '500',
                          textTransform: 'capitalize',
                        }}>
                          {container.state || 'unknown'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Ports */}
                    {container.ports && container.ports.length > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '6px', 
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: `1px solid ${theme.border}`,
                      }}>
                        {container.ports.map((port, idx) => {
                          // Extract host port for clickable link
                          const hostPortMatch = port.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
                          const hostPort = hostPortMatch ? hostPortMatch[2] : null;
                          
                          return (
                            <span
                              key={idx}
                              onClick={() => {
                                if (hostPort && isRunning) {
                                  window.electronAPI?.openExternal(`http://localhost:${hostPort}`);
                                }
                              }}
                              style={{
                                padding: '4px 8px',
                                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: theme.text,
                                fontFamily: 'monospace',
                                cursor: hostPort && isRunning ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                if (hostPort && isRunning) {
                                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                              }}
                              title={hostPort && isRunning ? `Open localhost:${hostPort}` : port}
                            >
                              {port}
                              {hostPort && isRunning && <ExternalLink size={10} />}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Plugin Store Section */}
      {dockerStatus.running && activeTab === 'store' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <label style={{ 
                  color: theme.textSecondary, 
                  fontSize: '0.75rem',
                  fontWeight: '600', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  OpenMind Plugin Store
                </label>
                <p style={{ color: theme.textMuted, fontSize: '0.8rem', margin: 0 }}>
                  Verified plugins designed for OpenMind
                </p>
              </div>
              <button
                onClick={refreshStorePlugins}
                disabled={storeLoading}
                style={{
                  padding: '8px 12px',
                  background: theme.bgTertiary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  color: theme.textSecondary,
                  fontSize: '0.8rem',
                  cursor: storeLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} style={{ animation: storeLoading ? 'spin 1s linear infinite' : 'none' }} />
                Refresh
              </button>
            </div>
          </div>

          {/* Store Plugins - Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {storeLoading && storePlugins.length === 0 && (
              <div style={{
                gridColumn: '1 / -1',
                padding: '32px',
                background: theme.bgTertiary,
                borderRadius: '10px',
                border: `1px solid ${theme.border}`,
                textAlign: 'center',
              }}>
                <RefreshCw size={24} style={{ color: theme.textMuted, marginBottom: '8px', animation: 'spin 1s linear infinite' }} />
                <div style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>
                  Loading plugins...
                </div>
              </div>
            )}
            {!storeLoading && storePlugins.length === 0 && (
              <div style={{
                gridColumn: '1 / -1',
                padding: '32px',
                background: theme.bgTertiary,
                borderRadius: '10px',
                border: `1px solid ${theme.border}`,
                textAlign: 'center',
              }}>
                <Store size={32} style={{ color: theme.textMuted, marginBottom: '8px' }} />
                <div style={{ color: theme.text, fontSize: '0.95rem', fontWeight: '500', marginBottom: '4px' }}>
                  No plugins available
                </div>
                <div style={{ color: theme.textSecondary, fontSize: '0.85rem' }}>
                  Check back later for new plugins
                </div>
              </div>
            )}
            {storePlugins.map((plugin) => {
              const container = getPluginContainer(plugin.containerName);
              return (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  theme={theme}
                  isDark={isDark}
                  customIconUrl={getPluginIconUrl(plugin, storeIconsBaseUrl)}
                  isInstalling={storeInstalling[plugin.id]}
                  isInstalled={!!container}
                  isRunning={container?.state === 'running'}
                  container={container}
                  onSelect={setSelectedPlugin}
                  onInstall={handleStoreInstall}
                  onStart={handleStartContainer}
                  onStop={handleStopContainer}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Plugin Preview Modal */}
      {selectedPlugin && (
        <div
          onClick={() => { setSelectedPlugin(null); setSelectedTag(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.bg,
              borderRadius: '12px',
              width: '500px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'hidden',
              border: `1px solid ${theme.border}`,
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {(() => {
                  const Icon = getIconComponent(selectedPlugin.icon);
                  const iconUrl = getPluginIconUrl(selectedPlugin, storeIconsBaseUrl);
                  
                  return (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      background: iconUrl ? 'transparent' : 'rgba(34, 197, 94, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {iconUrl ? (
                        <img src={iconUrl} alt={selectedPlugin.name} style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '10px' }} />
                      ) : (
                        <Icon size={24} color="#22c55e" />
                      )}
                    </div>
                  );
                })()}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, color: theme.text, fontSize: '1.1rem' }}>{selectedPlugin.name}</h3>
                    {selectedPlugin.official && <ShieldCheck size={16} color="#22c55e" />}
                  </div>
                  <div style={{ color: theme.textMuted, fontSize: '0.85rem' }}>
                    by {selectedPlugin.author}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSelectedPlugin(null); setSelectedTag(null); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(80vh - 140px)' }}>
              <p style={{ color: theme.textSecondary, margin: '0 0 16px 0', lineHeight: '1.6' }}>
                {selectedPlugin.description}
              </p>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: theme.bgTertiary, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.textMuted, fontSize: '0.75rem', marginBottom: '4px' }}>
                    <Tag size={12} /> Version
                  </div>
                  <div style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>{selectedPlugin.version}</div>
                </div>
                <div style={{ padding: '12px', background: theme.bgTertiary, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.textMuted, fontSize: '0.75rem', marginBottom: '4px' }}>
                    <User size={12} /> Author
                  </div>
                  <div style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>{selectedPlugin.author}</div>
                </div>
                <div style={{ padding: '12px', background: theme.bgTertiary, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.textMuted, fontSize: '0.75rem', marginBottom: '4px' }}>
                    <Box size={12} /> Image
                  </div>
                  <div style={{ color: theme.text, fontSize: '0.8rem', fontFamily: 'monospace' }}>{selectedPlugin.image}</div>
                </div>
                <div style={{ padding: '12px', background: theme.bgTertiary, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.textMuted, fontSize: '0.75rem', marginBottom: '4px' }}>
                    <Globe size={12} /> Category
                  </div>
                  <div style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500', textTransform: 'capitalize' }}>{selectedPlugin.category}</div>
                </div>
              </div>

              {/* Tag/Version Selection */}
              {selectedPlugin.tags && selectedPlugin.tags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: theme.textMuted, fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Select Version / Tag
                  </div>
                  <select
                    value={selectedTag || selectedPlugin.tags.find(t => t.default)?.tag || selectedPlugin.tags[0]?.tag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: theme.bgTertiary,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      color: theme.text,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {selectedPlugin.tags.map(t => (
                      <option key={t.tag} value={t.tag}>
                        {t.label} {t.default ? '(Default)' : ''} - {t.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Features */}
              {selectedPlugin.features && selectedPlugin.features.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: theme.textMuted, fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase' }}>Features</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedPlugin.features.map(f => (
                      <span key={f} style={{
                        padding: '4px 10px',
                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        color: theme.textSecondary,
                      }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* UI Components Info */}
              {selectedPlugin.ui?.hasUI && (
                <div style={{ 
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    color: '#3b82f6',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    marginBottom: '6px'
                  }}>
                    <Wrench size={14} />
                    Adds UI Components
                  </div>
                  <div style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>
                    {selectedPlugin.ui.buttons?.length > 0 && (
                      <span>
                        This plugin adds {selectedPlugin.ui.buttons.length} button{selectedPlugin.ui.buttons.length > 1 ? 's' : ''} to the chat interface when running.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedPlugin.dockerHub && (
                  <button
                    onClick={() => window.electronAPI?.openExternal(selectedPlugin.dockerHub)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'transparent',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      color: theme.textSecondary,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <FaDocker size={16} /> View on Docker Hub
                  </button>
                )}
                {!selectedPlugin.comingSoon && (
                  <button
                    onClick={() => {
                      const isInstalled = !!getPluginContainer(selectedPlugin.containerName);
                      if (!isInstalled) {
                        // Use selected tag or default
                        const tagToUse = selectedTag || selectedPlugin.tags?.find(t => t.default)?.tag || null;
                        handleStoreInstall(selectedPlugin, tagToUse);
                      }
                      setSelectedPlugin(null);
                      setSelectedTag(null);
                    }}
                    disabled={storeInstalling[selectedPlugin.id]}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: isDark ? '#fff' : '#1a1a1a',
                      border: 'none',
                      borderRadius: '8px',
                      color: isDark ? '#000' : '#fff',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Download size={16} /> Install Plugin
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help text when Docker not running */}
      {!dockerStatus.running && !loading && (
        <div style={{
          padding: '20px',
          background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          <div style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>
            Docker not detected
          </div>
          <div style={{ color: theme.textSecondary, fontSize: '0.85rem', lineHeight: 1.6 }}>
            Make sure Docker Desktop is installed and running. Some features like SearXNG require Docker.
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .plugin-card {
          will-change: transform, border-color;
          backface-visibility: hidden;
        }
        .plugin-card:hover {
          border-color: ${theme.textMuted} !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default memo(DockerSettings);
