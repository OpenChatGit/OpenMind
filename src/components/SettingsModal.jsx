import { useState, useEffect } from 'react';
import { X, Settings, Cpu, Globe, ChevronRight, Check, Loader2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const TABS = [
  { id: 'general', name: 'General', icon: Settings },
  { id: 'inference', name: 'Inference', icon: Cpu },
];

const INFERENCE_PROVIDERS = [
  { 
    id: 'local', 
    name: 'Local (Ollama)', 
    description: 'Run models on your machine',
    icon: '💻',
    requiresConfig: false
  },
  { 
    id: 'huggingface', 
    name: 'Hugging Face', 
    description: 'Cloud inference with HF Pro',
    icon: '🤗',
    requiresConfig: true,
    configFields: ['apiKey']
  },
  { 
    id: 'remote-ollama', 
    name: 'Remote Ollama', 
    description: 'Connect to external Ollama server',
    icon: '🌐',
    requiresConfig: true,
    configFields: ['host', 'port']
  },
];

const GeneralSettings = () => {
  const { theme, themeName, setTheme, isDark } = useTheme();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Theme Selection */}
      <div>
        <label style={{ 
          display: 'block', 
          color: '#aaa', 
          fontSize: '0.85rem',
          marginBottom: '12px',
          fontWeight: '500'
        }}>
          Appearance
        </label>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Dark Mode */}
          <div
            onClick={() => setTheme('dark')}
            style={{
              flex: 1,
              padding: '16px',
              background: themeName === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
              border: themeName === 'dark' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '100%',
              height: '60px',
              background: '#1e1e1e',
              borderRadius: '8px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <Moon size={24} color="#888" />
            </div>
            <div style={{ color: themeName === 'dark' ? '#fff' : '#888', fontWeight: '500', fontSize: '0.9rem' }}>
              Dark
            </div>
            {themeName === 'dark' && (
              <Check size={16} style={{ color: '#6366f1', marginTop: '8px' }} />
            )}
          </div>
          
          {/* Light Mode */}
          <div
            onClick={() => setTheme('light')}
            style={{
              flex: 1,
              padding: '16px',
              background: themeName === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
              border: themeName === 'light' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '100%',
              height: '60px',
              background: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0,0,0,0.1)'
            }}>
              <Sun size={24} color="#666" />
            </div>
            <div style={{ color: themeName === 'light' ? '#fff' : '#888', fontWeight: '500', fontSize: '0.9rem' }}>
              Light
            </div>
            {themeName === 'light' && (
              <Check size={16} style={{ color: '#6366f1', marginTop: '8px' }} />
            )}
          </div>
        </div>
      </div>
      
      <div style={{ 
        padding: '12px 16px', 
        background: 'rgba(99, 102, 241, 0.1)', 
        borderRadius: '8px',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}>
        <p style={{ color: '#a5b4fc', fontSize: '0.85rem', margin: 0 }}>
          💡 Theme changes are applied immediately and saved automatically.
        </p>
      </div>
    </div>
  );
};

