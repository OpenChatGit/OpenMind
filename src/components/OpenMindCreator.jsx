import { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Cpu,
  Sparkles,
  Code,
  Lightbulb,
  GraduationCap,
  Search,
  Check,
  Trash2,
  Save,
  FolderOpen,
  Compass,
  Settings,
  Download,
  ExternalLink,
  Loader2,
  Brain,
  MessageSquare,
  Palette,
  HardDrive,
  Cloud,
  ChevronDown,
  ChevronRight,
  // Tag icons
  Flame,
  Lock,
  Package,
  Bot,
  Image,
  Mic,
  Volume2,
  Video,
  Gamepad2,
  FileText,
  Globe,
  Tag,
  Zap,
  Eye,
  Music,
  Calculator,
  Terminal,
  Layers,
  Box,
  Hash,
  Flag,
  Languages,
  Scale,
  // UI controls
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
  Filter,
  // Training icons
  GraduationCap as Train,
  Upload,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Link,
  User,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Marquee text component for long names
const MarqueeText = ({ text, maxWidth = 180, style = {} }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (textRef.current && containerRef.current) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = containerRef.current.offsetWidth;
      setShouldAnimate(textWidth > containerWidth);
    }
  }, [text]);

  const animationDuration = Math.max(3, text.length * 0.15); // Longer text = slower scroll

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        maxWidth: `${maxWidth}px`,
        position: 'relative',
        ...style,
      }}
    >
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          paddingRight: shouldAnimate && isHovered ? '50px' : '0',
          animation: shouldAnimate && isHovered
            ? `marquee ${animationDuration}s linear infinite`
            : 'none',
        }}
      >
        {text}
      </span>
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0); }
            20% { transform: translateX(0); }
            80% { transform: translateX(calc(-100% + ${maxWidth}px)); }
            100% { transform: translateX(calc(-100% + ${maxWidth}px)); }
          }
        `}
      </style>
    </div>
  );
};

const OpenMindCreator = ({ isOpen, onClose, onModelCreated }) => {
  const { theme, isDark } = useTheme();
  const [activeSection, setActiveSection] = useState('local');
  const [discoveryExpanded, setDiscoveryExpanded] = useState(true);
  const [availableModels, setAvailableModels] = useState([]);
  const [customModels, setCustomModels] = useState([]);
  const [presets, setPresets] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState([]);
  const [editingModel, setEditingModel] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  
  // UI state
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // HuggingFace search
  const [hfSearchQuery, setHfSearchQuery] = useState('');
  const [hfSearchResults, setHfSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHfModel, setSelectedHfModel] = useState(null);
  const [hfModelDetails, setHfModelDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Download state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);

  // Training state
  const [trainExpanded, setTrainExpanded] = useState(false);
  const [trainingBaseModels, setTrainingBaseModels] = useState([]);
  const [trainingPresets, setTrainingPresets] = useState([]);
  const [subscriptionTiers, setSubscriptionTiers] = useState({});
  const [orgMembership, setOrgMembership] = useState(null);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);

  // Form state
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelName, setModelName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [params, setParams] = useState({
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    num_ctx: 4096,
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (window.electronAPI?.onOpenmindCreateProgress) {
      window.electronAPI.onOpenmindCreateProgress((data) => {
        setCreateProgress((prev) => [...prev, data]);
      });
    }
    if (window.electronAPI?.onOpenmindImportProgress) {
      window.electronAPI.onOpenmindImportProgress((data) => {
        setImportProgress(data.message || '');
      });
    }
    if (window.electronAPI?.onHfGGUFDownloadProgress) {
      window.electronAPI.onHfGGUFDownloadProgress((data) => {
        setDownloadProgress(data.progress);
      });
    }
  }, []);

  // Re-search when filters change
  useEffect(() => {
    if (activeFilters.length > 0 || hfSearchQuery.trim()) {
      handleHfSearch();
    }
  }, [activeFilters]);

  const loadData = async () => {
    if (window.electronAPI?.openmindScanGGUF) {
      const models = await window.electronAPI.openmindScanGGUF();
      setAvailableModels(models);
    }
    if (window.electronAPI?.openmindListModels) {
      const models = await window.electronAPI.openmindListModels();
      setCustomModels(models);
    }
    if (window.electronAPI?.openmindGetPresets) {
      const presetList = await window.electronAPI.openmindGetPresets();
      setPresets(presetList);
    }
    // Load popular GGUF models for Cloud section
    if (window.electronAPI?.hfSearchModels && hfSearchResults.length === 0) {
      setIsSearching(true);
      try {
        const results = await window.electronAPI.hfSearchModels('gguf');
        setHfSearchResults(results?.models || []);
      } catch (error) {
        console.error('Failed to load popular models:', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSelectModel = (model) => {
    setSelectedModel(model);
    setModelName('');
    setSelectedPreset(null);
    setSystemPrompt('');
    setParams({ temperature: 0.7, top_p: 0.9, top_k: 40, repeat_penalty: 1.1, num_ctx: 4096 });
    setActiveSection('general');
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.id);
    setSystemPrompt(preset.systemPrompt);
    setParams((prev) => ({ ...prev, ...preset.params }));
  };

  const handleCreate = async () => {
    if (!modelName.trim() || !selectedModel) return;
    setIsCreating(true);
    setCreateProgress([]);
    try {
      const result = await window.electronAPI.openmindCreateModel({
        name: modelName.trim(),
        baseModel: selectedModel.filename,
        systemPrompt,
        params,
      });
      if (result.success) {
        await loadData();
        onModelCreated?.(result.model);
        resetForm();
        setActiveSection('local');
      }
    } catch (error) {
      setCreateProgress((prev) => [...prev, { type: 'error', message: error.message }]);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (name, e) => {
    e?.stopPropagation();
    if (!confirm(`Delete model "${name}"?`)) return;
    const result = await window.electronAPI.openmindDeleteModel(name);
    if (result.success) await loadData();
  };

  const handleEdit = (model, e) => {
    e?.stopPropagation();
    setEditingModel(model);
    setModelName(model.name);
    setSystemPrompt(model.systemPrompt || '');
    setParams(model.params || {});
    setActiveSection('general');
  };

  const handleUpdate = async () => {
    if (!editingModel) return;
    const result = await window.electronAPI.openmindUpdateModel(editingModel.name, { systemPrompt, params });
    if (result.success) {
      await loadData();
      setEditingModel(null);
      resetForm();
      setActiveSection('local');
    }
  };

  const resetForm = () => {
    setSelectedModel(null);
    setModelName('');
    setSelectedPreset(null);
    setSystemPrompt('');
    setParams({ temperature: 0.7, top_p: 0.9, top_k: 40, repeat_penalty: 1.1, num_ctx: 4096 });
    setEditingModel(null);
  };

  const handleImportGGUF = async () => {
    if (!window.electronAPI?.openmindSelectGGUF) return;
    const result = await window.electronAPI.openmindSelectGGUF();
    if (!result.success) return;
    setIsImporting(true);
    setImportProgress('Importing...');
    try {
      const importResult = await window.electronAPI.openmindImportModel(result.path);
      if (importResult.success) {
        await loadData();
        setImportProgress('');
      } else {
        setImportProgress(`Error: ${importResult.error}`);
      }
    } catch (error) {
      setImportProgress(`Error: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleHfSearch = async () => {
    const query = hfSearchQuery.trim();
    const filterQuery = activeFilters.length > 0 ? activeFilters.join(' ') : '';
    const searchQuery = query ? `${query} ${filterQuery} gguf` : `${filterQuery} gguf`;
    
    setIsSearching(true);
    setSelectedHfModel(null);
    setHfModelDetails(null);
    try {
      if (window.electronAPI?.hfSearchModels) {
        const results = await window.electronAPI.hfSearchModels(searchQuery);
        setHfSearchResults(results?.models || []);
      }
    } catch (error) {
      console.error('HF search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFilter = (filter) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleViewHfModel = async (model) => {
    setSelectedHfModel(model);
    setIsLoadingDetails(true);
    try {
      if (window.electronAPI?.hfGetModelInfo) {
        const result = await window.electronAPI.hfGetModelInfo(model.id);
        if (result.success) {
          setHfModelDetails(result.model);
        }
      }
    } catch (error) {
      console.error('Failed to load model details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleBackToList = () => {
    setSelectedHfModel(null);
    setHfModelDetails(null);
    setShowDownloadMenu(false);
    setDownloadingFile(null);
    setDownloadProgress(null);
  };

  const handleDownloadGGUF = async (file) => {
    if (!hfModelDetails || downloadingFile) return;
    setDownloadingFile(file.name);
    setDownloadProgress({ percent: 0 });
    setShowDownloadMenu(false);
    
    try {
      const result = await window.electronAPI?.hfDownloadGGUF(hfModelDetails.id, file.name);
      if (result?.success) {
        // Reload local models after download
        await loadData();
        setDownloadingFile(null);
        setDownloadProgress(null);
      } else {
        console.error('Download failed:', result?.error);
        setDownloadingFile(null);
        setDownloadProgress(null);
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloadingFile(null);
      setDownloadProgress(null);
    }
  };

  if (!isOpen) return null;

  const presetIcons = {
    assistant: Sparkles, coder: Code, creative: Palette,
    analyst: Search, tutor: GraduationCap, researcher: Lightbulb,
  };

  const isDiscoverySection = activeSection === 'local' || activeSection === 'cloud';
  const hasModel = selectedModel || editingModel;


  // Render Local Models Section
  const renderLocal = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Your Custom Models */}
      {customModels.length > 0 && (
        <div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '10px',
            fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <Brain size={12} />Your Models
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {customModels.map((model) => (
              <div key={model.name} onClick={() => handleEdit(model)}
                style={{
                  padding: '10px 12px', background: theme.bgTertiary,
                  border: `1px solid ${theme.border}`, borderRadius: '6px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = theme.bgTertiary; }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '6px',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Brain size={16} color={theme.textSecondary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: theme.text, fontSize: '0.85rem', fontWeight: '500' }}>{model.name}</div>
                  <div style={{ color: theme.textMuted, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {model.baseName}
                  </div>
                </div>
                <button onClick={(e) => handleDelete(model.name, e)}
                  style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', opacity: 0.6 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = theme.error; e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.opacity = '0.6'; }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local GGUF Models */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: theme.textSecondary, fontSize: '0.75rem',
            fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <HardDrive size={12} />Local GGUF Files
          </label>
          <button onClick={handleImportGGUF} disabled={isImporting}
            style={{
              padding: '4px 10px', background: 'transparent',
              border: `1px solid ${theme.border}`, borderRadius: '4px',
              color: theme.textSecondary, cursor: isImporting ? 'wait' : 'pointer',
              fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px',
            }}
            onMouseEnter={(e) => { if (!isImporting) { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
          >
            <FolderOpen size={12} />Import
          </button>
        </div>

        {importProgress && (
          <div style={{
            padding: '8px 10px', borderRadius: '4px', marginBottom: '10px', fontSize: '0.8rem',
            background: importProgress.startsWith('Error') ? theme.errorBg : theme.bgTertiary,
            color: importProgress.startsWith('Error') ? theme.error : theme.textSecondary,
          }}>
            {importProgress}
          </div>
        )}

        {availableModels.length === 0 ? (
          <div style={{
            padding: '30px', background: theme.bgTertiary, borderRadius: '6px',
            border: `1px solid ${theme.border}`, textAlign: 'center',
          }}>
            <HardDrive size={28} color={theme.textMuted} style={{ marginBottom: '10px' }} />
            <p style={{ color: theme.textSecondary, margin: 0, fontSize: '0.9rem' }}>No local models</p>
            <p style={{ color: theme.textMuted, fontSize: '0.8rem', margin: '6px 0 0 0' }}>
              Import a .gguf file to get started
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {availableModels.map((model) => {
              const isSelected = selectedModel?.filename === model.filename;
              return (
                <div key={model.filename} onClick={() => handleSelectModel(model)}
                  style={{
                    padding: '10px 12px',
                    background: isSelected ? theme.bgActive : theme.bgTertiary,
                    border: `1px solid ${isSelected ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : theme.border}`,
                    borderRadius: '6px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = theme.bgHover; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = theme.bgTertiary; }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '6px',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Cpu size={16} color={theme.textSecondary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: theme.text, fontSize: '0.85rem', fontWeight: '500' }}>{model.baseName}</div>
                    <div style={{ color: theme.textMuted, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {model.quantization && (
                        <span style={{
                          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                          padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem',
                        }}>
                          {model.quantization}
                        </span>
                      )}
                      <span>{model.sizeFormatted}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={16} color={theme.text} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Render Cloud/HuggingFace Section
  const renderCloud = () => {
    // Show model detail view if a model is selected
    if (selectedHfModel) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Back button */}
          <button onClick={handleBackToList}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
              background: 'transparent', border: 'none', color: theme.textSecondary,
              cursor: 'pointer', fontSize: '0.85rem', marginBottom: '16px', alignSelf: 'flex-start',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; }}
          >
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
            Back to search
          </button>

          {isLoadingDetails ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={32} color={theme.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : hfModelDetails ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Model Header */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '12px',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', fontSize: '1.2rem', fontWeight: '600', color: theme.textSecondary,
                }}>
                  {hfModelDetails.avatarUrl ? (
                    <img src={hfModelDetails.avatarUrl} alt={hfModelDetails.author}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = (hfModelDetails.author || 'HF').slice(0, 2).toUpperCase(); }}
                    />
                  ) : (
                    <span>{(hfModelDetails.author || 'HF').slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, color: theme.text, fontSize: '1.1rem', fontWeight: '600' }}>
                    {hfModelDetails.id.split('/')[1]}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: theme.textSecondary, fontSize: '0.85rem' }}>
                    by {hfModelDetails.author}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <span style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
                      ⬇ {hfModelDetails.downloads?.toLocaleString()} downloads
                    </span>
                    <span style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
                      ❤ {hfModelDetails.likes?.toLocaleString()} likes
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {hfModelDetails.tags?.length > 0 && (() => {
                // Filter out internal/technical tags - match HuggingFace's hidden tags
                const hiddenPrefixes = [
                  'base_model:', 'region:', 'endpoints_', 'arxiv:', 'license:',
                  'doi:', 'dataset:', 'co2_eq_emissions', 'autotrain', 'eval_results',
                  'model-index', 'inference:', 'pipeline_tag:', 'library_name:',
                  'tags:', 'widget:', 'mask_token:', 'model_type:', 'language_creators:',
                  'size_categories:', 'source_datasets:', 'task_categories:', 'task_ids:',
                  'paperswithcode_id:', 'pretty_name:', 'viewer:', 'config:', 'splits:',
                  'quantized:', 'finetune:', 'merge:', 'adapter:', 'lora:', 'qlora:',
                ];
                // Also hide specific internal tags
                const hiddenExact = [
                  'endpoints_compatible', 'has_space', 'region:us', 'region:eu',
                  'autotrain_compatible', 'text-generation-inference',
                ];
                let visibleTags = hfModelDetails.tags.filter(tag => 
                  !hiddenPrefixes.some(prefix => tag.toLowerCase().startsWith(prefix.toLowerCase())) &&
                  !hiddenExact.includes(tag.toLowerCase())
                );
                
                // Add license as first tag if available
                if (hfModelDetails.license) {
                  visibleTags = [`license:${hfModelDetails.license}`, ...visibleTags];
                }
                
                // Tag icons mapping using Lucide icons
                const getTagIcon = (tag) => {
                  const lowerTag = tag.toLowerCase();
                  const iconSize = 11;
                  const iconStyle = { flexShrink: 0 };
                  
                  // License
                  if (lowerTag.startsWith('license:')) return <Scale size={iconSize} style={iconStyle} />;
                  
                  // Libraries/Frameworks
                  if (['pytorch', 'torch'].some(k => lowerTag.includes(k))) return <Flame size={iconSize} style={iconStyle} />;
                  if (lowerTag.includes('safetensors')) return <Lock size={iconSize} style={iconStyle} />;
                  if (lowerTag.includes('gguf')) return <Package size={iconSize} style={iconStyle} />;
                  if (['transformers', 'diffusers'].some(k => lowerTag.includes(k))) return <Bot size={iconSize} style={iconStyle} />;
                  if (['onnx', 'tensorrt', 'openvino'].some(k => lowerTag.includes(k))) return <Zap size={iconSize} style={iconStyle} />;
                  if (['peft', 'lora', 'qlora'].some(k => lowerTag.includes(k))) return <Layers size={iconSize} style={iconStyle} />;
                  
                  // Tasks
                  if (['text-generation', 'conversational', 'chat'].some(k => lowerTag.includes(k))) return <MessageSquare size={iconSize} style={iconStyle} />;
                  if (['image', 'vision', 'vit', 'clip'].some(k => lowerTag.includes(k))) return <Image size={iconSize} style={iconStyle} />;
                  if (['audio', 'speech', 'asr', 'whisper', 'wav2vec'].some(k => lowerTag.includes(k))) return <Mic size={iconSize} style={iconStyle} />;
                  if (['tts', 'text-to-speech', 'text-to-audio'].some(k => lowerTag.includes(k))) return <Volume2 size={iconSize} style={iconStyle} />;
                  if (lowerTag.includes('video')) return <Video size={iconSize} style={iconStyle} />;
                  if (['translation', 'multilingual'].some(k => lowerTag.includes(k))) return <Globe size={iconSize} style={iconStyle} />;
                  if (['classification', 'token-class'].some(k => lowerTag.includes(k))) return <Tag size={iconSize} style={iconStyle} />;
                  if (['summarization', 'fill-mask'].some(k => lowerTag.includes(k))) return <FileText size={iconSize} style={iconStyle} />;
                  if (['reinforcement', 'game'].some(k => lowerTag.includes(k))) return <Gamepad2 size={iconSize} style={iconStyle} />;
                  
                  // Features
                  if (['code', 'codellama', 'starcoder'].some(k => lowerTag.includes(k))) return <Code size={iconSize} style={iconStyle} />;
                  if (lowerTag.includes('math')) return <Calculator size={iconSize} style={iconStyle} />;
                  if (lowerTag.includes('instruct')) return <FileText size={iconSize} style={iconStyle} />;
                  if (['multimodal', 'multi-modal'].some(k => lowerTag.includes(k))) return <Layers size={iconSize} style={iconStyle} />;
                  if (['4bit', '8bit', 'awq', 'gptq', 'quant'].some(k => lowerTag.includes(k))) return <Zap size={iconSize} style={iconStyle} />;
                  
                  // Model families - use Brain for all
                  if (['llama', 'mistral', 'mixtral', 'qwen', 'phi', 'gemma', 'falcon', 'gpt', 'bert', 'bloom', 'deepseek', 'yi', 'vicuna', 'alpaca', 'zephyr', 'solar', 'olmo', 'command'].some(k => lowerTag.includes(k))) return <Brain size={iconSize} style={iconStyle} />;
                  if (['stable-diffusion', 'sdxl', 'flux'].some(k => lowerTag.includes(k))) return <Palette size={iconSize} style={iconStyle} />;
                  
                  // Languages (2-letter codes)
                  if (tag.length === 2 && /^[a-z]{2}$/.test(lowerTag)) return <Languages size={iconSize} style={iconStyle} />;
                  
                  return null;
                };
                
                const maxTags = 12;
                const displayTags = visibleTags.slice(0, maxTags);
                const remainingCount = visibleTags.length - maxTags;
                
                return (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {displayTags.map((tag, i) => {
                        const icon = getTagIcon(tag);
                        // Remove "license:" prefix for display
                        let tagText = tag.startsWith('license:') ? tag.replace('license:', '') : tag;
                        const displayTag = tagText.length > 14 ? tagText.slice(0, 13) + '…' : tagText;
                        
                        return (
                          <span key={i} title={tagText}
                            style={{
                              padding: '4px 10px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                              borderRadius: '12px', fontSize: '0.75rem', color: theme.textSecondary,
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              cursor: 'default', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                            }}
                          >
                            {icon}
                            <span>{displayTag}</span>
                          </span>
                        );
                      })}
                      {remainingCount > 0 && (
                        <span style={{
                          padding: '4px 10px', background: 'transparent',
                          borderRadius: '12px', fontSize: '0.75rem', color: theme.textMuted,
                          border: `1px solid ${theme.border}`,
                        }}>
                          +{remainingCount} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Model Card / README */}
              {hfModelDetails.readme && (
                <div 
                  className="model-card-content"
                  style={{
                    color: theme.text,
                    fontSize: '0.85rem',
                    lineHeight: '1.6',
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({ children }) => <h1 style={{ fontSize: '1.3rem', fontWeight: '600', margin: '0 0 12px 0', color: theme.text, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>{children}</h1>,
                      h2: ({ children }) => <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '16px 0 8px 0', color: theme.text }}>{children}</h2>,
                      h3: ({ children }) => <h3 style={{ fontSize: '0.95rem', fontWeight: '600', margin: '12px 0 6px 0', color: theme.text }}>{children}</h3>,
                      p: ({ children }) => <p style={{ margin: '8px 0', color: theme.textSecondary }}>{children}</p>,
                      a: ({ href, children }) => <a href={href} onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal(href); }} style={{ color: isDark ? '#60a5fa' : '#2563eb', textDecoration: 'none' }}>{children}</a>,
                      code: ({ inline, children }) => inline 
                        ? <code style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{children}</code>
                        : <pre style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', padding: '12px', borderRadius: '6px', overflow: 'auto', fontSize: '0.8rem' }}><code>{children}</code></pre>,
                      ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: '20px', color: theme.textSecondary }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '8px 0', paddingLeft: '20px', color: theme.textSecondary }}>{children}</ol>,
                      li: ({ children }) => <li style={{ margin: '4px 0' }}>{children}</li>,
                      blockquote: ({ children }) => <blockquote style={{ borderLeft: `3px solid ${theme.border}`, margin: '8px 0', paddingLeft: '12px', color: theme.textMuted }}>{children}</blockquote>,
                      table: ({ children }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '8px 0', fontSize: '0.8rem' }}>{children}</table>,
                      th: ({ children }) => <th style={{ border: `1px solid ${theme.border}`, padding: '8px', textAlign: 'left', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>{children}</th>,
                      td: ({ children }) => <td style={{ border: `1px solid ${theme.border}`, padding: '8px' }}>{children}</td>,
                      img: ({ src, alt, width }) => {
                        const imgSrc = src?.startsWith('http') ? src : `https://huggingface.co/${hfModelDetails.id}/resolve/main/${src}`;
                        // Detect badges (shields.io, img.shields.io, badge URLs)
                        const isBadge = src?.includes('shields.io') || src?.includes('badge') || alt?.toLowerCase().includes('badge');
                        return <img src={imgSrc} alt={alt} style={{ 
                          maxWidth: isBadge ? '150px' : (width ? `${Math.min(parseInt(width), 300)}px` : '100%'),
                          height: isBadge ? '20px' : 'auto',
                          borderRadius: isBadge ? '3px' : '6px', 
                          margin: '4px 2px',
                          verticalAlign: 'middle',
                        }} />;
                      },
                      hr: () => <hr style={{ border: 'none', borderTop: `1px solid ${theme.border}`, margin: '16px 0' }} />,
                      // HTML elements support
                      div: ({ children, style, ...props }) => <div style={{ textAlign: props.align || 'left' }} {...props}>{children}</div>,
                    }}
                  >
                    {hfModelDetails.readme}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted }}>
              Failed to load model details
            </div>
          )}
        </div>
      );
    }

    // Default search view
    return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input type="text" value={hfSearchQuery}
            onChange={(e) => setHfSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleHfSearch()}
            placeholder="Search GGUF models..."
            style={{
              width: '200px', padding: '8px 12px', background: theme.bgTertiary,
              border: `1px solid ${theme.border}`, borderRadius: '6px',
              color: theme.text, fontSize: '0.85rem', outline: 'none',
            }}
          />
          <button onClick={handleHfSearch} disabled={isSearching}
            style={{
              padding: '8px 12px', background: isDark ? '#fff' : '#1a1a1a',
              border: 'none', borderRadius: '6px', color: isDark ? '#000' : '#fff',
              cursor: isSearching ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', fontSize: '0.85rem',
            }}
          >
            {isSearching ? <Loader2 size={14} /> : <Search size={14} />}
          </button>
          
          {/* Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'llama', label: 'Llama' },
              { id: 'mistral', label: 'Mistral' },
              { id: 'qwen', label: 'Qwen' },
              { id: 'phi', label: 'Phi' },
              { id: 'gemma', label: 'Gemma' },
              { id: 'deepseek', label: 'DeepSeek' },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                style={{
                  padding: '6px 10px',
                  background: activeFilters.includes(filter.id) 
                    ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
                    : 'transparent',
                  border: `1px solid ${activeFilters.includes(filter.id) ? theme.text : theme.border}`,
                  borderRadius: '14px',
                  color: activeFilters.includes(filter.id) ? theme.text : theme.textSecondary,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!activeFilters.includes(filter.id)) {
                    e.currentTarget.style.borderColor = theme.textSecondary;
                    e.currentTarget.style.color = theme.text;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!activeFilters.includes(filter.id)) {
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.color = theme.textSecondary;
                  }
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {hfSearchResults.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px', background: theme.bgTertiary, borderRadius: '6px',
            border: `1px solid ${theme.border}`, textAlign: 'center', minHeight: '300px',
          }}>
            {isSearching ? (
              <>
                <Loader2 size={32} color={theme.textMuted} style={{ marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: theme.textSecondary, margin: 0, fontSize: '0.9rem' }}>
                  Loading popular models...
                </p>
              </>
            ) : (
              <>
                <Cloud size={32} color={theme.textMuted} style={{ marginBottom: '12px' }} />
                <p style={{ color: theme.textSecondary, margin: 0, fontSize: '0.9rem' }}>
                  No models found
                </p>
                <p style={{ color: theme.textMuted, fontSize: '0.8rem', margin: '6px 0 0 0' }}>
                  Try a different search term
                </p>
              </>
            )}
          </div>
        )}

        {hfSearchResults.length > 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ 
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', 
              flex: 1, alignContent: 'start', overflowY: 'auto', paddingRight: '4px',
            }}>
              {hfSearchResults.map((model) => (
                <div key={model.id}
                  style={{
                    padding: '14px', background: theme.bgTertiary,
                    border: `1px solid ${theme.border}`, borderRadius: '8px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    cursor: 'pointer', transition: 'all 0.15s', minHeight: '90px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = theme.bgTertiary; e.currentTarget.style.borderColor = theme.border; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '8px',
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      overflow: 'hidden', fontSize: '0.85rem', fontWeight: '600', color: theme.textSecondary,
                    }}>
                      {model.avatarUrl ? (
                        <img 
                          src={model.avatarUrl} 
                          alt={model.author}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { 
                            e.target.style.display = 'none'; 
                            e.target.parentElement.textContent = (model.author || 'HF').slice(0, 2).toUpperCase();
                          }}
                        />
                      ) : (
                        <span>{(model.author || 'HF').slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <MarqueeText
                        text={model.id.split('/')[1] || model.id}
                        maxWidth={180}
                        style={{ color: theme.text, fontSize: '0.85rem', fontWeight: '500' }}
                      />
                      <div style={{ 
                        color: theme.textMuted, fontSize: '0.7rem', marginTop: '2px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {model.author || model.id.split('/')[0]}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <div style={{ color: theme.textMuted, fontSize: '0.75rem' }}>
                      {model.downloads?.toLocaleString() || 0} downloads
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleViewHfModel(model); }}
                      style={{
                        padding: '5px 10px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                        border: 'none', borderRadius: '4px',
                        color: theme.text, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'; }}
                    >
                      <Search size={12} />View
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ color: theme.textMuted, fontSize: '0.75rem', marginTop: 'auto', paddingTop: '12px', textAlign: 'center' }}>
              Download .gguf files from HuggingFace, then use Local → Import
            </p>
          </div>
        )}
      </div>
    </div>
    );
  };


  // Render General/Config Section
  const renderGeneral = () => {
    if (!hasModel) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', color: theme.textMuted,
          textAlign: 'center', padding: '40px',
        }}>
          <Cpu size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '0.95rem', color: theme.textSecondary }}>No model selected</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>
            Select a model from Discovery to configure it
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Selected Model Info */}
        <div style={{
          padding: '14px', background: theme.bgTertiary, borderRadius: '6px',
          border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Cpu size={20} color={theme.textSecondary} />
          <div>
            <div style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>
              {editingModel ? editingModel.name : selectedModel?.baseName}
            </div>
            <div style={{ color: theme.textMuted, fontSize: '0.75rem' }}>
              {editingModel ? `Base: ${editingModel.baseName}` : selectedModel?.sizeFormatted}
            </div>
          </div>
        </div>

        {/* Model Name */}
        {!editingModel && (
          <div>
            <label style={{
              display: 'block', color: theme.textSecondary, fontSize: '0.75rem',
              marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Model Name
            </label>
            <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)}
              placeholder="my-assistant"
              style={{
                width: '100%', padding: '12px 14px', background: theme.bgTertiary,
                border: `1px solid ${theme.border}`, borderRadius: '6px',
                color: theme.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Presets */}
        {!editingModel && (
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '10px',
              fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <Sparkles size={12} />Preset
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {presets.map((preset) => {
                const Icon = presetIcons[preset.id] || Sparkles;
                const isSelected = selectedPreset === preset.id;
                return (
                  <button key={preset.id} onClick={() => handlePresetSelect(preset)}
                    style={{
                      padding: '12px 10px',
                      background: isSelected ? theme.bgActive : theme.bgTertiary,
                      border: `1px solid ${isSelected ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : theme.border}`,
                      borderRadius: '6px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = theme.bgHover; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = theme.bgTertiary; }}
                  >
                    <Icon size={18} color={isSelected ? theme.text : theme.textSecondary} />
                    <div style={{ color: theme.text, fontSize: '0.8rem', marginTop: '8px', fontWeight: '500' }}>
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* System Prompt */}
        <div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '8px',
            fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <MessageSquare size={12} />System Prompt
          </label>
          <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant..." rows={4}
            style={{
              width: '100%', padding: '12px 14px', background: theme.bgTertiary,
              border: `1px solid ${theme.border}`, borderRadius: '6px',
              color: theme.text, fontSize: '0.9rem', outline: 'none',
              resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Parameters */}
        <div>
          <label style={{
            display: 'block', color: theme.textSecondary, fontSize: '0.75rem',
            marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            Parameters
          </label>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px',
            padding: '14px', background: theme.bgTertiary, borderRadius: '6px',
            border: `1px solid ${theme.border}`,
          }}>
            {[
              { key: 'temperature', label: 'Temperature', min: 0, max: 2, step: 0.1 },
              { key: 'top_p', label: 'Top P', min: 0, max: 1, step: 0.05 },
              { key: 'top_k', label: 'Top K', min: 1, max: 100, step: 1 },
              { key: 'repeat_penalty', label: 'Repeat Penalty', min: 1, max: 2, step: 0.05 },
            ].map(({ key, label, min, max, step }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>{label}</span>
                  <span style={{ color: theme.text, fontSize: '0.8rem', fontWeight: '500' }}>{params[key]}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={params[key]}
                  onChange={(e) => setParams((p) => ({ ...p, [key]: parseFloat(e.target.value) }))}
                  style={{ width: '100%', accentColor: isDark ? '#fff' : '#1a1a1a' }}
                />
              </div>
            ))}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>Context Size</span>
                <span style={{ color: theme.text, fontSize: '0.8rem', fontWeight: '500' }}>{params.num_ctx.toLocaleString()}</span>
              </div>
              <input type="range" min={512} max={32768} step={512} value={params.num_ctx}
                onChange={(e) => setParams((p) => ({ ...p, num_ctx: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: isDark ? '#fff' : '#1a1a1a' }}
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        {createProgress.length > 0 && (
          <div style={{
            background: theme.bgTertiary, borderRadius: '6px', padding: '12px',
            border: `1px solid ${theme.border}`, maxHeight: '100px', overflow: 'auto',
          }}>
            {createProgress.map((p, i) => (
              <div key={i} style={{
                color: p.type === 'error' ? theme.error : p.type === 'success' ? theme.success : theme.textSecondary,
                fontSize: '0.85rem', marginBottom: '4px',
              }}>
                {p.message}
              </div>
            ))}
          </div>
        )}

        {/* Create/Save Button */}
        <div style={{ marginTop: 'auto', paddingTop: '18px' }}>
          <button onClick={editingModel ? handleUpdate : handleCreate}
            disabled={isCreating || (!editingModel && !modelName.trim())}
            style={{
              width: '100%', padding: '12px 18px', background: isDark ? '#fff' : '#1a1a1a',
              border: 'none', borderRadius: '6px', color: isDark ? '#000' : '#fff',
              fontSize: '0.9rem', fontWeight: '500',
              cursor: isCreating || (!editingModel && !modelName.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: isCreating || (!editingModel && !modelName.trim()) ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isCreating && (editingModel || modelName.trim())) {
                e.currentTarget.style.background = isDark ? '#e0e0e0' : '#333';
              }
            }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? '#fff' : '#1a1a1a'; }}
          >
            {editingModel ? <Save size={16} /> : <Plus size={16} />}
            {isCreating ? 'Creating...' : editingModel ? 'Save Changes' : 'Create Model'}
          </button>
        </div>
      </div>
    );
  };

  // Render Train Section
  const renderTrain = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
            background: `linear-gradient(135deg, ${isDark ? '#ffd700' : '#f59e0b'}, ${isDark ? '#ff8c00' : '#d97706'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Train size={32} color="#fff" />
          </div>
          <h2 style={{ margin: '0 0 8px 0', color: theme.text, fontSize: '1.3rem', fontWeight: '600' }}>
            OpenMind Train
          </h2>
          <p style={{ margin: 0, color: theme.textSecondary, fontSize: '0.9rem' }}>
            Finetune AI models with your own data using H200 GPUs
          </p>
        </div>

        {/* Pricing Card */}
        <div style={{
          background: isDark ? 'rgba(255,215,0,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${isDark ? 'rgba(255,215,0,0.2)' : 'rgba(245,158,11,0.2)'}`,
          borderRadius: '12px', padding: '24px', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '700', color: theme.text }}>25€</span>
            <span style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>/month</span>
          </div>
          <p style={{ margin: '0 0 16px 0', color: theme.textSecondary, fontSize: '0.85rem' }}>
            Join QuantAILabs to access H200 GPU training
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginBottom: '20px' }}>
            {[
              'H200 GPU access for finetuning',
              'Daily GPU minutes refresh',
              'LoRA & QLoRA training support',
              'Export to GGUF format',
              'Priority support',
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.textSecondary, fontSize: '0.85rem' }}>
                <CheckCircle size={14} color={isDark ? '#ffd700' : '#d97706'} />
                {feature}
              </div>
            ))}
          </div>

          <button
            onClick={() => window.electronAPI?.openExternal('https://huggingface.co/organizations/QuantAILabs/share/your-invite-link')}
            style={{
              width: '100%', padding: '12px 20px',
              background: `linear-gradient(135deg, ${isDark ? '#ffd700' : '#f59e0b'}, ${isDark ? '#ff8c00' : '#d97706'})`,
              border: 'none', borderRadius: '8px', color: '#000',
              fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <CreditCard size={16} />
            Subscribe & Join QuantAILabs
          </button>
        </div>

        {/* How it works */}
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 12px 0', color: theme.text, fontSize: '0.9rem', fontWeight: '600' }}>
            How it works
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { step: 1, title: 'Subscribe', desc: 'Join QuantAILabs on HuggingFace (25€/month)' },
              { step: 2, title: 'Connect', desc: 'Link your HuggingFace account in Settings' },
              { step: 3, title: 'Upload Data', desc: 'Prepare your training data (JSONL format)' },
              { step: 4, title: 'Train', desc: 'Select base model and start finetuning' },
              { step: 5, title: 'Download', desc: 'Get your custom GGUF model' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: '600', color: theme.textSecondary,
                }}>
                  {step}
                </div>
                <div>
                  <div style={{ color: theme.text, fontSize: '0.85rem', fontWeight: '500' }}>{title}</div>
                  <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coming Soon Banner */}
        <div style={{
          padding: '12px 16px', borderRadius: '8px',
          background: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.08)',
          border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)'}`,
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <AlertCircle size={18} color={isDark ? '#60a5fa' : '#3b82f6'} />
          <div>
            <div style={{ color: theme.text, fontSize: '0.85rem', fontWeight: '500' }}>Coming Soon</div>
            <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
              Training backend is being set up. Subscribe now to be notified!
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(2px)',
        padding: isFullscreen ? '24px' : '0',
      }}
    >
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bg, borderRadius: isFullscreen ? '12px' : '8px',
          width: isFullscreen ? '100%' : '1000px',
          maxWidth: isFullscreen ? '100%' : '94vw',
          height: isFullscreen ? '100%' : '780px',
          maxHeight: isFullscreen ? '100%' : '92vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: `1px solid ${theme.border}`,
          boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.15)',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', borderBottom: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} color={isDark ? '#fff' : '#1a1a1a'} />
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
              OpenMind Create
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Download GGUF - shown when viewing a HF model with GGUF files */}
            {selectedHfModel && hfModelDetails?.ggufFiles?.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)} 
                  title="Download GGUF"
                  disabled={!!downloadingFile}
                  style={{
                    background: 'transparent', border: 'none', color: downloadingFile ? theme.accent : theme.textSecondary,
                    cursor: downloadingFile ? 'wait' : 'pointer', padding: '6px', borderRadius: '4px', display: 'flex',
                    alignItems: 'center', gap: '4px',
                  }}
                  onMouseEnter={(e) => { if (!downloadingFile) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; } }}
                  onMouseLeave={(e) => { if (!downloadingFile) { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent'; } }}
                >
                  {downloadingFile ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '0.75rem' }}>{downloadProgress?.percent || 0}%</span>
                    </>
                  ) : (
                    <Download size={18} />
                  )}
                </button>
                
                {/* Download Menu Dropdown */}
                {showDownloadMenu && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowDownloadMenu(false)} />
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                      background: theme.bgSecondary, border: `1px solid ${theme.border}`,
                      borderRadius: '8px', padding: '8px', minWidth: '280px', maxHeight: '300px',
                      overflowY: 'auto', zIndex: 100,
                      boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.15)',
                    }}>
                      <div style={{ padding: '4px 8px', color: theme.textMuted, fontSize: '0.75rem', marginBottom: '4px' }}>
                        Select GGUF to download
                      </div>
                      {hfModelDetails.ggufFiles.map((file, i) => (
                        <button key={i} onClick={() => handleDownloadGGUF(file)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '8px 10px', background: 'transparent',
                            border: 'none', borderRadius: '4px', cursor: 'pointer',
                            color: theme.text, fontSize: '0.8rem', textAlign: 'left',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                            {file.name}
                          </span>
                          <span style={{ color: theme.textMuted, fontSize: '0.75rem', flexShrink: 0 }}>
                            {file.sizeFormatted}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Toggle Sidebar */}
            <button onClick={() => setSidebarVisible(!sidebarVisible)} title={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
              style={{
                background: 'transparent', border: 'none', color: theme.textSecondary,
                cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent'; }}
            >
              {sidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            {/* Toggle Fullscreen */}
            <button onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              style={{
                background: 'transparent', border: 'none', color: theme.textSecondary,
                cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent'; }}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            {/* Close */}
            <button onClick={onClose}
              style={{
                background: 'transparent', border: 'none', color: theme.textSecondary,
                cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar */}
          {sidebarVisible && (
          <div style={{
            width: '200px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px',
            background: theme.bgSecondary, borderRight: `1px solid ${theme.border}`,
          }}>
            {/* Discovery Dropdown */}
            <div>
              <button onClick={() => setDiscoveryExpanded(!discoveryExpanded)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                  padding: '10px 12px', background: isDiscoverySection ? theme.bgActive : 'transparent',
                  border: 'none', borderRadius: '6px',
                  color: isDiscoverySection ? theme.text : theme.textSecondary,
                  cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!isDiscoverySection) { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
                onMouseLeave={(e) => { if (!isDiscoverySection) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
              >
                <Compass size={18} />
                <span style={{ flex: 1 }}>Discovery</span>
                {discoveryExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {/* Sub-items */}
              {discoveryExpanded && (
                <div style={{ marginLeft: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button onClick={() => setActiveSection('local')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', background: activeSection === 'local' ? theme.bgActive : 'transparent',
                      border: 'none', borderRadius: '4px',
                      color: activeSection === 'local' ? theme.text : theme.textSecondary,
                      cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', width: '100%',
                    }}
                    onMouseEnter={(e) => { if (activeSection !== 'local') { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
                    onMouseLeave={(e) => { if (activeSection !== 'local') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
                  >
                    <HardDrive size={14} />Local
                  </button>
                  <button onClick={() => setActiveSection('cloud')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', background: activeSection === 'cloud' ? theme.bgActive : 'transparent',
                      border: 'none', borderRadius: '4px',
                      color: activeSection === 'cloud' ? theme.text : theme.textSecondary,
                      cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', width: '100%',
                    }}
                    onMouseEnter={(e) => { if (activeSection !== 'cloud') { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
                    onMouseLeave={(e) => { if (activeSection !== 'cloud') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
                  >
                    <Cloud size={14} />Cloud
                  </button>
                </div>
              )}
            </div>

            {/* Train Dropdown */}
            <div>
              <button onClick={() => setTrainExpanded(!trainExpanded)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                  padding: '10px 12px', background: activeSection === 'train' ? theme.bgActive : 'transparent',
                  border: 'none', borderRadius: '6px',
                  color: activeSection === 'train' ? theme.text : theme.textSecondary,
                  cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (activeSection !== 'train') { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
                onMouseLeave={(e) => { if (activeSection !== 'train') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
              >
                <Train size={18} />
                <span style={{ flex: 1 }}>Train</span>
                <span style={{ 
                  fontSize: '0.6rem', padding: '2px 6px', borderRadius: '8px',
                  background: isDark ? 'rgba(255,200,0,0.2)' : 'rgba(255,150,0,0.15)',
                  color: isDark ? '#ffd700' : '#d97706',
                }}>PRO</span>
                {trainExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {trainExpanded && (
                <div style={{ marginLeft: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button onClick={() => setActiveSection('train')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', background: activeSection === 'train' ? theme.bgActive : 'transparent',
                      border: 'none', borderRadius: '4px',
                      color: activeSection === 'train' ? theme.text : theme.textSecondary,
                      cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', width: '100%',
                    }}
                    onMouseEnter={(e) => { if (activeSection !== 'train') { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
                    onMouseLeave={(e) => { if (activeSection !== 'train') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
                  >
                    <Zap size={14} />Finetune
                  </button>
                </div>
              )}
            </div>

            {/* General */}
            <button onClick={() => hasModel && setActiveSection('general')} disabled={!hasModel}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', background: activeSection === 'general' ? theme.bgActive : 'transparent',
                border: 'none', borderRadius: '6px',
                color: !hasModel ? theme.textMuted : activeSection === 'general' ? theme.text : theme.textSecondary,
                cursor: !hasModel ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem', fontWeight: activeSection === 'general' ? '500' : '400',
                textAlign: 'left', opacity: !hasModel ? 0.5 : 1, width: '100%',
              }}
              onMouseEnter={(e) => { if (hasModel && activeSection !== 'general') { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text; } }}
              onMouseLeave={(e) => { if (hasModel && activeSection !== 'general') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSecondary; } }}
            >
              <Settings size={18} />General
            </button>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Open on HuggingFace button - shown when viewing a HF model */}
            {selectedHfModel && hfModelDetails && (
              <button onClick={() => window.electronAPI?.openExternal(`https://huggingface.co/${hfModelDetails.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', background: 'transparent',
                  border: `1px solid ${theme.border}`, borderRadius: '6px',
                  color: theme.textSecondary, cursor: 'pointer',
                  fontSize: '0.8rem', width: '100%', justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
              >
                <ExternalLink size={14} />
                Open on HuggingFace
              </button>
            )}
          </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {activeSection === 'local' && renderLocal()}
            {activeSection === 'cloud' && renderCloud()}
            {activeSection === 'train' && renderTrain()}
            {activeSection === 'general' && renderGeneral()}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OpenMindCreator;
