import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { 
  Code2, RefreshCw, Image, CheckCircle, Power, PowerOff,
  Globe, Zap, Package, ShieldCheck, Store, Download, Trash2
} from 'lucide-react';
import { getAPIPluginRegistry, getInstalledPlugins, invalidateCache } from '../utils/scanCache';

// Fallback plugins if registry can't be loaded
const FALLBACK_PLUGINS = [
  {
    id: 'openmind-image-gen',
    name: 'Image Generation',
    description: 'Generate images from text prompts using local Stable Diffusion models. Supports SDXL-Turbo, SD 1.5 and custom models.',
    version: '1.0.0',
    author: 'OpenMindLabs',
    category: 'media',
    provides: ['image-gen-api', 'ui-api'],
    official: true,
    type: 'native',
    icon: 'image',
    requirements: ['Python 3.8+', 'torch', 'diffusers'],
  },
];

// Memoized Plugin Card Component
const PluginCard = memo(({ plugin, theme, isDark, isEnabled, isEnabling, onToggle, onInstall, onUninstall, isInstalling, iconUrl }) => {
  // Get icon for plugin (fallback)
  const Icon = useMemo(() => {
    switch (plugin.icon || plugin.category) {
      case 'Image':
      case 'image':
      case 'media': return Image;
      case 'ai': return Zap;
      case 'voice': return Globe;
      default: return Package;
    }
  }, [plugin.icon, plugin.category]);

  // Get category color - neutral to match UI
  const categoryColor = useMemo(() => {
    return theme.textSecondary;
  }, [theme.textSecondary]);

  return (
    <div
      style={{
        padding: '16px',
        background: theme.bgTertiary,
        borderRadius: '10px',
        border: `1px solid ${isEnabled ? '#22c55e40' : theme.border}`,
        opacity: plugin.comingSoon ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: iconUrl ? 'transparent' : `${categoryColor}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {iconUrl ? (
            <img 
              src={iconUrl} 
              alt={plugin.name}
              loading="lazy"
              style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '10px' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <Icon size={20} color={categoryColor} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: theme.text, fontSize: '0.95rem', fontWeight: '600' }}>
              {plugin.name}
            </span>
            {plugin.official && <ShieldCheck size={14} color="#22c55e" />}
            {plugin.type === 'native' && (
              <span style={{
                padding: '2px 6px',
                background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                borderRadius: '4px',
                fontSize: '0.65rem',
                color: theme.textSecondary,
                fontWeight: '500',
              }}>
                LOCAL
              </span>
            )}
          </div>
          <div style={{ color: theme.textMuted, fontSize: '0.75rem', marginTop: '2px' }}>
            {plugin.author} • v{plugin.version}
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{ 
        color: theme.textSecondary, 
        fontSize: '0.85rem', 
        margin: '0 0 12px 0',
        lineHeight: '1.5',
      }}>
        {plugin.description}
      </p>

      {/* Requirements for native plugins */}
      {plugin.requirements && (
        <div style={{ 
          marginBottom: '12px', 
          padding: '8px 10px', 
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: theme.textMuted,
        }}>
          <span style={{ fontWeight: '500' }}>Requires:</span> {
            Array.isArray(plugin.requirements) 
              ? plugin.requirements.join(', ')
              : plugin.requirements.optional 
                ? `Optional: ${plugin.requirements.optional.join(', ')}`
                : plugin.requirements.packages 
                  ? plugin.requirements.packages.join(', ')
                  : JSON.stringify(plugin.requirements)
          }
        </div>
      )}

      {/* Provides Tags */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {plugin.provides?.map(api => (
          <span
            key={api}
            style={{
              padding: '3px 8px',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              borderRadius: '4px',
              fontSize: '0.7rem',
              color: theme.textSecondary,
              fontFamily: 'monospace',
            }}
          >
            {api}
          </span>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Install/Uninstall Button */}
        {plugin.notInstalled ? (
          <button
            onClick={() => onInstall(plugin)}
            disabled={plugin.comingSoon || isInstalling}
            style={{
              flex: 1,
              padding: '10px',
              background: plugin.comingSoon ? theme.bgSecondary : (isDark ? '#fff' : '#1a1a1a'),
              border: 'none',
              borderRadius: '8px',
              color: plugin.comingSoon ? theme.textMuted : (isDark ? '#000' : '#fff'),
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: plugin.comingSoon || isInstalling ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: isInstalling ? 0.7 : 1,
            }}
          >
            {isInstalling ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Installing...
              </>
            ) : plugin.comingSoon ? (
              'Coming Soon'
            ) : (
              <>
                <Download size={16} />
                Install
              </>
            )}
          </button>
        ) : (
          <>
            {/* Enable/Disable Button */}
            <button
              onClick={() => onToggle(plugin)}
              disabled={isEnabling}
              style={{
                flex: 1,
                padding: '10px',
                background: isEnabled 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : (isDark ? '#fff' : '#1a1a1a'),
                border: 'none',
                borderRadius: '8px',
                color: isEnabled ? '#ef4444' : (isDark ? '#000' : '#fff'),
                fontSize: '0.85rem',
                fontWeight: '500',
                cursor: isEnabling ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: isEnabling ? 0.7 : 1,
              }}
            >
              {isEnabling ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  {isEnabled ? 'Disabling...' : 'Enabling...'}
                </>
              ) : isEnabled ? (
                <>
                  <PowerOff size={16} />
                  Disable
                </>
              ) : (
                <>
                  <Power size={16} />
                  Enable
                </>
              )}
            </button>
            
            {/* Uninstall Button */}
            <button
              onClick={() => onUninstall(plugin)}
              disabled={isEnabling || isEnabled}
              title={isEnabled ? 'Disable plugin first' : 'Uninstall plugin'}
              style={{
                padding: '10px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: 'none',
                borderRadius: '8px',
                color: isEnabled ? theme.textMuted : '#ef4444',
                cursor: isEnabling || isEnabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isEnabled ? 0.5 : 1,
              }}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
});

PluginCard.displayName = 'PluginCard';

/**
 * APIPlugins - Native JavaScript/Python plugins that use the OpenMind Plugin API
 * These plugins can extend functionality without Docker
 */
const APIPlugins = ({ theme, isDark }) => {
  const [availablePlugins, setAvailablePlugins] = useState(FALLBACK_PLUGINS);
  const [installedPlugins, setInstalledPlugins] = useState([]);
  const [iconsBaseUrl, setIconsBaseUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');
  const [enablingPlugin, setEnablingPlugin] = useState(null);
  const [installingPlugin, setInstallingPlugin] = useState(null);
  
  // Prevent double-loading
  const loadedRef = useRef(false);

  // Resolve icon URL (relative to base or absolute)
  const resolveIconUrl = useCallback((url, baseUrl) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return baseUrl ? `${baseUrl}${url}` : null;
  }, []);

  // Get plugin icon URL based on theme - memoize with iconsBaseUrl
  const getPluginIconUrl = useCallback((plugin) => {
    if (isDark && plugin.iconUrlDark) return resolveIconUrl(plugin.iconUrlDark, iconsBaseUrl);
    if (!isDark && plugin.iconUrlLight) return resolveIconUrl(plugin.iconUrlLight, iconsBaseUrl);
    if (plugin.iconUrl) return resolveIconUrl(plugin.iconUrl, iconsBaseUrl);
    return null;
  }, [isDark, iconsBaseUrl, resolveIconUrl]);

  // Load plugins from registry using centralized cache
  const loadPlugins = useCallback(async (force = false) => {
    // Prevent double-loading unless forced
    if (loadedRef.current && !force) return;
    loadedRef.current = true;
    
    setLoading(true);
    try {
      // Use centralized cache for registry and installed plugins
      const [registryResult, installedPluginIds] = await Promise.all([
        getAPIPluginRegistry(force),
        getInstalledPlugins(force),
      ]);
      
      const actuallyInstalledIds = new Set(installedPluginIds || []);
      const installCheckAvailable = installedPluginIds !== null;
      
      let plugins = FALLBACK_PLUGINS;
      let iconsUrl = '';
      
      if (registryResult?.plugins?.length > 0) {
        iconsUrl = registryResult.iconsBaseUrl || '';
        setIconsBaseUrl(iconsUrl);
        
        // Transform registry format to component format
        plugins = registryResult.plugins.map(p => ({
          ...p,
          type: p.type || 'native',
          requirements: p.requirements?.packages 
            ? [`Python ${p.requirements.python || '3.8+'}`, ...p.requirements.packages]
            : p.requirements,
          notInstalled: installCheckAvailable ? !actuallyInstalledIds.has(p.id) : false,
        }));
      }
      
      setAvailablePlugins(plugins);
      
      // Load enabled plugins from localStorage
      const enabledPluginIds = JSON.parse(localStorage.getItem('enabled-native-plugins') || '[]');
      
      // Only show as "enabled" if plugin exists and is installed
      const validEnabledIds = enabledPluginIds.filter(id => 
        plugins.some(p => p.id === id && !p.notInstalled)
      );
      
      // Clean up localStorage if needed
      if (installCheckAvailable && validEnabledIds.length !== enabledPluginIds.length) {
        localStorage.setItem('enabled-native-plugins', JSON.stringify(validEnabledIds));
      }
      
      const installed = plugins.filter(p => validEnabledIds.includes(p.id));
      setInstalledPlugins(installed);
      
    } catch (error) {
      console.error('Error loading plugins:', error);
      setAvailablePlugins(FALLBACK_PLUGINS);
      setInstalledPlugins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once on mount
  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // Enable/disable a native plugin
  const togglePlugin = useCallback(async (plugin) => {
    if (plugin.comingSoon || plugin.type === 'api') return;
    
    setEnablingPlugin(plugin.id);
    
    try {
      const enabledPlugins = JSON.parse(localStorage.getItem('enabled-native-plugins') || '[]');
      const isEnabled = enabledPlugins.includes(plugin.id);
      
      if (isEnabled) {
        // Disable plugin
        const newEnabled = enabledPlugins.filter(id => id !== plugin.id);
        localStorage.setItem('enabled-native-plugins', JSON.stringify(newEnabled));
        setInstalledPlugins(prev => prev.filter(p => p.id !== plugin.id));
      } else {
        // Enable plugin
        const newEnabled = [...enabledPlugins, plugin.id];
        localStorage.setItem('enabled-native-plugins', JSON.stringify(newEnabled));
        setInstalledPlugins(prev => [...prev, plugin]);
        
        // Try to load the native plugin
        await window.electronAPI?.nativePluginsScan?.();
      }
      
      // Trigger a reload notification
      window.dispatchEvent(new CustomEvent('plugin-state-changed', { 
        detail: { pluginId: plugin.id, enabled: !isEnabled } 
      }));
      
    } catch (error) {
      console.error('Error toggling plugin:', error);
    } finally {
      setEnablingPlugin(null);
    }
  }, []);

  // Install a plugin from GitHub
  const installPlugin = useCallback(async (plugin) => {
    if (!plugin.path) {
      console.error('[APIPlugins] Plugin has no path:', plugin.id);
      return;
    }
    
    setInstallingPlugin(plugin.id);
    
    try {
      const result = await window.electronAPI?.downloadPlugin?.(plugin.id, plugin.path);
      
      if (result?.success) {
        // Invalidate caches and reload
        invalidateCache('installedPlugins');
        invalidateCache('apiPluginRegistry');
        loadedRef.current = false;
        await loadPlugins(true);
      } else {
        console.error('[APIPlugins] Install failed:', result?.error);
        alert(`Failed to install plugin: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[APIPlugins] Install error:', error);
      alert(`Failed to install plugin: ${error.message}`);
    } finally {
      setInstallingPlugin(null);
    }
  }, [loadPlugins]);

  // Uninstall a plugin
  const uninstallPlugin = useCallback(async (plugin) => {
    if (!plugin.path) {
      console.error('[APIPlugins] Plugin has no path:', plugin.id);
      return;
    }
    
    // Confirm uninstall
    if (!confirm(`Are you sure you want to uninstall "${plugin.name}"?`)) {
      return;
    }
    
    try {
      // First disable if enabled
      const enabledPlugins = JSON.parse(localStorage.getItem('enabled-native-plugins') || '[]');
      if (enabledPlugins.includes(plugin.id)) {
        const newEnabled = enabledPlugins.filter(id => id !== plugin.id);
        localStorage.setItem('enabled-native-plugins', JSON.stringify(newEnabled));
      }
      
      const result = await window.electronAPI?.uninstallPlugin?.(plugin.id, plugin.path);
      
      if (result?.success) {
        // Invalidate caches and reload
        invalidateCache('installedPlugins');
        invalidateCache('apiPluginRegistry');
        loadedRef.current = false;
        await loadPlugins(true);
      } else {
        console.error('[APIPlugins] Uninstall failed:', result?.error);
        alert(`Failed to uninstall plugin: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[APIPlugins] Uninstall error:', error);
      alert(`Failed to uninstall plugin: ${error.message}`);
    }
  }, [loadPlugins]);

  // Memoize enabled plugin IDs for quick lookup
  const enabledPluginIds = useMemo(() => 
    new Set(installedPlugins.map(p => p.id)), 
    [installedPlugins]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div>
        <h3 style={{ color: theme.text, fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={20} />
          API Plugins
        </h3>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          Enable local plugins or connect to cloud AI services. Native plugins run locally without Docker.
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('installed')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'installed' ? theme.bgActive : 'transparent',
            border: `1px solid ${activeTab === 'installed' ? 'transparent' : theme.border}`,
            borderRadius: '6px',
            color: activeTab === 'installed' ? theme.text : theme.textSecondary,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CheckCircle size={14} />
          Enabled ({installedPlugins.length})
        </button>
        <button
          onClick={() => setActiveTab('browse')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'browse' ? theme.bgActive : 'transparent',
            border: `1px solid ${activeTab === 'browse' ? 'transparent' : theme.border}`,
            borderRadius: '6px',
            color: activeTab === 'browse' ? theme.text : theme.textSecondary,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Store size={14} />
          Browse All
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          color: theme.textSecondary,
        }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
          <div>Loading plugins...</div>
        </div>
      ) : activeTab === 'installed' ? (
        installedPlugins.length === 0 ? (
          <div style={{
            padding: '40px',
            background: theme.bgTertiary,
            borderRadius: '10px',
            border: `1px solid ${theme.border}`,
            textAlign: 'center',
          }}>
            <Package size={32} color={theme.textMuted} style={{ marginBottom: '12px' }} />
            <div style={{ color: theme.text, fontSize: '0.95rem', fontWeight: '500', marginBottom: '6px' }}>
              No plugins enabled
            </div>
            <div style={{ color: theme.textSecondary, fontSize: '0.85rem', marginBottom: '16px' }}>
              Browse available plugins and enable the ones you need.
            </div>
            <button
              onClick={() => setActiveTab('browse')}
              style={{
                padding: '10px 20px',
                background: isDark ? '#fff' : '#1a1a1a',
                border: 'none',
                borderRadius: '8px',
                color: isDark ? '#000' : '#fff',
                fontSize: '0.85rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Store size={16} />
              Browse Plugins
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '12px' 
          }}>
            {installedPlugins.map(plugin => (
              <PluginCard 
                key={plugin.id} 
                plugin={plugin} 
                theme={theme}
                isDark={isDark}
                isEnabled={true}
                isEnabling={enablingPlugin === plugin.id}
                onToggle={togglePlugin}
                onInstall={installPlugin}
                onUninstall={uninstallPlugin}
                isInstalling={installingPlugin === plugin.id}
                iconUrl={getPluginIconUrl(plugin)}
              />
            ))}
          </div>
        )
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '12px' 
        }}>
          {availablePlugins.map(plugin => (
            <PluginCard 
              key={plugin.id} 
              plugin={plugin}
              theme={theme}
              isDark={isDark}
              isEnabled={enabledPluginIds.has(plugin.id)}
              isEnabling={enablingPlugin === plugin.id}
              onToggle={togglePlugin}
              onInstall={installPlugin}
              onUninstall={uninstallPlugin}
              isInstalling={installingPlugin === plugin.id}
              iconUrl={getPluginIconUrl(plugin)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default APIPlugins;
