import { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  X,
  Zap,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Cloud,
  Brain,
  Sparkles,
  Globe,
  Shield,
  DollarSign,
  WifiOff,
  Search,
  Download,
  Puzzle,
  Package,
  Code,
  FileJson,
  Image,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const DocsModal = memo(({ isOpen, onClose }) => {
  const { theme, isDark } = useTheme();
  const [activeSection, setActiveSection] = useState('about');
  const [discoveryExpanded, setDiscoveryExpanded] = useState(true);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bg,
          borderRadius: '8px',
          width: '900px',
          maxWidth: '94vw',
          height: '700px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: `1px solid ${theme.border}`,
          boxShadow: isDark
            ? '0 16px 48px rgba(0,0,0,0.4)'
            : '0 16px 48px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={20} color={isDark ? '#fff' : '#1a1a1a'} />
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: theme.text,
                margin: 0,
              }}
            >
              Documentation
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textSecondary,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.text;
              e.currentTarget.style.background = theme.bgHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.textSecondary;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar */}
          <div
            style={{
              width: '200px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              background: theme.bgSecondary,
              borderRight: `1px solid ${theme.border}`,
            }}
          >
            {/* About */}
            <NavButton
              icon={BookOpen}
              label="About"
              isActive={activeSection === 'about'}
              onClick={() => setActiveSection('about')}
              theme={theme}
            />

            {/* Plugins */}
            <NavButton
              icon={Puzzle}
              label="Plugins"
              isActive={activeSection === 'plugins'}
              onClick={() => setActiveSection('plugins')}
              theme={theme}
            />

            {/* OpenMind Create Dropdown */}
            <div>
              <button
                onClick={() => setDiscoveryExpanded(!discoveryExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 12px',
                  background:
                    activeSection === 'local' || activeSection === 'cloud'
                      ? theme.bgActive
                      : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color:
                    activeSection === 'local' || activeSection === 'cloud'
                      ? theme.text
                      : theme.textSecondary,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== 'local' && activeSection !== 'cloud') {
                    e.currentTarget.style.background = theme.bgHover;
                    e.currentTarget.style.color = theme.text;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== 'local' && activeSection !== 'cloud') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = theme.textSecondary;
                  }
                }}
              >
                <Zap size={18} />
                <span style={{ flex: 1 }}>OpenMind Create</span>
                {discoveryExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>

              {discoveryExpanded && (
                <div
                  style={{
                    marginLeft: '12px',
                    marginTop: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <SubNavButton
                    icon={HardDrive}
                    label="Local Models"
                    isActive={activeSection === 'local'}
                    onClick={() => setActiveSection('local')}
                    theme={theme}
                  />
                  <SubNavButton
                    icon={Cloud}
                    label="Cloud Models"
                    isActive={activeSection === 'cloud'}
                    onClick={() => setActiveSection('cloud')}
                    theme={theme}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {activeSection === 'about' && <AboutSection theme={theme} />}
            {activeSection === 'plugins' && <PluginsSection theme={theme} />}
            {activeSection === 'local' && <LocalModelsSection theme={theme} />}
            {activeSection === 'cloud' && <CloudSection theme={theme} />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

// Navigation Button Component
const NavButton = ({ icon: Icon, label, isActive, onClick, theme }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 12px',
      background: isActive ? theme.bgActive : 'transparent',
      border: 'none',
      borderRadius: '6px',
      color: isActive ? theme.text : theme.textSecondary,
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: isActive ? '500' : '400',
      textAlign: 'left',
      width: '100%',
    }}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = theme.bgHover;
        e.currentTarget.style.color = theme.text;
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = theme.textSecondary;
      }
    }}
  >
    <Icon size={18} />
    {label}
  </button>
);

// Sub Navigation Button Component
const SubNavButton = ({ icon: Icon, label, isActive, onClick, theme }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: isActive ? theme.bgActive : 'transparent',
      border: 'none',
      borderRadius: '4px',
      color: isActive ? theme.text : theme.textSecondary,
      cursor: 'pointer',
      fontSize: '0.85rem',
      textAlign: 'left',
      width: '100%',
    }}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = theme.bgHover;
        e.currentTarget.style.color = theme.text;
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = theme.textSecondary;
      }
    }}
  >
    <Icon size={14} />
    {label}
  </button>
);

