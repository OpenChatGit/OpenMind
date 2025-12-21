import { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  X,
  HardDrive,
  Cloud,
  Brain,
  Sparkles,
  Globe,
  Shield,
  DollarSign,
  WifiOff,
  Download,
  Puzzle,
  Package,
  Code,
  FileJson,
  Zap,
  ImageIcon,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const DocsModal = memo(({ isOpen, onClose }) => {
  const { theme, isDark } = useTheme();
  const [activeSection, setActiveSection] = useState('about');

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

            {/* Local Models */}
            <NavButton
              icon={HardDrive}
              label="Local Models"
              isActive={activeSection === 'local'}
              onClick={() => setActiveSection('local')}
              theme={theme}
            />

            {/* Cloud/HuggingFace */}
            <NavButton
              icon={Cloud}
              label="Cloud & HuggingFace"
              isActive={activeSection === 'cloud'}
              onClick={() => setActiveSection('cloud')}
              theme={theme}
            />
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
      intelligently, and extend functionality with plugins — all without sending 
      your data to the cloud.
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
        <strong>Plugin System</strong> — Extend functionality with native plugins
        that add UI elements dynamically
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
      and modern web technologies. Contributions welcome!
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
      Local Models
    </h2>
    
    <p style={{ margin: '0 0 20px 0' }}>
      OpenMind runs AI models entirely on your machine. No cloud, no API keys, 
      complete privacy. Connect to Ollama to run models locally.
    </p>

    {/* Ollama Setup */}
    <div style={{
      background: theme.bgTertiary,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '1rem',
          color: theme.text,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Download size={18} color={theme.accent} />
        Setup Ollama
      </h3>
      <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>
        OpenMind connects to Ollama for local inference. Install Ollama first:
      </p>
      <ol style={{ margin: '0 0 12px 0', paddingLeft: '20px', fontSize: '0.9rem' }}>
        <li style={{ marginBottom: '6px' }}>
          Download from <strong>ollama.com</strong>
        </li>
        <li style={{ marginBottom: '6px' }}>
          Install and run Ollama
        </li>
        <li style={{ marginBottom: '6px' }}>
          OpenMind will auto-connect when Ollama is running
        </li>
      </ol>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
          <span>Green indicator = Connected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
          <span>Red indicator = Not connected</span>
        </div>
      </div>
    </div>

    {/* Pull Models */}
    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
      }}
    >
      Downloading Models
    </h3>
    <p style={{ margin: '0 0 12px 0' }}>
      Pull models directly from the model selector dropdown:
    </p>
    <ol style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
      <li style={{ marginBottom: '6px' }}>Click the model selector in the chat</li>
      <li style={{ marginBottom: '6px' }}>Select "Pull new model"</li>
      <li style={{ marginBottom: '6px' }}>Enter a model name (e.g. <code style={{ background: theme.bgTertiary, padding: '2px 6px', borderRadius: '4px' }}>llama3.2</code>)</li>
      <li style={{ marginBottom: '6px' }}>Wait for download to complete</li>
    </ol>

    {/* Popular Models */}
    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
      }}
    >
      Popular Models
    </h3>
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: '8px',
      marginBottom: '20px'
    }}>
      {[
        { name: 'llama3.2', desc: 'Latest Llama, fast & capable' },
        { name: 'mistral', desc: 'Great for coding tasks' },
        { name: 'gemma2', desc: 'Google\'s efficient model' },
        { name: 'qwen3', desc: 'Strong multilingual support' },
      ].map(({ name, desc }) => (
        <div key={name} style={{ 
          background: theme.bgTertiary, 
          padding: '10px 12px', 
          borderRadius: '6px',
        }}>
          <code style={{ color: theme.accent, fontSize: '0.9rem' }}>{name}</code>
          <div style={{ color: theme.textMuted, fontSize: '0.8rem', marginTop: '2px' }}>{desc}</div>
        </div>
      ))}
    </div>

    {/* Benefits */}
    <h3
      style={{
        margin: '0 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
      }}
    >
      Why Local?
    </h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
      {[
        { icon: Shield, color: '#22c55e', title: 'Privacy', desc: 'Data stays on your machine' },
        { icon: DollarSign, color: '#22c55e', title: 'Free', desc: 'No API costs ever' },
        { icon: WifiOff, color: '#22c55e', title: 'Offline', desc: 'Works without internet' },
        { icon: Zap, color: '#22c55e', title: 'Fast', desc: 'No network latency' },
      ].map(({ icon: Icon, color, title, desc }) => (
        <div key={title} style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '10px',
          padding: '10px',
          background: theme.bgTertiary,
          borderRadius: '6px',
        }}>
          <Icon size={18} color={color} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ color: theme.text, fontWeight: '500', fontSize: '0.9rem' }}>{title}</div>
            <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>{desc}</div>
          </div>
        </div>
      ))}
    </div>
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
      Native Plugin System
    </h2>
    
    {/* Experimental Notice */}
    <div style={{ 
      marginBottom: '20px',
      padding: '10px 14px',
      background: '#f59e0b15',
      borderRadius: '8px',
      borderLeft: '3px solid #f59e0b',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <Sparkles size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: '0.85rem', color: theme.textSecondary }}>
        <strong style={{ color: '#f59e0b' }}>Experimental</strong> — The plugin system is still in development. APIs may change in future updates.
      </p>
    </div>
    
    <p style={{ margin: '0 0 20px 0' }}>
      OpenMind uses a dynamic plugin system that automatically places UI elements 
      in defined slots. Plugins can add buttons, toggles and more 
      — without modifying the main code.
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
        Go to <strong>Settings → Plugins</strong>
      </li>
      <li style={{ marginBottom: '8px' }}>
        Browse available plugins (verified by OpenMindLabs)
      </li>
      <li style={{ marginBottom: '8px' }}>
        Click <strong>Install</strong> to download the plugin
      </li>
      <li style={{ marginBottom: '8px' }}>
        Enable/disable plugins with the toggle switch
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
      <Package size={20} color={theme.accent} /> Plugin Structure
    </h3>
    <p style={{ margin: '0 0 12px 0' }}>
      A plugin consists of at least a <code style={{ background: theme.bgTertiary, padding: '2px 6px', borderRadius: '4px' }}>manifest.json</code>:
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
      <div style={{ color: theme.textMuted }}>plugins/my-plugin/manifest.json</div>
      <div>{'{'}</div>
      <div style={{ paddingLeft: '16px' }}>
        "id": <span style={{ color: '#f59e0b' }}>"my-plugin"</span>,
      </div>
      <div style={{ paddingLeft: '16px' }}>
        "name": <span style={{ color: '#f59e0b' }}>"My Plugin"</span>,
      </div>
      <div style={{ paddingLeft: '16px' }}>
        "type": <span style={{ color: '#f59e0b' }}>"native"</span>,
      </div>
      <div style={{ paddingLeft: '16px' }}>
        "ui": {'{'}
      </div>
      <div style={{ paddingLeft: '32px' }}>
        "slots": {'{'}
      </div>
      <div style={{ paddingLeft: '48px' }}>
        "chat-input-left": {'{'}
      </div>
      <div style={{ paddingLeft: '64px' }}>
        "type": <span style={{ color: '#f59e0b' }}>"toggle-button"</span>,
      </div>
      <div style={{ paddingLeft: '64px' }}>
        "icon": <span style={{ color: '#f59e0b' }}>"Sparkles"</span>,
      </div>
      <div style={{ paddingLeft: '64px' }}>
        "tooltip": <span style={{ color: '#f59e0b' }}>"Toggle Feature"</span>
      </div>
      <div style={{ paddingLeft: '48px' }}>{'}'}</div>
      <div style={{ paddingLeft: '32px' }}>{'}'}</div>
      <div style={{ paddingLeft: '16px' }}>{'}'}</div>
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
      <Code size={20} color={theme.accent} /> Available UI Slots
    </h3>
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: '8px',
      marginBottom: '20px'
    }}>
      {[
        { slot: 'chat-input-left', desc: 'Left of chat input' },
        { slot: 'chat-input-right', desc: 'Right of send button' },
        { slot: 'chat-input-above', desc: 'Above chat input' },
        { slot: 'chat-toolbar', desc: 'Main toolbar' },
        { slot: 'sidebar-top', desc: 'Top of sidebar' },
        { slot: 'sidebar-bottom', desc: 'Bottom of sidebar' },
        { slot: 'message-actions', desc: 'On messages' },
        { slot: 'settings-tab', desc: 'Custom settings tab' },
      ].map(({ slot, desc }) => (
        <div key={slot} style={{ 
          background: theme.bgTertiary, 
          padding: '8px 12px', 
          borderRadius: '6px',
          fontSize: '0.85rem'
        }}>
          <code style={{ color: theme.accent }}>{slot}</code>
          <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>{desc}</div>
        </div>
      ))}
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
      <FileJson size={20} color={theme.accent} /> Element Types
    </h3>
    <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
      <li style={{ marginBottom: '8px' }}>
        <strong>toggle-button</strong> — Button that toggles between active/inactive
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>action-button</strong> — Button for one-time actions
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>hold-button</strong> — Button that must be held (e.g. voice recording)
      </li>
      <li style={{ marginBottom: '8px' }}>
        <strong>indicator</strong> — Display only, no click
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
      <ImageIcon size={20} color={theme.accent} /> Icons
    </h3>
    <p style={{ margin: '0 0 12px 0' }}>
      All 500+ <strong>Lucide Icons</strong> are available. Use the PascalCase name:
    </p>
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '8px',
      marginBottom: '20px'
    }}>
      {['Sparkles', 'Radar', 'Image', 'Mic', 'Search', 'Brain', 'Zap', 'Settings'].map(icon => (
        <code key={icon} style={{ 
          background: theme.bgTertiary, 
          padding: '4px 8px', 
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>{icon}</code>
      ))}
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
      <Code size={20} color={theme.accent} /> Plugin with Logic (index.js)
    </h3>
    <p style={{ margin: '0 0 12px 0' }}>
      For advanced functionality, add an <code style={{ background: theme.bgTertiary, padding: '2px 6px', borderRadius: '4px' }}>index.js</code>:
    </p>
    <div
      style={{
        background: theme.bgTertiary,
        borderRadius: '8px',
        padding: '14px',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        marginBottom: '20px',
        overflowX: 'auto',
      }}
    >
      <div style={{ color: theme.textMuted }}>// index.js</div>
      <div>module.exports = {'{'}</div>
      <div style={{ paddingLeft: '16px' }}>init(ctx) {'{'}</div>
      <div style={{ paddingLeft: '32px' }}>
        ctx.on(<span style={{ color: '#f59e0b' }}>'ui-click'</span>, (data) ={'>'} {'{'})
      </div>
      <div style={{ paddingLeft: '48px' }}>
        ctx.popup.toast(<span style={{ color: '#f59e0b' }}>'Clicked!'</span>, {'{'} type: <span style={{ color: '#f59e0b' }}>'success'</span> {'}'});
      </div>
      <div style={{ paddingLeft: '32px' }}>{'}'});</div>
      <div style={{ paddingLeft: '16px' }}>{'}'}</div>
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
      <Package size={20} color={theme.accent} /> Popup/Dialog API
    </h3>
    <p style={{ margin: '0 0 12px 0' }}>
      Plugins can show styled dialogs instead of browser defaults:
    </p>
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: '8px',
      marginBottom: '20px'
    }}>
      {[
        { method: 'ctx.popup.alert()', desc: 'Simple message dialog' },
        { method: 'ctx.popup.confirm()', desc: 'Yes/No decision' },
        { method: 'ctx.popup.prompt()', desc: 'Text input dialog' },
        { method: 'ctx.popup.toast()', desc: 'Brief notification' },
      ].map(({ method, desc }) => (
        <div key={method} style={{ 
          background: theme.bgTertiary, 
          padding: '8px 12px', 
          borderRadius: '6px',
          fontSize: '0.85rem'
        }}>
          <code style={{ color: theme.accent }}>{method}</code>
          <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>{desc}</div>
        </div>
      ))}
    </div>
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
      <div style={{ color: theme.textMuted }}>// Example usage</div>
      <div>const confirmed = await ctx.popup.confirm(<span style={{ color: '#f59e0b' }}>'Delete item?'</span>, {'{'}</div>
      <div style={{ paddingLeft: '16px' }}>title: <span style={{ color: '#f59e0b' }}>'Confirm'</span>,</div>
      <div style={{ paddingLeft: '16px' }}>confirmColor: <span style={{ color: '#f59e0b' }}>'danger'</span></div>
      <div>{'}'});</div>
    </div>

    <h3
      style={{
        margin: '20px 0 12px 0',
        fontSize: '1.1rem',
        color: theme.text,
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Code size={20} color={theme.accent} /> System Prompt API
    </h3>
    <p style={{ margin: '0 0 12px 0' }}>
      Plugins can register system prompts that get merged with the main prompt:
    </p>
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: '8px',
      marginBottom: '20px'
    }}>
      {[
        { method: 'ctx.prompt.register()', desc: 'Add system prompt' },
        { method: 'ctx.prompt.update()', desc: 'Update prompt' },
        { method: 'ctx.prompt.setEnabled()', desc: 'Toggle on/off' },
        { method: 'ctx.prompt.unregister()', desc: 'Remove prompt' },
      ].map(({ method, desc }) => (
        <div key={method} style={{ 
          background: theme.bgTertiary, 
          padding: '8px 12px', 
          borderRadius: '6px',
          fontSize: '0.85rem'
        }}>
          <code style={{ color: theme.accent }}>{method}</code>
          <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>{desc}</div>
        </div>
      ))}
    </div>
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
      <div style={{ color: theme.textMuted }}>// Register a system prompt</div>
      <div>ctx.prompt.register({'{'}</div>
      <div style={{ paddingLeft: '16px' }}>prompt: <span style={{ color: '#f59e0b' }}>'You can generate images...'</span>,</div>
      <div style={{ paddingLeft: '16px' }}>priority: <span style={{ color: '#3b82f6' }}>80</span>,</div>
      <div style={{ paddingLeft: '16px' }}>position: <span style={{ color: '#f59e0b' }}>'after'</span></div>
      <div>{'}'});</div>
    </div>

    <div style={{ 
      marginTop: '20px',
      padding: '12px 16px',
      background: `${theme.accent}15`,
      borderRadius: '8px',
      borderLeft: `3px solid ${theme.accent}`,
    }}>
      <p style={{ margin: 0, fontSize: '0.9rem', color: theme.textSecondary }}>
        <strong style={{ color: theme.text }}>More coming soon!</strong> We're actively expanding the plugin API with new slots, events, and capabilities.
      </p>
    </div>
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
      Cloud & HuggingFace
    </h2>

    {/* Coming Soon Notice */}
    <div style={{ 
      padding: '40px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: '#f59e0b15',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <Sparkles size={36} color="#f59e0b" />
      </div>
      
      <h3 style={{ 
        margin: '0 0 12px 0', 
        fontSize: '1.2rem', 
        color: theme.text,
        fontWeight: '600'
      }}>
        Coming Soon
      </h3>
      
      <p style={{ 
        margin: '0 0 24px 0', 
        color: theme.textSecondary,
        maxWidth: '400px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        Cloud features including HuggingFace integration, Deep Search, and Docker services are being redesigned for a better experience.
      </p>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center',
      }}>
        {['HuggingFace Hub', 'Deep Search', 'Docker Services', 'Cloud Models'].map(feature => (
          <span key={feature} style={{
            padding: '6px 12px',
            background: theme.bgTertiary,
            borderRadius: '16px',
            fontSize: '0.85rem',
            color: theme.textMuted,
          }}>
            {feature}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default DocsModal;
