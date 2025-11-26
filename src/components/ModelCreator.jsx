import { useState, useEffect, useRef } from 'react';
import { X, Play, Loader2, CheckCircle, AlertCircle, Info, Bot, Code, Palette, Brain, Settings, FileText, Sliders, Terminal, ChevronRight, ChevronLeft } from 'lucide-react';

const TEMPLATES = {
  assistant: {
    name: 'Assistant',
    description: 'General purpose assistant',
    icon: Bot,
    system: 'You are a helpful AI assistant. Be concise and helpful.',
    params: { temperature: 0.7, top_p: 0.9 }
  },
  coder: {
    name: 'Coder',
    description: 'Programming expert',
    icon: Code,
    system: 'You are an expert programmer. Write clean, efficient code. Explain your code briefly.',
    params: { temperature: 0.3, top_p: 0.95 }
  },
  creative: {
    name: 'Creative',
    description: 'Creative writing',
    icon: Palette,
    system: 'You are a creative writer. Be imaginative and engaging.',
    params: { temperature: 0.9, top_p: 0.95 }
  },
  reasoning: {
    name: 'Reasoning',
    description: 'Logical thinking',
    icon: Brain,
    system: `You are a helpful AI assistant.

INTERNAL THINKING RULES:
- Keep thinking SHORT (under 100 words)
- Be DECISIVE - first instinct is usually correct
- Your thinking is PRIVATE - never show it in your response

YOUR RESPONSE:
- Answer naturally and directly
- Be conversational and helpful
- Keep it concise`,
    params: { temperature: 0.7, top_p: 0.9, repeat_penalty: 1.8 }
  }
};

const TABS = [
  { id: 'general', name: 'General', icon: Settings },
  { id: 'template', name: 'Template', icon: FileText },
  { id: 'params', name: 'Parameters', icon: Sliders }
];