// About Section
const AboutSection = ({ theme }) => (
  <div style={{ color: theme.textSecondary, lineHeight: '1.7' }}>
    <h2
      style={{
        margin: '0 0 16px 0',
        fontSize: '1.3rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <Brain size={24} color={theme.accent} /> AI for Everyone
    </h2>
    <p style={{ margin: '0 0 20px 0' }}>
      OpenMind is a powerful, privacy-first AI assistant that runs entirely on
      your machine. Chat with local LLMs, generate images, search the web
      intelligently, and create custom AI models — all without sending your data
      to the cloud.
    </p>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Sparkles size={20} color={theme.accent} /> Key Features
    </h3>
    <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
      <li style={{ marginBottom: '8px' }}>
        <strong>Ollama Integration</strong> — Connect to Ollama for fast local
        inference with popular models
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>Local GGUF Models</strong> — Run any GGUF model directly with
        llama.cpp
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>HuggingFace Hub</strong> — Browse and download thousands of
        models
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>Deep Search</strong> — AI-powered web research with SearXNG
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>Image Generation</strong> — Create images locally with Stable
        Diffusion
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>OpenMind Create</strong> — Build custom AI assistants with your
        own prompts
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>Docker Integration</strong> — Manage containers for services
        like SearXNG
      </li>
    </ul>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Shield size={20} color={theme.accent} /> Privacy First
    </h3>
    <p style={{ margin: '0 0 20px 0' }}>
      Your conversations, models, and data stay on your machine. No telemetry,
      no cloud dependencies, no API keys required for local models.
    </p>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Globe size={20} color={theme.accent} /> Open Source
    </h3>
    <p style={{ margin: '0' }}>
      OpenMind is open source and community-driven. Built with Electron, React,
      and modern web technologies.
    </p>
  </div>
);

// Local Models Section
const LocalModelsSection = ({ theme }) => (
  <div style={{ color: theme.textSecondary, lineHeight: '1.7' }}>
    <h2
      style={{
        margin: '0 0 16px 0',
        fontSize: '1.3rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <HardDrive size={24} color={theme.accent} />
      Local Models & Ollama
    </h2>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
      }}
    >
      Ollama Integration
    </h3>
    <p style={{ margin: '0 0 16px 0' }}>
      OpenMind includes a bundled Ollama server that starts automatically. You
      can also connect to an external Ollama instance.
    </p>
    <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
      <li style={{ marginBottom: '8px' }}>
        Check connection status in the sidebar (green = connected)
      </li>
      <li style={{ marginBottom: '8px' }}>
        Start/stop the bundled server with the play/stop buttons
      </li>
      <li style={{ marginBottom: '8px' }}>
        Pull new models directly from the model selector
      </li>
    </ul>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
      }}
    >
      GGUF Models
    </h3>
    <p style={{ margin: '0 0 16px 0' }}>
      Run any GGUF model file directly with the built-in llama.cpp backend.
      Perfect for models not available on Ollama.
    </p>
    <ol style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
      <li style={{ marginBottom: '8px' }}>
        Open <strong>OpenMind Create</strong> from the sidebar
      </li>
      <li style={{ marginBottom: '8px' }}>
        Go to <strong>Discovery → Local</strong>
      </li>
      <li style={{ marginBottom: '8px' }}>
        Import a .gguf file or download from HuggingFace
      </li>
      <li style={{ marginBottom: '8px' }}>
        Configure name, system prompt, and parameters
      </li>
      <li style={{ marginBottom: '8px' }}>
        Click <strong>Create Model</strong> to add it to your library
      </li>
    </ol>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
      }}
    >
      Benefits
    </h3>
    <ul style={{ margin: '0', paddingLeft: '20px' }}>
      <li
        style={{
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Shield size={16} color="#22c55e" /> Complete privacy — your data never
        leaves your machine
      </li>
      <li
        style={{
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <DollarSign size={16} color="#22c55e" /> No API costs — run unlimited
        queries for free
      </li>
      <li
        style={{
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <WifiOff size={16} color="#22c55e" /> Works offline — no internet
        connection required
      </li>
      <li
        style={{
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Zap size={16} color="#22c55e" /> Fast responses — no network latency
      </li>
    </ul>
  </div>
);

// Plugins Section
const PluginsSection = ({ theme }) => (
  <div style={{ color: theme.textSecondary, lineHeight: '1.7' }}>
    <h2
      style={{
        margin: '0 0 16px 0',
        fontSize: '1.3rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <Puzzle size={24} color={theme.accent} />
      Docker Plugins
    </h2>
    <p style={{ margin: '0 0 20px 0' }}>
      OpenMind supports Docker-based plugins that extend functionality. Install
      official plugins from the Plugin Store or create your own.
    </p>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Download size={20} color={theme.accent} /> Installing Plugins
    </h3>
    <ol style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
      <li style={{ marginBottom: '8px' }}>
        Go to <strong>Settings → Docker → Plugin Store</strong>
      </li>
      <li style={{ marginBottom: '8px' }}>
        Browse available plugins (verified by OpenMindLabs)
      </li>
      <li style={{ marginBottom: '8px' }}>
        Click <strong>Install</strong> to download and start the container
      </li>
      <li style={{ marginBottom: '8px' }}>
        Use <strong>Start/Stop</strong> buttons to manage running plugins
      </li>
    </ol>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Code size={20} color={theme.accent} /> Creating Custom Plugins
    </h3>
    <p style={{ margin: '0 0 12px 0' }}>
      Create your own plugins by building a Docker image with OpenMind labels:
    </p>
    <div
      style={{
        background: theme.bgTertiary,
        borderRadius: '8px',
        padding: '14px',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        marginBottom: '16px',
        overflowX: 'auto',
      }}
    >
      <div style={{ color: theme.textMuted }}># Dockerfile</div>
      <div>FROM your-base-image:latest</div>
      <br />
      <div style={{ color: theme.textMuted }}># Required OpenMind labels</div>
      <div>
        LABEL <span style={{ color: '#22c55e' }}>com.openmind.plugin</span>
        ="true"
      </div>
      <div>
        LABEL <span style={{ color: '#22c55e' }}>com.openmind.plugin.id</span>
        ="my-plugin"
      </div>
      <div>
        LABEL <span style={{ color: '#22c55e' }}>com.openmind.plugin.name</span>
        ="My Plugin"
      </div>
      <div>
        LABEL{' '}
        <span style={{ color: '#22c55e' }}>com.openmind.plugin.version</span>
        ="1.0.0"
      </div>
    </div>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <FileJson size={20} color={theme.accent} /> Registry Format
    </h3>
    <p style={{ margin: '0 0 12px 0' }}>
      To add your plugin to the store, submit a PR to the{' '}
      <strong>OpenMindLabs-Plugins</strong> repository with this format:
    </p>
    <div
      style={{
        background: theme.bgTertiary,
        borderRadius: '8px',
        padding: '14px',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        marginBottom: '16px',
        overflowX: 'auto',
      }}
    >
      <div>{'{'}</div>
      <div style={{ paddingLeft: '16px' }}>
        "id": <span style={{ color: '#f59e0b' }}>"my-plugin"</span>,
      </div>
      <div style={{ paddingLeft: '16px' }}>
        "name": <span style={{ color: '#f59e0b' }}>"My Plugin"</span>,
      </div>
      <div style={{ paddingLeft: '16px' }}>
        "description": <span style={{ color: '#f59e0b' }}>"What it does"</span>,
      </div>
      <div style={{ paddingLeft: '16px' }}>
        "image":{' '}
        <span style={{ color: '#f59e0b' }}>"username/image:latest"</span>,
      </div>
      <div style={{ paddingLeft: '16px' }}>
        "containerName":{' '}
        <span style={{ color: '#f59e0b' }}>"openmind-my-plugin"</span>,
      </div>
      <div style={{ paddingLeft: '16px' }}>
        "ports": {'{'} "8080": "80" {'}'},
      </div>
      <div style={{ paddingLeft: '16px' }}>
        "official": <span style={{ color: '#3b82f6' }}>false</span>
      </div>
      <div>{'}'}</div>
    </div>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Image size={20} color={theme.accent} /> Custom Icons
    </h3>
    <p style={{ margin: '0 0 12px 0' }}>
      Plugins can have custom icons with Dark/Light mode support:
    </p>
    <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
      <li style={{ marginBottom: '8px' }}>
        <strong>iconUrl</strong> — Default icon (used for both modes)
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>iconUrlDark</strong> — Icon for Dark mode
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>iconUrlLight</strong> — Icon for Light mode
      </li>
    </ul>
    <p style={{ margin: '0', fontSize: '0.9rem', color: theme.textMuted }}>
      Icons should be PNG or SVG, recommended size 64x64 or 128x128 pixels.
    </p>
  </div>
);

// Cloud Section
const CloudSection = ({ theme }) => (
  <div style={{ color: theme.textSecondary, lineHeight: '1.7' }}>
    <h2
      style={{
        margin: '0 0 16px 0',
        fontSize: '1.3rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <Cloud size={24} color={theme.accent} />
      HuggingFace & Cloud Features
    </h2>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
      }}
    >
      HuggingFace Integration
    </h3>
    <p style={{ margin: '0 0 16px 0' }}>
      Connect your HuggingFace account to browse, download, and manage models
      from the Hub. Access thousands of community models directly in OpenMind.
    </p>
    <ol style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
      <li style={{ marginBottom: '8px' }}>
        Go to <strong>Account Settings → Connections</strong>
      </li>
      <li style={{ marginBottom: '8px' }}>
        Click <strong>Connect</strong> under HuggingFace
      </li>
      <li style={{ marginBottom: '8px' }}>
        Enter your HuggingFace access token
      </li>
      <li style={{ marginBottom: '8px' }}>
        Browse models in <strong>OpenMind Create → Discovery → Cloud</strong>
      </li>
    </ol>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
      }}
    >
      Deep Search
    </h3>
    <p style={{ margin: '0 0 16px 0' }}>
      AI-powered web research using SearXNG. Deep Search finds relevant
      information and synthesizes it into comprehensive answers.
    </p>
    <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
      <li style={{ marginBottom: '8px' }}>
        Requires Docker to run the SearXNG container
      </li>
      <li style={{ marginBottom: '8px' }}>
        Enable in chat with the Deep Search toggle
      </li>
      <li style={{ marginBottom: '8px' }}>
        Searches multiple sources and summarizes results
      </li>
    </ul>

    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
      }}
    >
      Docker Services
    </h3>
    <p style={{ margin: '0 0 16px 0' }}>
      Some features require Docker Desktop. Manage containers from{' '}
      <strong>Settings → Docker</strong>.
    </p>
    <ul style={{ margin: '0', paddingLeft: '20px' }}>
      <li
        style={{
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Search size={16} color={theme.accent} /> SearXNG for Deep Search
      </li>
      <li
        style={{
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Download size={16} color={theme.accent} /> Start, stop, and restart
        containers
      </li>
      <li
        style={{
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Globe size={16} color={theme.accent} /> Click port links to open
        services in browser
      </li>
    </ul>
  </div>
);

export default DocsModal;
