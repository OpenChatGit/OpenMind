import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Code2, X, FilePlus, FolderPlus, RefreshCw, ChevronsDownUp, MoreHorizontal, Play, File, FolderOpen, Plus, Folder, Eye } from 'lucide-react';
import FileExplorer from './FileExplorer';
import { useTheme } from '../contexts/ThemeContext';
import CodeEditor from './CodeEditor';
import MarkdownPreview from './MarkdownPreview';
import FileIcon from './FileIcon';
import ExtensionsPanel from './ExtensionsPanel';
import TerminalPanel from './TerminalPanel';
import { getHighlightParts } from '../utils/searchUtils';

const IDEMode = forwardRef(({ activePanel, isSidePanelVisible = true, onStatusChange }, ref) => {
  const { theme, isDark } = useTheme();
  const fileExplorerRef = useRef(null);
  const codeEditorRef = useRef(null);
  const analysisTimerRef = useRef(null);
  const lastDiagnosticsRef = useRef(new Map()); // Track diagnostics per file
  const [sidePanelWidth, setSidePanelWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [workspaceFolder, setWorkspaceFolder] = useState(() => {
    // Load saved workspace from localStorage
    const saved = localStorage.getItem('ide-workspace-folder');
    return saved || null;
  });
  const [fileContents, setFileContents] = useState({});
  const [recentProjects, setRecentProjects] = useState([]);
  const [explorerKey, setExplorerKey] = useState(0);
  const [unsavedWarning, setUnsavedWarning] = useState(null); // { tabId, tabName }
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [groupedResults, setGroupedResults] = useState({});
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [searchOptions, setSearchOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false
  });
  const [gitInfo, setGitInfo] = useState({ isRepo: false, branch: '' });
  const [editorHighlight, setEditorHighlight] = useState(null); // { query, line }
  const [wordWrap, setWordWrap] = useState(() => {
    return localStorage.getItem('ide-word-wrap') === 'true';
  });
  const [editorTheme, setEditorTheme] = useState(() => {
    return localStorage.getItem('ide-editor-theme') || 'dark-plus';
  });
  const [showTerminal, setShowTerminal] = useState(false);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  
  // Panel data states
  const [problems, setProblems] = useState([]);
  const [outputLogs, setOutputLogs] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [forwardedPorts, setForwardedPorts] = useState([]);

  // Memoize callbacks to prevent recreation
  const checkGitStatus = useCallback(async (folder) => {
    const result = await window.electronAPI?.ideGitStatus(folder);
    if (result?.success) {
      setGitInfo({ isRepo: result.isRepo, branch: result.branch || '' });
    }
  }, []);

  const loadRecentProjects = useCallback(async () => {
    const result = await window.electronAPI?.ideListProjects();
    if (result?.success) {
      setRecentProjects(result.projects);
    }
  }, []);

  // Load recent projects on mount
  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  // Save workspace folder to localStorage when it changes
  useEffect(() => {
    if (workspaceFolder) {
      localStorage.setItem('ide-workspace-folder', workspaceFolder);
      checkGitStatus(workspaceFolder);
    } else {
      localStorage.removeItem('ide-workspace-folder');
      setGitInfo({ isRepo: false, branch: '' });
    }
  }, [workspaceFolder, checkGitStatus]);

  // Report status changes to parent
  useEffect(() => {
    if (onStatusChange) {
      const activeFile = openTabs.find(t => t.id === activeTab);
      const errorCount = problems.filter(p => p.severity === 'error').length;
      const warningCount = problems.filter(p => p.severity === 'warning').length;
      
      // Get language from filename
      const getLanguageName = (filename) => {
        const ext = filename?.split('.').pop()?.toLowerCase();
        const langMap = {
          js: 'JavaScript', jsx: 'JavaScript JSX', ts: 'TypeScript', tsx: 'TypeScript JSX',
          py: 'Python', java: 'Java', c: 'C', cpp: 'C++', cs: 'C#',
          html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', md: 'Markdown',
          xml: 'XML', yaml: 'YAML', yml: 'YAML', sql: 'SQL', sh: 'Shell Script',
          ps1: 'PowerShell', dockerfile: 'Dockerfile', vue: 'Vue', svelte: 'Svelte'
        };
        return langMap[ext] || 'Plain Text';
      };
      
      onStatusChange({
        line: cursorPosition.line,
        column: cursorPosition.column,
        language: activeFile ? getLanguageName(activeFile.name) : '',
        encoding: 'UTF-8',
        lineEnding: 'CRLF',
        indentation: 'Spaces: 2',
        gitBranch: gitInfo.branch || 'main',
        errorCount,
        warningCount
      });
    }
  }, [cursorPosition, activeTab, openTabs, problems, gitInfo, onStatusChange]);

  // Open folder dialog
  const handleOpenFolder = async () => {
    const result = await window.electronAPI?.ideSelectFolder();
    if (result?.success) {
      setWorkspaceFolder(result.folderPath);
      setExplorerKey(prev => prev + 1);
    }
  };

  // Create new project
  const handleNewProject = async () => {
    const projectName = prompt('Project name:');
    if (projectName && projectName.trim()) {
      const result = await window.electronAPI?.ideCreateProject(projectName.trim());
      if (result?.success) {
        setWorkspaceFolder(result.projectPath);
        setExplorerKey(prev => prev + 1);
        loadRecentProjects();
      } else {
        alert(result?.error || 'Error creating project');
      }
    }
  };

  // Open existing project
  const handleOpenProject = (projectPath) => {
    setWorkspaceFolder(projectPath);
    setExplorerKey(prev => prev + 1);
  };

  // File handlers
  const handleFileSelect = (item) => {
    if (item.isRoot) {
      setWorkspaceFolder(item.path);
      setExplorerKey(prev => prev + 1);
    }
  };

  // Handle Monaco diagnostics - stable callback that checks for changes
  const handleMonacoDiagnostics = useCallback((filePath, fileName, diagnostics) => {
    // Create a signature to compare
    const signature = JSON.stringify(diagnostics.map(d => ({
      l: d.line, c: d.column, m: d.message, s: d.severity
    })));
    
    // Check if diagnostics actually changed
    const lastSignature = lastDiagnosticsRef.current.get(filePath);
    if (lastSignature === signature) return; // No change
    
    lastDiagnosticsRef.current.set(filePath, signature);
    
    // Update problems state
    setProblems(prev => {
      const filtered = prev.filter(p => p.file !== filePath || p.source !== 'Monaco');
      const newProblems = diagnostics.map(d => ({
        ...d,
        file: filePath,
        fileName: fileName,
        source: 'Monaco'
      }));
      return [...filtered, ...newProblems];
    });
  }, []);

  // Analyze code for problems (backend analyzer)
  const analyzeCode = useCallback(async (filePath, content) => {
    if (!filePath || !content) return;
    
    try {
      const result = await window.electronAPI?.analyzeCode?.(filePath, content);
      if (result?.success && result.problems) {
        // Update problems for this file
        setProblems(prev => {
          // Remove old problems for this file (not Monaco ones)
          const filtered = prev.filter(p => p.file !== filePath || p.source === 'Monaco');
          // Add new problems
          const newProblems = result.problems.map(p => ({
            ...p,
            file: filePath,
            fileName: filePath.split(/[/\\]/).pop(),
            source: 'Analyzer'
          }));
          return [...filtered, ...newProblems];
        });
      }
    } catch (err) {
      // Silently ignore - backend might not be ready
    }
  }, []);

  const handleFileOpen = async (item, asPreview = false) => {
    if (item.isDirectory) return;
    
    const isMarkdown = /\.(md|mdx)$/i.test(item.name);
    const tabId = asPreview ? `preview:${item.path}` : item.path;
    
    // Check if already open
    const existingTab = openTabs.find(t => t.id === tabId);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }
    
    // Load file content
    const result = await window.electronAPI?.ideReadFile(item.path);
    if (result?.success) {
      const newTab = {
        id: tabId,
        name: asPreview ? `Preview: ${item.name}` : item.name,
        filename: item.name,
        path: item.path,
        type: asPreview ? 'preview' : 'file'
      };
      setOpenTabs(prev => [...prev, newTab]);
      setFileContents(prev => ({ ...prev, [tabId]: result.content }));
      setActiveTab(tabId);
      
      // Analyze code on file open (if not preview)
      if (!asPreview && !isMarkdown) {
        setTimeout(() => analyzeCode(item.path, result.content), 100);
      }
    }
  };

  // Handle markdown preview
  const handlePreviewFile = (item) => {
    handleFileOpen(item, true);
  };

  // Handle code changes - memoized to prevent unnecessary re-renders
  const handleCodeChange = useCallback((filePath, newContent) => {
    setFileContents(prev => ({ ...prev, [filePath]: newContent }));
    // Mark tab as modified
    setOpenTabs(prev => prev.map(tab => 
      tab.path === filePath ? { ...tab, modified: true } : tab
    ));
    
    // Debounced code analysis
    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
    }
    analysisTimerRef.current = setTimeout(() => {
      analyzeCode(filePath, newContent);
    }, 500); // 500ms debounce
  }, [analyzeCode]);

  // Save file - memoized
  const handleSaveFile = useCallback(async (filePath) => {
    const content = fileContents[filePath];
    if (content !== undefined) {
      const result = await window.electronAPI?.ideSaveFile(filePath, content);
      if (result?.success) {
        // Remove modified indicator
        setOpenTabs(prev => prev.map(tab => 
          tab.path === filePath ? { ...tab, modified: false } : tab
        ));
      }
    }
  }, [fileContents]);

  // Close tab with proper navigation - memoized
  const handleCloseTab = useCallback((tabId, forceClose = false) => {
    setOpenTabs(prevTabs => {
      const tab = prevTabs.find(t => t.id === tabId);
      
      // Check if tab has unsaved changes
      if (tab?.modified && !forceClose) {
        setUnsavedWarning({ tabId, tabName: tab.name });
        return prevTabs; // Don't modify tabs
      }
      
      const tabIndex = prevTabs.findIndex(t => t.id === tabId);
      const newTabs = prevTabs.filter(t => t.id !== tabId);
      setUnsavedWarning(null);
      
      // If closing active tab, switch to adjacent tab
      setActiveTab(currentActive => {
        if (currentActive === tabId && newTabs.length > 0) {
          const newIndex = Math.min(tabIndex, newTabs.length - 1);
          return newTabs[newIndex].id;
        } else if (newTabs.length === 0) {
          return null;
        }
        return currentActive;
      });
      
      return newTabs;
    });
  }, []);

  // Force close without saving
  const handleForceCloseTab = () => {
    if (unsavedWarning) {
      handleCloseTab(unsavedWarning.tabId, true);
    }
  };

  // Save and close
  const handleSaveAndCloseTab = async () => {
    if (unsavedWarning) {
      await handleSaveFile(unsavedWarning.tabId);
      handleCloseTab(unsavedWarning.tabId, true);
    }
  };

  // Memoize save and close handlers for keyboard shortcuts
  const handleSaveCurrentTab = useCallback(() => {
    if (activeTab && activeTab !== 'welcome' && !activeTab.startsWith('preview:')) {
      handleSaveFile(activeTab);
    }
  }, [activeTab, handleSaveFile]);

  const handleCloseCurrentTab = useCallback(() => {
    if (activeTab && activeTab !== 'welcome') {
      handleCloseTab(activeTab);
    }
  }, [activeTab, handleCloseTab]);

  // Editor action handler - delegates to CodeEditor ref
  const editorAction = useCallback((action) => {
    const editor = codeEditorRef.current;
    if (!editor) return;
    
    switch (action) {
      case 'undo':
        editor.undo();
        break;
      case 'redo':
        editor.redo();
        break;
      case 'cut':
        editor.cut();
        break;
      case 'copy':
        editor.copy();
        break;
      case 'paste':
        editor.paste();
        break;
      case 'selectAll':
        editor.selectAll();
        break;
      case 'copyLineUp':
        editor.copyLineUp();
        break;
      case 'copyLineDown':
        editor.copyLineDown();
        break;
      case 'moveLineUp':
        editor.moveLineUp();
        break;
      case 'moveLineDown':
        editor.moveLineDown();
        break;
      case 'duplicateSelection':
        editor.duplicateSelection();
        break;
      case 'toggleLineComment':
        editor.toggleLineComment();
        break;
      case 'toggleBlockComment':
        editor.toggleBlockComment();
        break;
      default:
        console.log('Unknown editor action:', action);
    }
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    newFile: () => {
      fileExplorerRef.current?.startNewFile();
    },
    openFile: async () => {
      const result = await window.electronAPI?.ideSelectFile?.();
      if (result?.success && result.filePath) {
        const fileName = result.filePath.split(/[/\\]/).pop();
        handleFileOpen({ path: result.filePath, name: fileName, isDirectory: false });
      }
    },
    openFolder: handleOpenFolder,
    saveCurrentFile: handleSaveCurrentTab,
    saveFileAs: async () => {
      if (activeTab && fileContents[activeTab] !== undefined) {
        const result = await window.electronAPI?.ideSaveFileAs?.(activeTab, fileContents[activeTab]);
        if (result?.success) {
          const newPath = result.filePath;
          const newName = newPath.split(/[/\\]/).pop();
          setOpenTabs(prev => prev.map(tab => 
            tab.id === activeTab ? { ...tab, id: newPath, path: newPath, name: newName, modified: false } : tab
          ));
          setFileContents(prev => {
            const newContents = { ...prev };
            if (activeTab !== newPath) {
              newContents[newPath] = newContents[activeTab];
              delete newContents[activeTab];
            }
            return newContents;
          });
          setActiveTab(newPath);
        }
      }
    },
    saveAllFiles: () => {
      openTabs.forEach(tab => {
        if (tab.modified && tab.path) {
          handleSaveFile(tab.path);
        }
      });
    },
    revertFile: async () => {
      if (activeTab && !activeTab.startsWith('preview:')) {
        const result = await window.electronAPI?.ideReadFile(activeTab);
        if (result?.success) {
          setFileContents(prev => ({ ...prev, [activeTab]: result.content }));
          setOpenTabs(prev => prev.map(tab => 
            tab.id === activeTab ? { ...tab, modified: false } : tab
          ));
        }
      }
    },
    closeCurrentTab: handleCloseCurrentTab,
    closeFolder: () => {
      setWorkspaceFolder(null);
      setOpenTabs([]);
      setActiveTab(null);
      setFileContents({});
      setExplorerKey(prev => prev + 1);
    },
    editorAction,
    toggleWordWrap: () => {
      setWordWrap(prev => {
        const newValue = !prev;
        localStorage.setItem('ide-word-wrap', newValue.toString());
        return newValue;
      });
    },
    setTheme: (theme) => {
      setEditorTheme(theme);
      localStorage.setItem('ide-editor-theme', theme);
    },
    openTerminal: () => {
      setShowTerminal(true);
    },
    runActiveFile: async () => {
      if (!activeTab || !workspaceFolder) return;
      const tab = openTabs.find(t => t.id === activeTab);
      if (!tab?.path) return;
      
      // Determine how to run based on file extension
      const ext = tab.name.split('.').pop()?.toLowerCase();
      let command = '';
      
      if (ext === 'js' || ext === 'mjs') command = `node "${tab.path}"`;
      else if (ext === 'ts') command = `npx ts-node "${tab.path}"`;
      else if (ext === 'py') command = `python "${tab.path}"`;
      else if (ext === 'sh') command = `bash "${tab.path}"`;
      else if (ext === 'ps1') command = `powershell -File "${tab.path}"`;
      else {
        alert(`Don't know how to run .${ext} files`);
        return;
      }
      
      setShowTerminal(true);
      // Log to output
      const timestamp = new Date().toLocaleTimeString();
      setOutputLogs(prev => [...prev, { timestamp, message: `> Running: ${command}`, type: 'info' }]);
    },
    // Methods to add logs from external sources
    addOutputLog: (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      setOutputLogs(prev => [...prev, { timestamp, message, type }]);
    },
    addDebugLog: (message, type = 'log') => {
      setDebugLogs(prev => [...prev, { message, type }]);
    },
    addProblem: (problem) => {
      setProblems(prev => [...prev, problem]);
    },
    clearProblems: () => setProblems([]),
    clearOutput: () => setOutputLogs([]),
    clearDebug: () => setDebugLogs([])
  }), [activeTab, fileContents, openTabs, workspaceFolder, handleOpenFolder, handleSaveCurrentTab, handleCloseCurrentTab, handleSaveFile, editorAction]);

  // Note: Keyboard shortcuts are handled in App.jsx for global IDE shortcuts

  const handleNewFile = async () => {
    if (!workspaceFolder) {
      // Open folder first
      const result = await window.electronAPI?.ideSelectFolder();
      if (result?.success) {
        setWorkspaceFolder(result.folderPath);
      }
      return;
    }
    const fileName = prompt('File name:');
    if (fileName && fileName.trim()) {
      // Get selected folder path or use workspace root
      const selectedPath = fileExplorerRef.current?.getSelectedPath();
      let targetFolder = workspaceFolder;
      
      // If a folder is selected, create file there
      if (selectedPath) {
        // Check if selected path is a directory
        const stats = await window.electronAPI?.ideGetStats?.(selectedPath);
        if (stats?.isDirectory) {
          targetFolder = selectedPath;
        } else {
          // Get parent directory of selected file
          const separator = selectedPath.includes('\\') ? '\\' : '/';
          targetFolder = selectedPath.substring(0, selectedPath.lastIndexOf(separator));
        }
      }
      
      const separator = targetFolder.includes('\\') ? '\\' : '/';
      const filePath = `${targetFolder}${separator}${fileName.trim()}`;
      const result = await window.electronAPI?.ideCreateFile(filePath, '');
      if (result?.success) {
        // Refresh and open the new file
        setExplorerKey(prev => prev + 1);
        await handleFileOpen({ path: filePath, name: fileName.trim(), isDirectory: false });
      }
    }
  };

  const handleNewFolder = async () => {
    if (!workspaceFolder) {
      const result = await window.electronAPI?.ideSelectFolder();
      if (result?.success) {
        setWorkspaceFolder(result.folderPath);
      }
      return;
    }
    const folderName = prompt('Folder name:');
    if (folderName && folderName.trim()) {
      // Get selected folder path or use workspace root
      const selectedPath = fileExplorerRef.current?.getSelectedPath();
      let targetFolder = workspaceFolder;
      
      // If a folder is selected, create folder there
      if (selectedPath) {
        const stats = await window.electronAPI?.ideGetStats?.(selectedPath);
        if (stats?.isDirectory) {
          targetFolder = selectedPath;
        } else {
          const separator = selectedPath.includes('\\') ? '\\' : '/';
          targetFolder = selectedPath.substring(0, selectedPath.lastIndexOf(separator));
        }
      }
      
      const separator = targetFolder.includes('\\') ? '\\' : '/';
      const folderPath = `${targetFolder}${separator}${folderName.trim()}`;
      const result = await window.electronAPI?.ideCreateFolder(folderPath);
      if (result?.success) {
        setExplorerKey(prev => prev + 1);
      }
    }
  };

  // New file in specific folder (from context menu)
  const handleNewFileInFolder = async (folderPath) => {
    const targetFolder = folderPath || workspaceFolder;
    if (!targetFolder) return;
    
    const fileName = prompt('File name:');
    if (fileName && fileName.trim()) {
      const separator = targetFolder.includes('\\') ? '\\' : '/';
      const filePath = `${targetFolder}${separator}${fileName.trim()}`;
      const result = await window.electronAPI?.ideCreateFile(filePath, '');
      if (result?.success) {
        setExplorerKey(prev => prev + 1);
        await handleFileOpen({ path: filePath, name: fileName.trim(), isDirectory: false });
      }
    }
  };

  // New folder in specific folder (from context menu)
  const handleNewFolderInFolder = async (folderPath) => {
    const targetFolder = folderPath || workspaceFolder;
    if (!targetFolder) return;
    
    const folderName = prompt('Folder name:');
    if (folderName && folderName.trim()) {
      const separator = targetFolder.includes('\\') ? '\\' : '/';
      const newFolderPath = `${targetFolder}${separator}${folderName.trim()}`;
      const result = await window.electronAPI?.ideCreateFolder(newFolderPath);
      if (result?.success) {
        setExplorerKey(prev => prev + 1);
      }
    }
  };

  // Search in files - memoized
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !workspaceFolder) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setGroupedResults({});
    
    const result = await window.electronAPI?.ideSearchFiles(
      workspaceFolder, 
      searchQuery,
      searchOptions
    );
    
    if (result?.success) {
      setSearchResults(result.results);
      
      // Group results by file
      const grouped = {};
      result.results.forEach(r => {
        if (!grouped[r.file]) {
          grouped[r.file] = {
            fileName: r.fileName,
            relativePath: r.relativePath,
            matches: []
          };
        }
        grouped[r.file].matches.push(r);
      });
      setGroupedResults(grouped);
      
      // Expand first few files by default
      const filePaths = Object.keys(grouped).slice(0, 5);
      setExpandedFiles(new Set(filePaths));
    }
    setIsSearching(false);
  }, [searchQuery, workspaceFolder, searchOptions]);

  // Toggle file expansion in search results - memoized
  const toggleSearchFile = useCallback((filePath) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  }, []);

  // Open search result and highlight - memoized
  const handleSearchResultClick = useCallback(async (result) => {
    await handleFileOpen({ path: result.file, name: result.fileName, isDirectory: false });
    // Set highlight for the editor
    setEditorHighlight({ query: searchQuery, line: result.line });
  }, [searchQuery]);

  // Highlight search term in text using utility function - memoized
  const highlightMatch = useCallback((text, query) => {
    const parts = getHighlightParts(text, query);
    return parts.map((part, i) => 
      part.isMatch 
        ? <span key={i} style={{ background: '#613214', color: '#f8d7a4' }}>{part.text}</span>
        : part.text
    );
  }, []);
  // Resize handling
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      // Account for activity bar width (48px)
      const newWidth = e.clientX - 48;
      setSidePanelWidth(Math.max(180, Math.min(500, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Panel Header Button Component
  const HeaderButton = ({ icon: Icon, title, onClick }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent',
        border: 'none',
        color: '#888',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.color = '#ececec';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#888';
      }}
    >
      <Icon size={16} />
    </button>
  );

  // Panel Header Component
  const PanelHeader = ({ title, buttons = [] }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      <span style={{ 
        fontSize: '0.7rem', 
        color: '#888', 
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: '0.5px'
      }}>
        {title}
      </span>
      <div style={{ display: 'flex', gap: '2px' }}>
        {buttons.map((btn, idx) => (
          <HeaderButton key={idx} icon={btn.icon} title={btn.title} onClick={btn.onClick} />
        ))}
      </div>
    </div>
  );

  // Keyboard shortcut row component for welcome screen
  const ShortcutRow = ({ label, keys }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      width: '280px',
      padding: '4px 0'
    }}>
      <span style={{ color: '#888', fontSize: '0.85rem' }}>{label}</span>
      <div style={{ display: 'flex', gap: '4px' }}>
        {keys.map((key, i) => (
          <span 
            key={i}
            style={{
              background: '#2a2a2a',
              border: '1px solid #3a3a3a',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              color: '#888',
              fontFamily: 'system-ui'
            }}
          >
            {key}
          </span>
        ))}
      </div>
    </div>
  );

  const getPanelContent = () => {
    switch (activePanel) {
      case 'files':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <PanelHeader 
              title="Explorer" 
              buttons={[
                { icon: FilePlus, title: 'New File', onClick: () => {
                  fileExplorerRef.current?.startNewFile();
                }},
                { icon: FolderPlus, title: 'New Folder', onClick: () => {
                  fileExplorerRef.current?.startNewFolder();
                }},
                { icon: RefreshCw, title: 'Refresh', onClick: () => {
                  setExplorerKey(prev => prev + 1);
                  fileExplorerRef.current?.refresh();
                }},
                { icon: ChevronsDownUp, title: 'Collapse All', onClick: () => {
                  fileExplorerRef.current?.collapseAll();
                }},
              ]}
            />
            <FileExplorer 
              ref={fileExplorerRef}
              key={explorerKey}
              rootPath={workspaceFolder}
              onFileSelect={handleFileSelect}
              onFileOpen={handleFileOpen}
              onPreviewFile={handlePreviewFile}
              onRefresh={() => setExplorerKey(prev => prev + 1)}
            />
          </div>
        );
      case 'search':
        const totalResults = searchResults.length;
        const totalFiles = Object.keys(groupedResults).length;
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Search Header with VS Code style buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <span style={{ 
                fontSize: '0.7rem', 
                color: '#888', 
                textTransform: 'uppercase',
                fontWeight: '600',
                letterSpacing: '0.5px'
              }}>
                Search
              </span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {/* Refresh Search */}
                <button
                  onClick={() => searchQuery && handleSearch()}
                  title="Refresh"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#ececec'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}
                >
                  <RefreshCw size={14} />
                </button>
                {/* Clear Search */}
                <button
                  onClick={() => { setSearchResults([]); setGroupedResults({}); setSearchQuery(''); setReplaceQuery(''); }}
                  title="Clear Search Results"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#ececec'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}
                >
                  <X size={14} />
                </button>
                {/* Collapse All */}
                <button
                  onClick={() => setExpandedFiles(new Set())}
                  title="Collapse All"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#ececec'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}
                >
                  <ChevronsDownUp size={14} />
                </button>
                {/* Expand All */}
                <button
                  onClick={() => setExpandedFiles(new Set(Object.keys(groupedResults)))}
                  title="Expand All"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#ececec'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M9 9H4v1h5V9zM9 4v1H4V4h5zm0 3H4v1h5V7zm2-3v1h3V4h-3zm0 3v1h3V7h-3zm0 3v1h3v-1h-3z"/>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Search Input Area */}
            <div style={{ padding: '8px 12px' }}>
              {/* Search Field */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                background: '#3c3c3c',
                border: '1px solid #3c3c3c',
                borderRadius: '4px',
                marginBottom: '6px',
                minWidth: 0
              }}>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 8px',
                    color: '#ececec',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                {/* Search Options - flexShrink: 0 to prevent shrinking */}
                <div style={{ display: 'flex', gap: '1px', padding: '0 2px', flexShrink: 0 }}>
                  <button
                    onClick={() => setSearchOptions(prev => ({ ...prev, caseSensitive: !prev.caseSensitive }))}
                    title="Match Case (Alt+C)"
                    style={{
                      background: searchOptions.caseSensitive ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                      border: 'none',
                      color: searchOptions.caseSensitive ? '#ececec' : '#888',
                      cursor: 'pointer',
                      padding: '4px 5px',
                      borderRadius: '3px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      minWidth: '24px'
                    }}
                  >Aa</button>
                  <button
                    onClick={() => setSearchOptions(prev => ({ ...prev, wholeWord: !prev.wholeWord }))}
                    title="Match Whole Word (Alt+W)"
                    style={{
                      background: searchOptions.wholeWord ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                      border: 'none',
                      color: searchOptions.wholeWord ? '#ececec' : '#888',
                      cursor: 'pointer',
                      padding: '4px 5px',
                      borderRadius: '3px',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      minWidth: '24px'
                    }}
                  >ab</button>
                  <button
                    onClick={() => setSearchOptions(prev => ({ ...prev, useRegex: !prev.useRegex }))}
                    title="Use Regular Expression (Alt+R)"
                    style={{
                      background: searchOptions.useRegex ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                      border: 'none',
                      color: searchOptions.useRegex ? '#ececec' : '#888',
                      cursor: 'pointer',
                      padding: '4px 5px',
                      borderRadius: '3px',
                      fontSize: '0.65rem',
                      minWidth: '24px'
                    }}
                  >.*</button>
                </div>
              </div>
              
              {/* Replace Field */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                background: '#3c3c3c',
                border: '1px solid #3c3c3c',
                borderRadius: '4px',
                minWidth: 0
              }}>
                <input
                  type="text"
                  placeholder="Replace"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 8px',
                    color: '#ececec',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                {/* Replace Buttons */}
                <div style={{ display: 'flex', gap: '1px', padding: '0 2px', flexShrink: 0 }}>
                  <button
                    onClick={async () => {
                      // Replace in current selection/file
                      if (activeTab && searchQuery && replaceQuery !== undefined) {
                        const content = fileContents[activeTab];
                        if (content) {
                          let newContent;
                          if (searchOptions.useRegex) {
                            const flags = searchOptions.caseSensitive ? 'g' : 'gi';
                            newContent = content.replace(new RegExp(searchQuery, flags), replaceQuery);
                          } else {
                            const regex = new RegExp(
                              searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                              searchOptions.caseSensitive ? 'g' : 'gi'
                            );
                            newContent = content.replace(regex, replaceQuery);
                          }
                          handleCodeChange(activeTab, newContent);
                        }
                      }
                    }}
                    title="Replace (Ctrl+Shift+1)"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      padding: '4px 5px',
                      borderRadius: '3px',
                      fontSize: '0.7rem',
                      minWidth: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3.5 3h5v1h-5v-1zm0 3h5v1h-5v-1zm0 3h5v1h-5v-1zm8.5-5.5l-2 2 2 2 .7-.7-1.3-1.3 1.3-1.3-.7-.7z"/>
                    </svg>
                  </button>
                  <button
                    onClick={async () => {
                      // Replace all in workspace
                      if (searchQuery && replaceQuery !== undefined && searchResults.length > 0) {
                        const filesToUpdate = [...new Set(searchResults.map(r => r.file))];
                        for (const filePath of filesToUpdate) {
                          const content = fileContents[filePath];
                          if (content) {
                            let newContent;
                            if (searchOptions.useRegex) {
                              const flags = searchOptions.caseSensitive ? 'g' : 'gi';
                              newContent = content.replace(new RegExp(searchQuery, flags), replaceQuery);
                            } else {
                              const regex = new RegExp(
                                searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                                searchOptions.caseSensitive ? 'g' : 'gi'
                              );
                              newContent = content.replace(regex, replaceQuery);
                            }
                            handleCodeChange(filePath, newContent);
                          }
                        }
                        // Re-run search to update results
                        handleSearch();
                      }
                    }}
                    title="Replace All (Ctrl+Alt+Enter)"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      padding: '4px 5px',
                      borderRadius: '3px',
                      fontSize: '0.7rem',
                      minWidth: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M11.5 3.5l-2 2 2 2 .7-.7-1.3-1.3 1.3-1.3-.7-.7zM3.5 3h5v1h-5v-1zm0 3h5v1h-5v-1zm0 3h5v1h-5v-1zm0 3h9v1h-9v-1z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              {!workspaceFolder && (
                <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '8px' }}>Open a folder to search</p>
              )}
            </div>
            
            {/* Results Summary */}
            {totalResults > 0 && (
              <div style={{ 
                padding: '4px 12px', 
                fontSize: '0.75rem', 
                color: '#888',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                {totalResults} results in {totalFiles} files - 
                <span 
                  style={{ color: '#6366f1', cursor: 'pointer', marginLeft: '4px' }}
                  onClick={() => {/* TODO: Open in editor */}}
                >
                  Open in editor
                </span>
              </div>
            )}
            
            {/* Search Results - Grouped by File */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isSearching && (
                <div style={{ color: '#888', fontSize: '0.8rem', padding: '12px' }}>Searching...</div>
              )}
              
              {Object.entries(groupedResults).map(([filePath, fileData]) => {
                const isExpanded = expandedFiles.has(filePath);
                const matchCount = fileData.matches.length;
                
                return (
                  <div key={filePath}>
                    {/* File Header */}
                    <div
                      onClick={() => toggleSearchFile(filePath)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        background: 'transparent',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ color: '#888', marginRight: '4px', fontSize: '10px' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <FileIcon filename={fileData.fileName} size={16} />
                      <span style={{ 
                        marginLeft: '6px', 
                        color: '#ececec', 
                        fontSize: '0.8rem',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {fileData.fileName}
                      </span>
                      <span style={{ 
                        color: '#888', 
                        fontSize: '0.7rem',
                        marginLeft: '4px',
                        opacity: 0.7
                      }}>
                        {fileData.relativePath}
                      </span>
                      <span style={{
                        background: 'rgba(99, 102, 241, 0.3)',
                        color: '#ececec',
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        marginLeft: '8px'
                      }}>
                        {matchCount}
                      </span>
                    </div>
                    
                    {/* File Matches */}
                    {isExpanded && fileData.matches.map((match, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSearchResultClick(match)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          padding: '2px 8px 2px 32px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          lineHeight: '1.4',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ 
                          color: '#888', 
                          minWidth: '30px',
                          textAlign: 'right',
                          marginRight: '8px',
                          fontSize: '0.7rem'
                        }}>
                          {match.line}
                        </span>
                        <span style={{ 
                          color: '#d4d4d4',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {highlightMatch(match.content, searchQuery)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'git':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <PanelHeader 
              title="Source Control" 
              buttons={[
                { icon: RefreshCw, title: 'Refresh', onClick: () => workspaceFolder && checkGitStatus(workspaceFolder) },
              ]}
            />
            <div style={{ padding: '12px' }}>
              {!workspaceFolder ? (
                <p style={{ color: '#666', fontSize: '0.85rem' }}>Open a folder first</p>
              ) : !gitInfo.isRepo ? (
                <p style={{ color: '#666', fontSize: '0.85rem' }}>Not a Git repository</p>
              ) : (
                <div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '8px 10px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '6px',
                    marginBottom: '12px'
                  }}>
                    <span style={{ color: '#6366f1', fontSize: '0.8rem' }}>⎇</span>
                    <span style={{ color: '#ececec', fontSize: '0.85rem' }}>{gitInfo.branch}</span>
                  </div>
                  <p style={{ color: '#888', fontSize: '0.8rem' }}>
                    Git integration coming soon...
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 'debug':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <PanelHeader 
              title="Run and Debug" 
              buttons={[
                { icon: Play, title: 'Start Debugging', onClick: () => console.log('Start') },
                { icon: MoreHorizontal, title: 'More Actions', onClick: () => console.log('More') },
              ]}
            />
            <div style={{ padding: '12px', color: '#666', fontSize: '0.85rem' }}>
              No debug configuration
            </div>
          </div>
        );
      case 'extensions':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <PanelHeader 
              title="Extensions" 
              buttons={[
                { icon: RefreshCw, title: 'Refresh', onClick: () => console.log('Refresh') },
                { icon: MoreHorizontal, title: 'More Actions', onClick: () => console.log('More') },
              ]}
            />
            <ExtensionsPanel 
              currentTheme={editorTheme}
              onThemeChange={(theme) => {
                setEditorTheme(theme);
                localStorage.setItem('ide-editor-theme', theme);
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      background: theme.bg,
      height: '100%',
      overflow: 'hidden',
      transition: 'background 0.3s'
    }}>
      {/* Side Panel */}
      {isSidePanelVisible && (
      <div style={{
        width: `${sidePanelWidth}px`,
        background: theme.bgSecondary,
        borderRight: `1px solid ${theme.border}`,
        overflowY: 'auto',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.3s'
      }}>
        {getPanelContent()}
        
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            cursor: 'ew-resize',
            background: isResizing ? 'rgba(99, 102, 241, 0.5)' : 'transparent',
            transition: 'background 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            if (!isResizing) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
          }}
          onMouseLeave={(e) => {
            if (!isResizing) e.currentTarget.style.background = 'transparent';
          }}
        />
      </div>
      )}

      {/* Main Editor Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* Tab Bar */}
        <div style={{
          height: '35px',
          background: theme.bgSecondary,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'stretch',
          overflowX: 'auto'
        }}>
          {openTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isHovered = hoveredTab === tab.id;
            const isPreview = tab.type === 'preview';
            
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  padding: '0 12px',
                  background: isActive ? theme.bg : 'transparent',
                  borderTop: isActive ? '1px solid #6366f1' : '1px solid transparent',
                  borderRight: `1px solid ${theme.borderLight}`,
                  fontSize: '0.8rem',
                  color: isActive ? theme.text : theme.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  minWidth: 'fit-content',
                  position: 'relative'
                }}
              >
                {isPreview ? (
                  <Eye size={14} style={{ color: '#6366f1' }} />
                ) : (
                  <FileIcon filename={tab.filename} size={14} />
                )}
                <span style={{ whiteSpace: 'nowrap' }}>
                  {tab.modified ? '● ' : ''}{tab.name}
                </span>
                
                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px',
                    opacity: isHovered || isActive ? 1 : 0,
                    transition: 'opacity 0.15s, background 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#ececec';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#888';
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Editor Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          background: '#1e1e1e',
          overflow: 'hidden'
        }}>
          {openTabs.length === 0 || !activeTab ? (
            workspaceFolder ? (
              /* Project is open - show keyboard shortcuts */
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: '1rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  {/* Logo */}
                  <div style={{ marginBottom: '24px' }}>
                    <Code2 size={56} style={{ color: '#555', marginBottom: '12px' }} />
                    <h1 style={{ 
                      color: '#666', 
                      fontSize: '1.8rem', 
                      fontWeight: '300',
                      letterSpacing: '2px',
                      margin: 0
                    }}>
                      OpenMind
                    </h1>
                  </div>
                  
                  {/* Keyboard Shortcuts */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    alignItems: 'center'
                  }}>
                    <ShortcutRow label="New File" keys={['Ctrl', 'N']} />
                    <ShortcutRow label="Open File" keys={['Ctrl', 'O']} />
                    <ShortcutRow label="Save" keys={['Ctrl', 'S']} />
                    <ShortcutRow label="Close Tab" keys={['Ctrl', 'W']} />
                    <ShortcutRow label="Find in Files" keys={['Ctrl', 'Shift', 'F']} />
                    <ShortcutRow label="Toggle Sidebar" keys={['Ctrl', 'B']} />
                    <ShortcutRow label="Toggle Chat" keys={['Ctrl', 'Shift', 'C']} />
                  </div>
                </div>
              </div>
            ) : (
              /* No project open - show New Project / Open Folder */
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: '1rem',
                padding: '40px'
              }}>
                <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                  <div style={{ marginBottom: '40px' }}>
                    <Code2 size={56} style={{ color: '#555', marginBottom: '16px' }} />
                    <h2 style={{ color: '#ececec', marginBottom: '8px', fontWeight: '400', fontSize: '1.5rem' }}>
                      OpenMind IDE
                    </h2>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>
                      AI-powered code development with local Ollama models
                    </p>
                  </div>

                  {/* Start Actions */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <button
                      onClick={handleNewProject}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '14px 20px',
                        background: '#6366f1',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#5558e3'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#6366f1'}
                    >
                      <Plus size={18} />
                      New Project
                    </button>
                    <button
                      onClick={handleOpenFolder}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '14px 20px',
                        background: '#2f2f2f',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#ececec',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#3f3f3f'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#2f2f2f'}
                    >
                      <FolderOpen size={18} />
                      Open Folder
                    </button>
                  </div>

                  {/* Recent Projects */}
                  {recentProjects.length > 0 && (
                    <div style={{ textAlign: 'left' }}>
                      <h3 style={{ 
                        color: '#888', 
                        fontSize: '0.75rem', 
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        marginBottom: '12px',
                        letterSpacing: '0.5px'
                      }}>
                        Recent Projects
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {recentProjects.slice(0, 5).map((project) => (
                          <button
                            key={project.path}
                            onClick={() => handleOpenProject(project.path)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 12px',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#ececec',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Folder size={18} style={{ color: '#90a4ae', flexShrink: 0 }} />
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: '500' }}>{project.name}</div>
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#666',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {project.path}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : openTabs.find(t => t.id === activeTab)?.type === 'preview' ? (
            <MarkdownPreview
              content={fileContents[activeTab] || ''}
              filename={openTabs.find(t => t.id === activeTab)?.name || ''}
            />
          ) : (
            <CodeEditor
              ref={codeEditorRef}
              content={fileContents[activeTab] || ''}
              filename={openTabs.find(t => t.id === activeTab)?.name || ''}
              onChange={(newContent) => handleCodeChange(activeTab, newContent)}
              highlight={editorHighlight}
              onHighlightClear={() => setEditorHighlight(null)}
              wordWrap={wordWrap}
              theme={editorTheme}
              onMonacoDiagnostics={(diagnostics) => {
                const tab = openTabs.find(t => t.id === activeTab);
                if (tab) {
                  handleMonacoDiagnostics(activeTab, tab.name, diagnostics);
                }
              }}
              onCursorChange={setCursorPosition}
            />
          )}
        </div>
        
        {/* Terminal Panel */}
        <TerminalPanel
          isOpen={showTerminal}
          onClose={() => setShowTerminal(false)}
          workspaceFolder={workspaceFolder}
          onMaximize={() => setIsTerminalMaximized(!isTerminalMaximized)}
          isMaximized={isTerminalMaximized}
          problems={problems}
          outputLogs={outputLogs}
          debugLogs={debugLogs}
          forwardedPorts={forwardedPorts}
          onClearOutput={() => setOutputLogs([])}
          onClearDebug={() => setDebugLogs([])}
          onPortForward={() => {
            const port = prompt('Enter port number to forward:');
            if (port && !isNaN(port)) {
              setForwardedPorts(prev => [...prev, { 
                port: parseInt(port), 
                url: `http://localhost:${port}`,
                visibility: 'Private'
              }]);
            }
          }}
          onPortClose={(port) => setForwardedPorts(prev => prev.filter(p => p.port !== port))}
        />
      </div>

      {/* Unsaved Changes Warning */}
      {unsavedWarning && (
        <div style={{
          position: 'absolute',
          bottom: '32px',
          left: '60px',
          background: '#2f2f2f',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          maxWidth: '400px'
        }}>
          <div style={{ 
            color: '#ececec', 
            fontSize: '0.85rem', 
            marginBottom: '12px',
            lineHeight: '1.4'
          }}>
            <strong>"{unsavedWarning.tabName}"</strong> has unsaved changes. Do you want to save before closing?
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setUnsavedWarning(null)}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: '#888',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleForceCloseTab}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid rgba(255,107,107,0.5)',
                borderRadius: '4px',
                color: '#ff6b6b',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Don't Save
            </button>
            <button
              onClick={handleSaveAndCloseTab}
              style={{
                padding: '6px 12px',
                background: '#6366f1',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

IDEMode.displayName = 'IDEMode';

export default IDEMode;