const SettingsModal = ({ isOpen, onClose, settings, onSaveSettings }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [localSettings, setLocalSettings] = useState({
    inferenceProvider: 'local',
    hfApiKey: '',
    remoteOllamaHost: '',
    remoteOllamaPort: '11434',
    theme: 'dark',
    ...settings
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings({
        inferenceProvider: 'local',
        hfApiKey: '',
        remoteOllamaHost: '',
        remoteOllamaPort: '11434',
        theme: 'dark',
        ...settings
      });
      setTestResult(null);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      if (localSettings.inferenceProvider === 'huggingface') {
        // Test HF API
        const response = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: { 'Authorization': `Bearer ${localSettings.hfApiKey}` }
        });
        if (response.ok) {
          const data = await response.json();
          setTestResult({ success: true, message: `Connected as ${data.name}` });
        } else {
          setTestResult({ success: false, message: 'Invalid API key' });
        }
      } else if (localSettings.inferenceProvider === 'remote-ollama') {
        // Test remote Ollama
        const host = localSettings.remoteOllamaHost;
        const port = localSettings.remoteOllamaPort || '11434';
        const response = await fetch(`http://${host}:${port}/api/tags`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          const data = await response.json();
          setTestResult({ success: true, message: `Connected! ${data.models?.length || 0} models available` });
        } else {
          setTestResult({ success: false, message: 'Could not connect' });
        }
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#1a1a1c',
        borderRadius: '16px',
        width: '700px',
        maxWidth: '90vw',
        height: '500px',
        maxHeight: '80vh',
        display: 'flex',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Sidebar */}
        <div style={{
          width: '200px',
          background: '#141416',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '20px 12px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            color: '#fff',
            marginBottom: '20px',
            paddingLeft: '12px'
          }}>
            Settings
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: isActive ? '#fff' : '#888',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? '500' : '400',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={18} />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#fff', margin: 0 }}>
              {TABS.find(t => t.id === activeTab)?.name}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            {activeTab === 'general' && (
              <GeneralSettings />
            )}

            {activeTab === 'inference' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    color: '#aaa', 
                    fontSize: '0.85rem',
                    marginBottom: '12px',
                    fontWeight: '500'
                  }}>
                    Inference Provider
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {INFERENCE_PROVIDERS.map(provider => {
                      const isSelected = localSettings.inferenceProvider === provider.id;
                      return (
                        <div
                          key={provider.id}
                          onClick={() => setLocalSettings(s => ({ ...s, inferenceProvider: provider.id }))}
                          style={{
                            padding: '12px 16px',
                            background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                            border: isSelected ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ fontSize: '1.5rem' }}>{provider.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>
                              {provider.name}
                            </div>
                            <div style={{ color: '#888', fontSize: '0.8rem' }}>
                              {provider.description}
                            </div>
                          </div>
                          {isSelected && (
                            <Check size={18} style={{ color: '#4ade80' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Provider-specific config */}
                {localSettings.inferenceProvider === 'huggingface' && (
                  <div style={{
                    padding: '16px',
                    background: 'rgba(255,210,30,0.05)',
                    border: '1px solid rgba(255,210,30,0.2)',
                    borderRadius: '10px'
                  }}>
                    <label style={{ 
                      display: 'block', 
                      color: '#FFD21E', 
                      fontSize: '0.85rem',
                      marginBottom: '8px',
                      fontWeight: '500'
                    }}>
                      🤗 Hugging Face API Key
                    </label>
                    <input
                      type="password"
                      value={localSettings.hfApiKey}
                      onChange={(e) => setLocalSettings(s => ({ ...s, hfApiKey: e.target.value }))}
                      placeholder="hf_..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    <p style={{ color: '#888', fontSize: '0.75rem', marginTop: '8px' }}>
                      Get your API key from{' '}
                      <span 
                        style={{ color: '#FFD21E', cursor: 'pointer' }}
                        onClick={() => window.electronAPI?.openExternal('https://huggingface.co/settings/tokens')}
                      >
                        huggingface.co/settings/tokens
                      </span>
                    </p>
                  </div>
                )}

                {localSettings.inferenceProvider === 'remote-ollama' && (
                  <div style={{
                    padding: '16px',
                    background: 'rgba(100,200,255,0.05)',
                    border: '1px solid rgba(100,200,255,0.2)',
                    borderRadius: '10px'
                  }}>
                    <label style={{ 
                      display: 'block', 
                      color: '#64c8ff', 
                      fontSize: '0.85rem',
                      marginBottom: '8px',
                      fontWeight: '500'
                    }}>
                      🌐 Remote Ollama Server
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={localSettings.remoteOllamaHost}
                        onChange={(e) => setLocalSettings(s => ({ ...s, remoteOllamaHost: e.target.value }))}
                        placeholder="192.168.1.100 or server.example.com"
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                      <input
                        type="text"
                        value={localSettings.remoteOllamaPort}
                        onChange={(e) => setLocalSettings(s => ({ ...s, remoteOllamaPort: e.target.value }))}
                        placeholder="11434"
                        style={{
                          width: '80px',
                          padding: '10px 12px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          outline: 'none',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Test Connection Button */}
                {localSettings.inferenceProvider !== 'local' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={testConnection}
                      disabled={isTesting}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        cursor: isTesting ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {isTesting ? <Loader2 size={14} className="spin" /> : <Globe size={14} />}
                      Test Connection
                    </button>
                    {testResult && (
                      <span style={{ 
                        color: testResult.success ? '#4ade80' : '#f87171',
                        fontSize: '0.85rem'
                      }}>
                        {testResult.message}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#aaa',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                background: '#fff',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '0.85rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;