const ModelCreator = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [baseModels, setBaseModels] = useState([]);
  const [selectedBase, setSelectedBase] = useState('');
  const [modelName, setModelName] = useState('');
  const [template, setTemplate] = useState('assistant');
  const [systemPrompt, setSystemPrompt] = useState(TEMPLATES.assistant.system);
  const [params, setParams] = useState(TEMPLATES.assistant.params);
  
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  
  const nameInputRef = useRef(null);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadModels();
      setProgress([]);
      setError('');
      setSuccess(false);
      setActiveTab('general');
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadModels = async () => {
    const models = await window.electronAPI?.getOllamaModels();
    if (models) {
      setBaseModels(models);
      if (models.length > 0 && !selectedBase) {
        setSelectedBase(models[0].name);
      }
    }
  };

  const handleTemplateChange = (templateKey) => {
    setTemplate(templateKey);
    setSystemPrompt(TEMPLATES[templateKey].system);
    setParams(TEMPLATES[templateKey].params);
  };

  const handleCreate = async () => {
    if (!modelName.trim()) {
      setError('Please enter a model name');
      setActiveTab('general');
      return;
    }
    if (!selectedBase) {
      setError('Please select a base model');
      setActiveTab('general');
      return;
    }

    setIsCreating(true);
    setProgress([]);
    setError('');
    setSuccess(false);

    try {
      const result = await window.electronAPI?.createOllamaModel({
        name: modelName.trim().toLowerCase().replace(/\s+/g, '-'),
        baseModel: selectedBase,
        systemPrompt,
        params
      });

      if (result?.success) {
        setSuccess(true);
        setProgress(prev => [...prev, { type: 'success', message: `Model "${modelName}" created successfully!` }]);
      } else {
        setError(result?.error || 'Error creating model');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const handleProgress = (data) => {
      setProgress(prev => [...prev, data]);
      setShowConsole(true); // Auto-open console when progress comes in
    };
    window.electronAPI?.onModelCreateProgress?.(handleProgress);
  }, []);

  // Auto-scroll console to bottom
  useEffect(() => {
    if (consoleEndRef.current && showConsole) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress, showConsole]);

  if (!isOpen) return null;

  const renderGeneralTab = () => (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ececec', fontSize: '0.9rem', fontWeight: 500 }}>
          Model Name
        </label>
        <input
          ref={nameInputRef}
          type="text"
          value={modelName}
          onChange={e => setModelName(e.target.value)}
          placeholder="e.g. my-assistant"
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#1b1b1c',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#ececec',
            fontSize: '0.9rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.75rem' }}>
          The name your model will appear as in Ollama
        </p>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ececec', fontSize: '0.9rem', fontWeight: 500 }}>
          Base Model
        </label>
        <select
          value={selectedBase}
          onChange={e => setSelectedBase(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#1b1b1c',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#ececec',
            fontSize: '0.9rem',
            outline: 'none',
            cursor: 'pointer',
            boxSizing: 'border-box'
          }}
        >
          {baseModels.map(m => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.75rem' }}>
          The base model your custom model will be built on
        </p>
      </div>
    </div>
  );


  const renderTemplateTab = () => (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ececec', fontSize: '0.9rem', fontWeight: 500 }}>
          Choose Template
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {Object.entries(TEMPLATES).map(([key, t]) => {
            const IconComponent = t.icon;
            return (
              <button
                key={key}
                onClick={() => handleTemplateChange(key)}
                style={{
                  padding: '14px',
                  background: template === key ? 'rgba(255,255,255,0.1)' : '#1b1b1c',
                  border: template === key ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#ececec',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={e => {
                  if (template !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={e => {
                  if (template !== key) e.currentTarget.style.background = '#1b1b1c';
                }}
              >
                <IconComponent size={20} style={{ opacity: 0.8 }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{t.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ececec', fontSize: '0.9rem', fontWeight: 500 }}>
          System Prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          rows={8}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#1b1b1c',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#ececec',
            fontSize: '0.85rem',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: '1.6',
            boxSizing: 'border-box'
          }}
        />
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.75rem' }}>
          Instructions that will be baked into the model
        </p>
      </div>
    </div>
  );

  const renderParamsTab = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ececec', fontSize: '0.9rem', fontWeight: 500 }}>
          Temperature: {params.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={params.temperature}
          onChange={e => setParams({ ...params, temperature: parseFloat(e.target.value) })}
          style={{ width: '100%', accentColor: '#ececec' }}
        />
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.75rem' }}>
          Higher = more creative, lower = more focused
        </p>
      </div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ececec', fontSize: '0.9rem', fontWeight: 500 }}>
          Top P: {params.top_p}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={params.top_p}
          onChange={e => setParams({ ...params, top_p: parseFloat(e.target.value) })}
          style={{ width: '100%', accentColor: '#ececec' }}
        />
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.75rem' }}>
          Nucleus sampling - controls word selection
        </p>
      </div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ececec', fontSize: '0.9rem', fontWeight: 500 }}>
          Context Length
        </label>
        <select
          value={params.num_ctx || 8192}
          onChange={e => setParams({ ...params, num_ctx: parseInt(e.target.value) })}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#1b1b1c',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#ececec',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          <option value={2048}>2K Tokens</option>
          <option value={4096}>4K Tokens</option>
          <option value={8192}>8K Tokens</option>
          <option value={16384}>16K Tokens</option>
          <option value={32768}>32K Tokens</option>
        </select>
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.75rem' }}>
          How much context the model can retain
        </p>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', color: '#ececec', fontSize: '0.9rem', fontWeight: 500 }}>
          Repeat Penalty: {params.repeat_penalty || 1.1}
        </label>
        <input
          type="range"
          min="1"
          max="2"
          step="0.1"
          value={params.repeat_penalty || 1.1}
          onChange={e => setParams({ ...params, repeat_penalty: parseFloat(e.target.value) })}
          style={{ width: '100%', accentColor: '#ececec' }}
        />
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.75rem' }}>
          Prevents repetition - higher = less repetition
        </p>
      </div>
    </div>
  );


  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#2a2a2a',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '700px',
          height: '80vh',
          maxHeight: '600px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Main Layout - Sidebar spans full height */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{
            width: '180px',
            background: '#1b1b1c',
            padding: '16px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            borderRadius: '12px 0 0 12px'
          }}>
            {/* Header in Sidebar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 4px 12px',
              marginBottom: '8px'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#ececec', fontWeight: 600 }}>
                Model Creator
              </h3>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#ececec'}
                onMouseLeave={e => e.currentTarget.style.color = '#666'}
              >
                <X size={16} />
              </button>
            </div>
            {TABS.map(tab => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: activeTab === tab.id ? '#ececec' : '#888',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={e => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = '#ececec';
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#888';
                    }
                  }}
                >
                  <IconComponent size={16} />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Right side - Content + Footer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Content Area with optional Console */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
              {/* Main Content */}
              <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
                {activeTab === 'general' && renderGeneralTab()}
                {activeTab === 'template' && renderTemplateTab()}
                {activeTab === 'params' && renderParamsTab()}

                {/* Error */}
                {error && (
                  <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: '16px 0 0' }}>
                    {error}
                  </p>
                )}

                {/* Success */}
                {success && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px 14px',
                    background: 'rgba(76,175,80,0.1)',
                    border: '1px solid rgba(76,175,80,0.3)',
                    borderRadius: '8px',
                    color: '#4caf50',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle size={16} />
                    Model created successfully! You can now select it in the chat.
                  </div>
                )}
              </div>

              {/* Console Panel - slides in from right */}
              <div style={{
                width: showConsole ? '240px' : '0px',
                background: '#151517',
                overflow: 'hidden',
                transition: 'width 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: showConsole ? '1px solid rgba(255,255,255,0.1)' : 'none'
              }}>
                {showConsole && (
                  <>
                    <div style={{
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '0.8rem' }}>
                        <Terminal size={14} />
                        Console
                      </div>
                      <button
                        onClick={() => setShowConsole(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#666',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex'
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
                      {progress.map((p, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px',
                          marginBottom: '6px',
                          fontSize: '0.75rem',
                          color: p.type === 'error' ? '#ff6b6b' : p.type === 'success' ? '#4caf50' : '#888',
                          fontFamily: 'monospace'
                        }}>
                          {p.type === 'success' ? <CheckCircle size={12} style={{ flexShrink: 0, marginTop: 2 }} /> : 
                           p.type === 'error' ? <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 2 }} /> : 
                           <Info size={12} style={{ flexShrink: 0, marginTop: 2 }} />}
                          <span style={{ wordBreak: 'break-word' }}>{p.message}</span>
                        </div>
                      ))}
                      <div ref={consoleEndRef} />
                    </div>
                  </>
                )}
              </div>

              {/* Console Toggle Button - shows when console is hidden and there's progress */}
              {!showConsole && progress.length > 0 && (
                <button
                  onClick={() => setShowConsole(true)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#1b1b1c',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#888',
                    fontSize: '0.75rem'
                  }}
                >
                  <Terminal size={14} />
                  <ChevronLeft size={12} />
                </button>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = '#ececec';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#888';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !modelName.trim() || !selectedBase}
            style={{
              padding: '10px 24px',
              background: isCreating || !modelName.trim() || !selectedBase ? '#444' : '#ececec',
              border: 'none',
              borderRadius: '8px',
              color: isCreating || !modelName.trim() || !selectedBase ? '#888' : '#1b1b1c',
              cursor: isCreating || !modelName.trim() || !selectedBase ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            {isCreating ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Creating...
              </>
            ) : (
              <>
                <Play size={16} />
                Create Model
              </>
            )}
          </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ModelCreator;
