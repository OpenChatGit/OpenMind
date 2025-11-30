import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Sparkles, 
  FolderOpen, 
  FileCode, 
  Terminal, 
  MessageSquare, 
  Palette,
  Zap,
  BookOpen,
  ExternalLink,
  ChevronRight,
  Star,
  GitBranch,
  Image,
  Search,
  Settings,
  Eye
} from 'lucide-react';

const WelcomeTab = ({ onAction, recentProjects = [] }) => {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState('welcome'); // welcome, changelog, tips
  const [showFirstTime, setShowFirstTime] = useState(false);

  useEffect(() => {
    // Check if this is the first time opening
    const hasSeenWelcome = localStorage.getItem('openmind-welcome-seen');
    if (!hasSeenWelcome) {
      setShowFirstTime(true);
      localStorage.setItem('openmind-welcome-seen', 'true');
    }
  }, []);

  const features = [
    { icon: FileCode, title: 'Code Editor', desc: 'Monaco-powered editor with syntax highlighting for 30+ languages' },
    { icon: Terminal, title: 'Integrated Terminal', desc: 'Full PowerShell/Bash terminal with multi-instance support' },
    { icon: MessageSquare, title: 'AI Chat', desc: 'Chat with AI models while coding - local or cloud' },
    { icon: Image, title: 'Image Generation', desc: 'Generate images locally with Stable Diffusion' },
    { icon: Search, title: 'Search in Files', desc: 'Find text across your entire project instantly' },
    { icon: Eye, title: 'Colorblind Mode', desc: 'Accessible colors for different types of color vision (experimental)' },
  ];

  const shortcuts = [
    { keys: 'Ctrl+S', action: 'Save file' },
    { keys: 'Ctrl+Shift+F', action: 'Search in files' },
    { keys: 'Ctrl+`', action: 'Toggle terminal' },
    { keys: 'Ctrl+B', action: 'Toggle sidebar' },
    { keys: 'Ctrl+P', action: 'Quick open file' },
    { keys: 'Ctrl+/', action: 'Toggle comment' },
  ];

  const changelog = [
    {
      version: '0.3.0',
      date: 'November 2024',
      changes: [
        '✨ Colorblind Mode - Support for Deuteranopia, Protanopia, Tritanopia',
        '🔔 Welcome & Notifications Tab',
        '🖥️ Multi-Terminal with context menu',
        '📁 Seti UI file icons',
        '🎨 Browser-style tabs with gradients',
      ]
    },
    {
      version: '0.2.0',
      date: 'October 2024',
      changes: [
        '🚀 IDE Mode with full code editor',
        '📂 File Explorer with context menus',
        '🔍 Search in files',
        '💬 AI Chat sidebar in IDE',
        '⚡ Performance optimizations',
      ]
    },
    {
      version: '0.1.0',
      date: 'September 2024',
      changes: [
        '💬 Chat with AI models (Ollama/HuggingFace)',
        '🧠 Reasoning support for DeepSeek-R1',
        '🎨 Local image generation',
        '🔌 MCP Tools support',
      ]
    }
  ];

  const tips = [
    'Press Ctrl+Shift+P to open the command palette',
    'Right-click on terminal tabs for quick actions like rename or kill',
    'Use the colorblind mode in Settings → General for accessible colors',
    'Drag and drop files into the chat to attach images',
    'Click the bell icon anytime to see this welcome screen',
  ];

  const TabButton = ({ id, label, isActive }) => (
    <button
      onClick={() => setActiveSection(id)}
      style={{
        padding: '8px 16px',
        background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
        border: 'none',
        borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
        color: isActive ? theme.text : theme.textSecondary,
        fontSize: '0.85rem',
        cursor: 'pointer',
        fontWeight: isActive ? 600 : 400,
        transition: 'all 0.15s'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      flex: 1,
      width: '100%',
      height: '100%',
      overflow: 'auto',
      background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgSecondary} 100%)`,
      padding: '40px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <Sparkles size={40} color="#6366f1" />
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 700, 
              color: theme.text,
              margin: 0,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              OpenMind IDE
            </h1>
          </div>
          <p style={{ color: theme.textSecondary, fontSize: '1.1rem', margin: 0 }}>
            Your AI-powered development environment
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '8px', 
          marginBottom: '32px',
          borderBottom: `1px solid ${theme.border}`
        }}>
          <TabButton id="welcome" label="Welcome" isActive={activeSection === 'welcome'} />
          <TabButton id="changelog" label="What's New" isActive={activeSection === 'changelog'} />
          <TabButton id="tips" label="Tips & Shortcuts" isActive={activeSection === 'tips'} />
        </div>

        {/* Welcome Section */}
        {activeSection === 'welcome' && (
          <div>
            {/* Quick Actions */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px',
              marginBottom: '40px'
            }}>
              <ActionCard
                icon={FolderOpen}
                title="Open Folder"
                desc="Open an existing project"
                onClick={() => onAction?.('openFolder')}
                theme={theme}
              />
              <ActionCard
                icon={FileCode}
                title="New File"
                desc="Create a new file"
                onClick={() => onAction?.('newFile')}
                theme={theme}
              />
              <ActionCard
                icon={GitBranch}
                title="Clone Repository"
                desc="Clone from Git"
                onClick={() => onAction?.('cloneRepo')}
                theme={theme}
                disabled
              />
              <ActionCard
                icon={Settings}
                title="Settings"
                desc="Configure OpenMind"
                onClick={() => onAction?.('openSettings')}
                theme={theme}
              />
            </div>

            {/* Recent Projects */}
            {recentProjects.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <h3 style={{ color: theme.text, fontSize: '1rem', marginBottom: '16px', fontWeight: 600 }}>
                  Recent Projects
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentProjects.slice(0, 5).map((project, i) => (
                    <button
                      key={i}
                      onClick={() => onAction?.('openProject', project.path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: theme.text,
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = theme.border;
                      }}
                    >
                      <FolderOpen size={20} color="#6366f1" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{project.name}</div>
                        <div style={{ fontSize: '0.75rem', color: theme.textMuted }}>{project.path}</div>
                      </div>
                      <ChevronRight size={16} color={theme.textMuted} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Features Grid */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: theme.text, fontSize: '1rem', marginBottom: '16px', fontWeight: 600 }}>
                Features
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '16px' 
              }}>
                {features.map((feature, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: `1px solid ${theme.border}`
                    }}
                  >
                    <feature.icon size={24} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ color: theme.text, fontWeight: 500, marginBottom: '4px' }}>
                        {feature.title}
                      </div>
                      <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
                        {feature.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Changelog Section */}
        {activeSection === 'changelog' && (
          <div>
            {changelog.map((release, i) => (
              <div key={i} style={{ marginBottom: '32px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    background: i === 0 ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : theme.bgSecondary,
                    color: i === 0 ? 'white' : theme.textSecondary,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    v{release.version}
                  </span>
                  <span style={{ color: theme.textMuted, fontSize: '0.85rem' }}>
                    {release.date}
                  </span>
                  {i === 0 && (
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}>
                      LATEST
                    </span>
                  )}
                </div>
                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  padding: '16px'
                }}>
                  {release.changes.map((change, j) => (
                    <div 
                      key={j} 
                      style={{ 
                        padding: '8px 0',
                        borderBottom: j < release.changes.length - 1 ? `1px solid ${theme.border}` : 'none',
                        color: theme.text,
                        fontSize: '0.9rem'
                      }}
                    >
                      {change}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tips Section */}
        {activeSection === 'tips' && (
          <div>
            {/* Keyboard Shortcuts */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: theme.text, fontSize: '1rem', marginBottom: '16px', fontWeight: 600 }}>
                Keyboard Shortcuts
              </h3>
              <div style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                overflow: 'hidden'
              }}>
                {shortcuts.map((shortcut, i) => (
                  <div 
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: i < shortcuts.length - 1 ? `1px solid ${theme.border}` : 'none'
                    }}
                  >
                    <span style={{ color: theme.text }}>{shortcut.action}</span>
                    <kbd style={{
                      background: theme.bgSecondary,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.8rem',
                      color: theme.textSecondary,
                      fontFamily: 'monospace'
                    }}>
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 style={{ color: theme.text, fontSize: '1rem', marginBottom: '16px', fontWeight: 600 }}>
                💡 Pro Tips
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tips.map((tip, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'rgba(99, 102, 241, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      color: theme.text,
                      fontSize: '0.9rem'
                    }}
                  >
                    <Zap size={16} color="#6366f1" style={{ flexShrink: 0 }} />
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          marginTop: '48px', 
          paddingTop: '24px', 
          borderTop: `1px solid ${theme.border}`,
          textAlign: 'center'
        }}>
          <p style={{ color: theme.textMuted, fontSize: '0.85rem' }}>
            Made with ❤️ by the OpenMind Team
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onAction?.('openDocs'); }}
              style={{ color: '#6366f1', fontSize: '0.85rem', textDecoration: 'none' }}
            >
              Documentation
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onAction?.('openGithub'); }}
              style={{ color: '#6366f1', fontSize: '0.85rem', textDecoration: 'none' }}
            >
              GitHub
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onAction?.('reportIssue'); }}
              style={{ color: '#6366f1', fontSize: '0.85rem', textDecoration: 'none' }}
            >
              Report Issue
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Action Card Component
const ActionCard = ({ icon: Icon, title, desc, onClick, theme, disabled }) => (
  <button
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      padding: '24px',
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s',
      opacity: disabled ? 0.5 : 1
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      e.currentTarget.style.borderColor = theme.border;
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: 'rgba(99, 102, 241, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Icon size={24} color="#6366f1" />
    </div>
    <div>
      <div style={{ color: theme.text, fontWeight: 600, marginBottom: '4px' }}>{title}</div>
      <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>{desc}</div>
    </div>
  </button>
);

export default WelcomeTab;
