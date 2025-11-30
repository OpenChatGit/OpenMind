import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { ChevronRight, ChevronDown, Eye, Trash2, Pencil, Copy, FilePlus, FolderPlus, ExternalLink } from 'lucide-react';
import FileIcon from './FileIcon';
import { useTheme } from '../contexts/ThemeContext';

const FileExplorer = forwardRef(({ rootPath, onFileSelect, onFileOpen, onPreviewFile, onRefresh }, ref) => {
  const { theme, isDark } = useTheme();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [folderContents, setFolderContents] = useState({});
  const [selectedPath, setSelectedPath] = useState(null);
  const [rootItems, setRootItems] = useState([]);
  const [rootName, setRootName] = useState('');
  const [contextMenu, setContextMenu] = useState(null); // { x, y, item, isBackground }
  const [inlineCreate, setInlineCreate] = useState(null); // { parentPath, type: 'file' | 'folder' }
  const [inlineRename, setInlineRename] = useState(null); // { path, name }
  const [inlineValue, setInlineValue] = useState('');
  const contextMenuRef = useRef(null);
  const inlineInputRef = useRef(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    collapseAll: () => {
      // Keep only root expanded
      setExpandedFolders(new Set([rootPath]));
    },
    expandAll: () => {
      // Expand all loaded folders
      const allFolders = new Set(Object.keys(folderContents));
      allFolders.add(rootPath);
      setExpandedFolders(allFolders);
    },
    refresh: () => {
      if (rootPath) {
        loadDirectory(rootPath, true);
      }
    },
    getSelectedPath: () => selectedPath,
    startNewFile: () => {
      if (rootPath) {
        // Use selected folder or root
        const targetPath = selectedPath && folderContents[selectedPath] !== undefined 
          ? selectedPath 
          : rootPath;
        setExpandedFolders(prev => new Set([...prev, targetPath]));
        setInlineCreate({ parentPath: targetPath, type: 'file' });
        setInlineValue('');
      }
    },
    startNewFolder: () => {
      if (rootPath) {
        const targetPath = selectedPath && folderContents[selectedPath] !== undefined 
          ? selectedPath 
          : rootPath;
        setExpandedFolders(prev => new Set([...prev, targetPath]));
        setInlineCreate({ parentPath: targetPath, type: 'folder' });
        setInlineValue('');
      }
    }
  }));

  // Memoize loadDirectory to prevent recreation
  const loadDirectory = useCallback(async (dirPath, isRoot = false) => {
    if (window.electronAPI?.ideReadDirectory) {
      const result = await window.electronAPI.ideReadDirectory(dirPath);
      if (result.success) {
        if (isRoot) {
          setRootItems(result.items);
        }
        setFolderContents(prev => ({ ...prev, [dirPath]: result.items }));
      }
    }
  }, []);

  // Load root directory - only when rootPath changes
  useEffect(() => {
    if (rootPath) {
      loadDirectory(rootPath, true);
      setRootName(rootPath.split(/[/\\]/).pop());
      setExpandedFolders(new Set([rootPath]));
    }
  }, [rootPath, loadDirectory]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFolder = useCallback(async (folderPath) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderPath)) {
        newExpanded.delete(folderPath);
      } else {
        newExpanded.add(folderPath);
        // Load directory if not already loaded
        if (!folderContents[folderPath]) {
          loadDirectory(folderPath);
        }
      }
      return newExpanded;
    });
  }, [folderContents, loadDirectory]);

  const handleItemClick = (item) => {
    setSelectedPath(item.path);
    if (onFileSelect) onFileSelect(item);
    if (!item.isDirectory && onFileOpen) onFileOpen(item);
  };

  const handleItemDoubleClick = (item) => {
    if (item.isDirectory) {
      toggleFolder(item.path);
    } else if (onFileOpen) {
      onFileOpen(item);
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent background context menu
    setContextMenu({ x: e.clientX, y: e.clientY, item, isBackground: false });
  };

  const isMarkdownFile = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    return ext === 'md' || ext === 'mdx';
  };

  const handleDelete = async (item) => {
    if (confirm(`Delete "${item.name}"?`)) {
      await window.electronAPI?.ideDeleteFile(item.path);
      onRefresh?.();
    }
    setContextMenu(null);
  };

  const handleRename = (item) => {
    setInlineRename({ path: item.path, name: item.name, isDirectory: item.isDirectory });
    setInlineValue(item.name);
    setContextMenu(null);
  };

  // Start inline create for new file/folder
  const startInlineCreate = (parentPath, type) => {
    // Expand the parent folder
    setExpandedFolders(prev => new Set([...prev, parentPath]));
    setInlineCreate({ parentPath, type });
    setInlineValue('');
    setContextMenu(null);
  };

  // Handle inline input submit
  const handleInlineSubmit = async () => {
    if (!inlineValue.trim()) {
      setInlineCreate(null);
      setInlineRename(null);
      return;
    }

    if (inlineCreate) {
      // Creating new file/folder
      const separator = inlineCreate.parentPath.includes('\\') ? '\\' : '/';
      const newPath = `${inlineCreate.parentPath}${separator}${inlineValue.trim()}`;
      
      if (inlineCreate.type === 'file') {
        const result = await window.electronAPI?.ideCreateFile(newPath, '');
        if (result?.success) {
          onRefresh?.();
          // Open the new file
          onFileOpen?.({ path: newPath, name: inlineValue.trim(), isDirectory: false });
        }
      } else {
        const result = await window.electronAPI?.ideCreateFolder(newPath);
        if (result?.success) {
          onRefresh?.();
        }
      }
      setInlineCreate(null);
    } else if (inlineRename) {
      // Renaming existing file/folder
      if (inlineValue.trim() !== inlineRename.name) {
        const separator = inlineRename.path.includes('\\') ? '\\' : '/';
        const pathParts = inlineRename.path.split(/[/\\]/);
        pathParts.pop();
        const newPath = [...pathParts, inlineValue.trim()].join(separator);
        await window.electronAPI?.ideRenameFile(inlineRename.path, newPath);
        onRefresh?.();
      }
      setInlineRename(null);
    }
    setInlineValue('');
  };

  // Handle inline input cancel
  const handleInlineCancel = () => {
    setInlineCreate(null);
    setInlineRename(null);
    setInlineValue('');
  };

  // Focus input when inline create/rename starts
  useEffect(() => {
    if ((inlineCreate || inlineRename) && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [inlineCreate, inlineRename]);

  const ContextMenuItem = ({ icon: Icon, label, onClick, danger }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '6px 12px',
        background: 'transparent',
        border: 'none',
        color: danger ? '#ff6b6b' : '#ececec',
        fontSize: '0.8rem',
        cursor: 'pointer',
        textAlign: 'left'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = danger ? 'rgba(255,107,107,0.1)' : 'rgba(255,255,255,0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  const renderItem = (item, depth = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const isSelected = selectedPath === item.path;
    const paddingLeft = 12 + depth * 16;

    if (item.isDirectory) {
      const children = folderContents[item.path] || [];

      return (
        <div key={item.path}>
          <div
            onClick={() => handleItemClick(item)}
            onDoubleClick={() => handleItemDoubleClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '3px 8px',
              paddingLeft: `${paddingLeft}px`,
              cursor: 'pointer',
              background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: theme.text,
              fontSize: '0.82rem',
              userSelect: 'none',
              transition: 'background 0.1s'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span 
              onClick={(e) => { e.stopPropagation(); toggleFolder(item.path); }}
              style={{ display: 'flex', alignItems: 'center', marginRight: '4px', color: '#888' }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            {/* Inline rename for folder */}
            {inlineRename?.path === item.path ? (
              <input
                ref={inlineInputRef}
                type="text"
                value={inlineValue}
                onChange={(e) => setInlineValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineSubmit();
                  if (e.key === 'Escape') handleInlineCancel();
                }}
                onBlur={handleInlineSubmit}
                style={{
                  flex: 1,
                  background: '#3c3c3c',
                  border: '1px solid #007acc',
                  borderRadius: '2px',
                  padding: '1px 4px',
                  color: theme.text,
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            ) : (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
            )}
          </div>
          {/* Inline create input for new items in this folder */}
          {isExpanded && inlineCreate?.parentPath === item.path && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '3px 8px',
              paddingLeft: `${paddingLeft + 18}px`
            }}>
              {inlineCreate.type === 'file' && (
                <span style={{ marginRight: '6px' }}>
                  <FileIcon filename={inlineValue || 'newfile'} size={18} />
                </span>
              )}
              <input
                ref={inlineInputRef}
                type="text"
                value={inlineValue}
                onChange={(e) => setInlineValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineSubmit();
                  if (e.key === 'Escape') handleInlineCancel();
                }}
                onBlur={handleInlineSubmit}
                placeholder={inlineCreate.type === 'folder' ? 'Folder name' : 'File name'}
                style={{
                  flex: 1,
                  background: '#3c3c3c',
                  border: '1px solid #007acc',
                  borderRadius: '2px',
                  padding: '1px 4px',
                  color: theme.text,
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          )}
          {isExpanded && children.map(child => renderItem(child, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={item.path}
        onClick={() => handleItemClick(item)}
        onDoubleClick={() => handleItemDoubleClick(item)}
        onContextMenu={(e) => handleContextMenu(e, item)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '3px 8px',
          paddingLeft: `${paddingLeft}px`,
          cursor: 'pointer',
          background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
          color: theme.text,
          fontSize: '0.82rem',
          userSelect: 'none',
          transition: 'background 0.1s'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ marginRight: '6px', display: 'flex', alignItems: 'center' }}>
          <FileIcon filename={item.name} size={18} />
        </span>
        {/* Inline rename for file */}
        {inlineRename?.path === item.path ? (
          <input
            ref={inlineInputRef}
            type="text"
            value={inlineValue}
            onChange={(e) => setInlineValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSubmit();
              if (e.key === 'Escape') handleInlineCancel();
            }}
            onBlur={handleInlineSubmit}
            style={{
              flex: 1,
              background: '#3c3c3c',
              border: '1px solid #007acc',
              borderRadius: '2px',
              padding: '1px 4px',
              color: theme.text,
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
        ) : (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </span>
        )}
      </div>
    );
  };

  if (!rootPath) {
    return (
      <div style={{ padding: '20px 12px', color: '#666', fontSize: '0.85rem', textAlign: 'center' }}>
        <p style={{ marginBottom: '12px' }}>No folder opened</p>
        <button
          onClick={async () => {
            const result = await window.electronAPI?.ideSelectFolder();
            if (result?.success && onFileSelect) {
              onFileSelect({ path: result.folderPath, isDirectory: true, isRoot: true });
            }
          }}
          style={{
            background: '#6366f1',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            color: 'white',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          Open Folder
        </button>
      </div>
    );
  }

  // Handle background right-click (empty area)
  const handleBackgroundContextMenu = (e) => {
    // Only trigger if clicking directly on the container, not on items
    if (e.target === e.currentTarget) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, item: null, isBackground: true });
    }
  };

  return (
    <div 
      style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}
      onContextMenu={handleBackgroundContextMenu}
    >
      {/* Root folder */}
      <div
        onClick={() => handleItemClick({ path: rootPath, isDirectory: true, name: rootName })}
        onDoubleClick={() => toggleFolder(rootPath)}
        onContextMenu={(e) => handleContextMenu(e, { path: rootPath, isDirectory: true, name: rootName })}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          paddingLeft: '12px',
          cursor: 'pointer',
          background: selectedPath === rootPath ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
          color: theme.text,
          fontSize: '0.82rem',
          fontWeight: '600',
          userSelect: 'none'
        }}
      >
        <span 
          onClick={(e) => { e.stopPropagation(); toggleFolder(rootPath); }}
          style={{ display: 'flex', alignItems: 'center', marginRight: '4px', color: '#888' }}
        >
          {expandedFolders.has(rootPath) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{rootName}</span>
      </div>
      
      {/* Inline create at root level */}
      {expandedFolders.has(rootPath) && inlineCreate?.parentPath === rootPath && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '3px 8px',
          paddingLeft: '30px'
        }}>
          {inlineCreate.type === 'file' && (
            <span style={{ marginRight: '6px' }}>
              <FileIcon filename={inlineValue || 'newfile'} size={18} />
            </span>
          )}
          <input
            ref={inlineInputRef}
            type="text"
            value={inlineValue}
            onChange={(e) => setInlineValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSubmit();
              if (e.key === 'Escape') handleInlineCancel();
            }}
            onBlur={handleInlineSubmit}
            placeholder={inlineCreate.type === 'folder' ? 'Folder name' : 'File name'}
            style={{
              flex: 1,
              background: '#3c3c3c',
              border: '1px solid #007acc',
              borderRadius: '2px',
              padding: '1px 4px',
              color: theme.text,
              fontSize: '0.82rem',
              outline: 'none',
              maxWidth: '200px'
            }}
          />
        </div>
      )}
      
      {expandedFolders.has(rootPath) && rootItems.map(item => renderItem(item, 0))}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#2f2f2f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '4px 0',
            minWidth: '180px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: 1000
          }}
        >
          {/* New File/Folder - show for background click OR folder click */}
          {(contextMenu.isBackground || contextMenu.item?.isDirectory) && (
            <>
              <ContextMenuItem 
                icon={FilePlus} 
                label="New File" 
                onClick={() => { 
                  const targetPath = contextMenu.isBackground ? rootPath : contextMenu.item.path;
                  startInlineCreate(targetPath, 'file');
                }} 
              />
              <ContextMenuItem 
                icon={FolderPlus} 
                label="New Folder" 
                onClick={() => { 
                  const targetPath = contextMenu.isBackground ? rootPath : contextMenu.item.path;
                  startInlineCreate(targetPath, 'folder');
                }} 
              />
              {!contextMenu.isBackground && (
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
              )}
            </>
          )}
          
          {/* Item-specific options (not for background) */}
          {!contextMenu.isBackground && (
            <>
              {/* Markdown Preview */}
              {!contextMenu.item.isDirectory && isMarkdownFile(contextMenu.item.name) && (
                <>
                  <ContextMenuItem 
                    icon={Eye} 
                    label="Open Preview" 
                    onClick={() => { onPreviewFile?.(contextMenu.item); setContextMenu(null); }} 
                  />
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                </>
              )}
              
              {/* Edit actions */}
              <ContextMenuItem 
                icon={Pencil} 
                label="Rename" 
                onClick={() => handleRename(contextMenu.item)} 
              />
              <ContextMenuItem 
                icon={Copy} 
                label="Copy Path" 
                onClick={() => { navigator.clipboard.writeText(contextMenu.item.path); setContextMenu(null); }} 
              />
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
              
              {/* Reveal in File Explorer */}
              <ContextMenuItem 
                icon={ExternalLink} 
                label="Reveal in File Explorer" 
                onClick={() => { 
                  window.electronAPI?.revealInExplorer?.(contextMenu.item.path);
                  setContextMenu(null); 
                }} 
              />
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
              
              {/* Delete */}
              <ContextMenuItem 
                icon={Trash2} 
                label="Delete" 
                onClick={() => handleDelete(contextMenu.item)} 
                danger 
              />
            </>
          )}
        </div>
      )}
    </div>
  );
});

FileExplorer.displayName = 'FileExplorer';

export default FileExplorer;
