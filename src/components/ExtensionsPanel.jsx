import { useState, useEffect, memo } from 'react';
import { Check, Download, Palette, Code, Star, Package } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Available themes from Shiki
const AVAILABLE_THEMES = [
  { id: 'dark-plus', name: 'Dark+ (Default)', description: 'VS Code Dark+ theme', installed: true, type: 'theme', mode: 'dark' },
  { id: 'github-dark', name: 'GitHub Dark', description: 'GitHub dark theme', installed: true, type: 'theme', mode: 'dark' },
  { id: 'monokai', name: 'Monokai', description: 'Classic Monokai theme', installed: true, type: 'theme', mode: 'dark' },
  { id: 'nord', name: 'Nord', description: 'Arctic, north-bluish color palette', installed: true, type: 'theme', mode: 'dark' },
  { id: 'one-dark-pro', name: 'One Dark Pro', description: 'Atom One Dark theme', installed: true, type: 'theme', mode: 'dark' },
  { id: 'dracula', name: 'Dracula', description: 'Dark theme for vampires', installed: true, type: 'theme', mode: 'dark' },
  { id: 'github-light', name: 'GitHub Light', description: 'GitHub light theme', installed: true, type: 'theme', mode: 'light' },
  { id: 'light-plus', name: 'Light+ (VS Code)', description: 'VS Code Light+ theme', installed: true, type: 'theme', mode: 'light' },
  { id: 'solarized-light', name: 'Solarized Light', description: 'Solarized light color scheme', installed: true, type: 'theme', mode: 'light' },
];

// Available language packs
const AVAILABLE_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', description: 'JavaScript language support', installed: true, type: 'language' },
  { id: 'typescript', name: 'TypeScript', description: 'TypeScript language support', installed: true, type: 'language' },
  { id: 'python', name: 'Python', description: 'Python language support', installed: true, type: 'language' },
  { id: 'java', name: 'Java', description: 'Java language support', installed: true, type: 'language' },
  { id: 'cpp', name: 'C/C++', description: 'C and C++ language support', installed: true, type: 'language' },
  { id: 'csharp', name: 'C#', description: 'C# language support', installed: true, type: 'language' },
  { id: 'go', name: 'Go', description: 'Go language support', installed: true, type: 'language' },
  { id: 'rust', name: 'Rust', description: 'Rust language support', installed: true, type: 'language' },
  { id: 'html', name: 'HTML', description: 'HTML language support', installed: true, type: 'language' },
  { id: 'css', name: 'CSS/SCSS', description: 'CSS and SCSS support', installed: true, type: 'language' },
  { id: 'json', name: 'JSON', description: 'JSON language support', installed: true, type: 'language' },
  { id: 'markdown', name: 'Markdown', description: 'Markdown language support', installed: true, type: 'language' },
  { id: 'sql', name: 'SQL', description: 'SQL language support', installed: true, type: 'language' },
  { id: 'bash', name: 'Shell/Bash', description: 'Shell script support', installed: true, type: 'language' },
  { id: 'docker', name: 'Docker', description: 'Dockerfile support', installed: true, type: 'language' },
  { id: 'graphql', name: 'GraphQL', description: 'GraphQL language support', installed: true, type: 'language' },
  { id: 'vue', name: 'Vue', description: 'Vue.js language support', installed: true, type: 'language' },
  { id: 'svelte', name: 'Svelte', description: 'Svelte language support', installed: true, type: 'language' },
];

const ExtensionItem = memo(({ extension, isActive, onSelect }) => {
  const Icon = extension.type === 'theme' ? Palette : Code;
  
  return (
    <div
      onClick={() => onSelect(extension)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        cursor: 'pointer',
        background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
        borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
        transition: 'all 0.15s'
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{
        width: '36px',
        height: '36px',
        background: extension.type === 'theme' ? '#6366f1' : '#10b981',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={18} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          color: '#e0e0e0', 
          fontSize: '13px', 
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {extension.name}
          {extension.installed && <Check size={12} color="#10b981" />}
        </div>
        <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
          {extension.description}
        </div>
      </div>
    </div>
  );
});

ExtensionItem.displayName = 'ExtensionItem';


const ExtensionsPanel = memo(({ currentTheme, onThemeChange }) => {
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('installed');
  const [selectedExtension, setSelectedExtension] = useState(null);

  const allExtensions = [...AVAILABLE_THEMES, ...AVAILABLE_LANGUAGES];
  
  const filteredExtensions = allExtensions.filter(ext => {
    const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ext.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'themes') return ext.type === 'theme' && matchesSearch;
    if (activeTab === 'languages') return ext.type === 'language' && matchesSearch;
    return ext.installed && matchesSearch;
  });

  const handleSelectExtension = (ext) => {
    setSelectedExtension(ext);
    if (ext.type === 'theme' && onThemeChange) {
      onThemeChange(ext.id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{ padding: '8px 12px' }}>
        <input
          type="text"
          placeholder="Search extensions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            background: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            color: theme.text,
            fontSize: '12px',
            outline: 'none'
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: `1px solid ${theme.border}`,
        padding: '0 8px'
      }}>
        {[
          { id: 'installed', label: 'Installed', count: allExtensions.filter(e => e.installed).length },
          { id: 'themes', label: 'Themes', count: AVAILABLE_THEMES.length },
          { id: 'languages', label: 'Languages', count: AVAILABLE_LANGUAGES.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === tab.id ? theme.text : theme.textSecondary,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Extension List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredExtensions.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No extensions found
          </div>
        ) : (
          filteredExtensions.map(ext => (
            <ExtensionItem
              key={ext.id}
              extension={ext}
              isActive={selectedExtension?.id === ext.id || (ext.type === 'theme' && ext.id === currentTheme)}
              onSelect={handleSelectExtension}
            />
          ))
        )}
      </div>

      {/* Current Theme Info */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #333',
        background: '#1a1a1a'
      }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
          Current Theme
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Palette size={14} color="#6366f1" />
          {AVAILABLE_THEMES.find(t => t.id === currentTheme)?.name || 'Dark+ (Default)'}
        </div>
      </div>
    </div>
  );
});

ExtensionsPanel.displayName = 'ExtensionsPanel';

export default ExtensionsPanel;
