import { useState, useEffect, useCallback, useRef } from 'react';
import { Code2, X, FilePlus, FolderPlus, RefreshCw, ChevronsDownUp, MoreHorizontal, Play, File, FolderOpen, Plus, Folder, Eye } from 'lucide-react';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import MarkdownPreview from './MarkdownPreview';
import FileIcon from './FileIcon';
import { getHighlightParts } from '../utils/searchUtils';

const IDEMode = ({ activePanel, isSidePanelVisible = true }) => {
  const fileExplorerRef = useRef(null);
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
  }, []);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveCurrentTab();
      }
      // Ctrl+W to close tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        handleCloseCurrentTab();
      }
      // Ctrl+P for quick file search (future feature)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        // TODO: Quick file picker
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveCurrentTab, handleCloseCurrentTab]);

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
            <PanelHeader 
              title="Search" 
              buttons={[
                { icon: RefreshCw, title: 'Clear', onClick: () => { setSearchResults([]); setGroupedResults({}); setSearchQuery(''); } },
              ]}
            />
            
            {/* Search Input Area */}
            <div style={{ padding: '8px 12px' }}>
              {/* Search Field */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                background: '#3c3c3c',
                border: '1px solid #3c3c3c',
                borderRadius: '4px',
                marginBottom: '6px'
              }}>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 8px',
                    color: '#ececec',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                {/* Search Options */}
                <div style={{ display: 'flex', gap: '2px', padding: '0 4px' }}>
                  <button
                    onClick={() => setSearchOptions(prev => ({ ...prev, caseSensitive: !prev.caseSensitive }))}
                    title="Match Case"
                    style={{
                      background: searchOptions.caseSensitive ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                      border: 'none',
                      color: searchOptions.caseSensitive ? '#ececec' : '#888',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '3px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >Aa</button>
                  <button
                    onClick={() => setSearchOptions(prev => ({ ...prev, wholeWord: !prev.wholeWord }))}
                    title="Match Whole Word"
                    style={{
                      background: searchOptions.wholeWord ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                      border: 'none',
                      color: searchOptions.wholeWord ? '#ececec' : '#888',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '3px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      textDecoration: 'underline'
                    }}
                  >ab</button>
                  <button
                    onClick={() => setSearchOptions(prev => ({ ...prev, useRegex: !prev.useRegex }))}
                    title="Use Regular Expression"
                    style={{
                      background: searchOptions.useRegex ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                      border: 'none',
                      color: searchOptions.useRegex ? '#ececec' : '#888',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '3px',
                      fontSize: '0.7rem'
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
                borderRadius: '4px'
              }}>
                <input
                  type="text"
                  placeholder="Replace"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 8px',
                    color: '#ececec',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
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
            <div style={{ padding: '12px', color: '#666', fontSize: '0.85rem' }}>
              No extensions installed
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      background: '#151517',
      height: '100%'
    }}>
      {/* Side Panel */}
      {isSidePanelVisible && (
      <div style={{
        width: `${sidePanelWidth}px`,
        background: '#1b1b1c',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        overflowY: 'auto',
        position: 'relative',
        flexShrink: 0
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
          background: '#1b1b1c',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
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
                  background: isActive ? '#151517' : 'transparent',
                  borderTop: isActive ? '1px solid #6366f1' : '1px solid transparent',
                  borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '0.8rem',
                  color: isActive ? '#ececec' : '#888',
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
              content={fileContents[activeTab] || ''}
              filename={openTabs.find(t => t.id === activeTab)?.name || ''}
              onChange={(newContent) => handleCodeChange(activeTab, newContent)}
              highlight={editorHighlight}
              onHighlightClear={() => setEditorHighlight(null)}
            />
          )}
        </div>
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
};

export default IDEMode;
