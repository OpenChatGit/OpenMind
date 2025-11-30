import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Minus, Square, X, PanelRight, ChevronRight } from 'lucide-react';
import DonationButton from './DonationButton';
import { useTheme } from '../contexts/ThemeContext';

const TitleBar = ({ isIDEMode, showIDEChat, onToggleIDEChat, onIDEAction }) => {
    const { theme, isDark } = useTheme();
    const [isMaximized, setIsMaximized] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const menuRef = useRef(null);

    const handleMinimize = () => {
        window.electronAPI?.minimize();
    };

    const handleMaximize = () => {
        window.electronAPI?.maximize();
        setIsMaximized(!isMaximized);
    };

    const handleClose = () => {
        window.electronAPI?.close();
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle menu item click
    const handleMenuAction = useCallback((action) => {
        setActiveMenu(null);
        if (onIDEAction) {
            onIDEAction(action);
        }
    }, [onIDEAction]);

    // Menu Item Component
    const MenuItem = ({ label, shortcut, onClick, disabled, hasSubmenu }) => (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '6px 24px 6px 12px',
                background: 'transparent',
                border: 'none',
                color: disabled ? theme.textMuted : theme.text,
                fontSize: '0.8rem',
                cursor: disabled ? 'default' : 'pointer',
                textAlign: 'left',
                whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
            }}
        >
            <span>{label}</span>
            <span style={{ color: theme.textSecondary, fontSize: '0.75rem', marginLeft: '24px' }}>
                {hasSubmenu ? <ChevronRight size={12} /> : shortcut}
            </span>
        </button>
    );

    // Menu Separator
    const MenuSeparator = () => (
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
    );

    return (
        <div style={{
            height: '32px',
            background: theme.bgSecondary,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            WebkitAppRegion: 'drag',
            paddingLeft: isIDEMode ? '0' : '16px',
            userSelect: 'none',
            borderBottom: `1px solid ${theme.border}`,
            transition: 'background 0.3s'
        }}>
            {/* Menu Bar (IDE Mode) or Title */}
            <div style={{
                fontSize: '12px',
                color: theme.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: '0px',
                height: '100%'
            }} ref={menuRef}>
                {isIDEMode ? (
                    <>
                        {/* App Title - Left */}
                        <div style={{ 
                            padding: '0 12px', 
                            color: theme.text, 
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            height: '100%'
                        }}>
                            OpenMind
                        </div>

                        {/* File Menu */}
                        <div style={{ position: 'relative', height: '100%' }}>
                            <button
                                onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                                style={{
                                    ...menuButtonStyle,
                                    background: activeMenu === 'file' ? 'rgba(255,255,255,0.1)' : 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeMenu && activeMenu !== 'file') setActiveMenu('file');
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeMenu !== 'file') e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                File
                            </button>
                            
                            {activeMenu === 'file' && (
                                <div style={dropdownStyle}>
                                    <MenuItem label="New Text File" shortcut="Ctrl+N" onClick={() => handleMenuAction('newFile')} />
                                    <MenuItem label="New File..." shortcut="Ctrl+Alt+Win+N" onClick={() => handleMenuAction('newFileAdvanced')} />
                                    
                                    <MenuSeparator />
                                    
                                    <MenuItem label="Open File..." shortcut="Ctrl+O" onClick={() => handleMenuAction('openFile')} />
                                    <MenuItem label="Open Folder..." shortcut="Ctrl+K Ctrl+O" onClick={() => handleMenuAction('openFolder')} />
                                    <MenuItem label="Open Recent" hasSubmenu onClick={() => handleMenuAction('openRecent')} disabled />
                                    
                                    <MenuSeparator />
                                    
                                    <MenuItem label="Save" shortcut="Ctrl+S" onClick={() => handleMenuAction('save')} />
                                    <MenuItem label="Save As..." shortcut="Ctrl+Shift+S" onClick={() => handleMenuAction('saveAs')} />
                                    <MenuItem label="Save All" shortcut="Ctrl+K S" onClick={() => handleMenuAction('saveAll')} />
                                    
                                    <MenuSeparator />
                                    
                                    <MenuItem label="Auto Save" onClick={() => handleMenuAction('autoSave')} disabled />
                                    <MenuItem label="Preferences" hasSubmenu onClick={() => handleMenuAction('preferences')} disabled />
                                    
                                    <MenuSeparator />
                                    
                                    <MenuItem label="Revert File" onClick={() => handleMenuAction('revertFile')} />
                                    <MenuItem label="Close Editor" shortcut="Ctrl+F4" onClick={() => handleMenuAction('closeEditor')} />
                                    <MenuItem label="Close Folder" shortcut="Ctrl+K F" onClick={() => handleMenuAction('closeFolder')} />
                                    
                                    <MenuSeparator />
                                    
                                    <MenuItem label="Exit" onClick={() => handleMenuAction('exit')} />
                                </div>
                            )}
                        </div>

                        {/* Edit Menu */}
                        <div style={{ position: 'relative', height: '100%' }}>
                            <button
                                onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                                style={{
                                    ...menuButtonStyle,
                                    background: activeMenu === 'edit' ? 'rgba(255,255,255,0.1)' : 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeMenu && activeMenu !== 'edit') setActiveMenu('edit');
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeMenu !== 'edit') e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                Edit
                            </button>
                            
                            {activeMenu === 'edit' && (
                                <div style={dropdownStyle}>
                                    <MenuItem label="Undo" shortcut="Ctrl+Z" onClick={() => handleMenuAction('undo')} />
                                    <MenuItem label="Redo" shortcut="Ctrl+Y" onClick={() => handleMenuAction('redo')} />
                                    <MenuSeparator />
                                    <MenuItem label="Cut" shortcut="Ctrl+X" onClick={() => handleMenuAction('cut')} />
                                    <MenuItem label="Copy" shortcut="Ctrl+C" onClick={() => handleMenuAction('copy')} />
                                    <MenuItem label="Paste" shortcut="Ctrl+V" onClick={() => handleMenuAction('paste')} />
                                    <MenuSeparator />
                                    <MenuItem label="Find" shortcut="Ctrl+F" onClick={() => handleMenuAction('find')} disabled />
                                    <MenuItem label="Replace" shortcut="Ctrl+H" onClick={() => handleMenuAction('replace')} disabled />
                                    <MenuSeparator />
                                    <MenuItem label="Find in Files" shortcut="Ctrl+Shift+F" onClick={() => handleMenuAction('findInFiles')} />
                                    <MenuItem label="Replace in Files" shortcut="Ctrl+Shift+H" onClick={() => handleMenuAction('replaceInFiles')} disabled />
                                    <MenuSeparator />
                                    <MenuItem label="Toggle Line Comment" shortcut="Ctrl+/" onClick={() => handleMenuAction('toggleLineComment')} />
                                    <MenuItem label="Toggle Block Comment" shortcut="Shift+Alt+A" onClick={() => handleMenuAction('toggleBlockComment')} />
                                    <MenuItem label="Emmet: Expand Abbreviation" shortcut="Tab" onClick={() => handleMenuAction('emmetExpand')} disabled />
                                </div>
                            )}
                        </div>

                        {/* Selection Menu */}
                        <div style={{ position: 'relative', height: '100%' }}>
                            <button
                                onClick={() => setActiveMenu(activeMenu === 'selection' ? null : 'selection')}
                                style={{
                                    ...menuButtonStyle,
                                    background: activeMenu === 'selection' ? 'rgba(255,255,255,0.1)' : 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeMenu && activeMenu !== 'selection') setActiveMenu('selection');
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeMenu !== 'selection') e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                Selection
                            </button>
                            
                            {activeMenu === 'selection' && (
                                <div style={dropdownStyle}>
                                    <MenuItem label="Select All" shortcut="Ctrl+A" onClick={() => handleMenuAction('selectAll')} />
                                    <MenuItem label="Expand Selection" shortcut="Shift+Alt+→" onClick={() => handleMenuAction('expandSelection')} disabled />
                                    <MenuItem label="Shrink Selection" shortcut="Shift+Alt+←" onClick={() => handleMenuAction('shrinkSelection')} disabled />
                                    <MenuSeparator />
                                    <MenuItem label="Copy Line Up" shortcut="Shift+Alt+↑" onClick={() => handleMenuAction('copyLineUp')} />
                                    <MenuItem label="Copy Line Down" shortcut="Shift+Alt+↓" onClick={() => handleMenuAction('copyLineDown')} />
                                    <MenuItem label="Move Line Up" shortcut="Alt+↑" onClick={() => handleMenuAction('moveLineUp')} />
                                    <MenuItem label="Move Line Down" shortcut="Alt+↓" onClick={() => handleMenuAction('moveLineDown')} />
                                    <MenuItem label="Duplicate Selection" onClick={() => handleMenuAction('duplicateSelection')} />
                                    <MenuSeparator />
                                    <MenuItem label="Add Cursor Above" shortcut="Ctrl+Alt+↑" onClick={() => handleMenuAction('addCursorAbove')} disabled />
                                    <MenuItem label="Add Cursor Below" shortcut="Ctrl+Alt+↓" onClick={() => handleMenuAction('addCursorBelow')} disabled />
                                    <MenuItem label="Add Cursors to Line Ends" shortcut="Shift+Alt+I" onClick={() => handleMenuAction('addCursorsToLineEnds')} disabled />
                                    <MenuItem label="Add Next Occurrence" shortcut="Ctrl+D" onClick={() => handleMenuAction('addNextOccurrence')} disabled />
                                    <MenuItem label="Add Previous Occurrence" onClick={() => handleMenuAction('addPreviousOccurrence')} disabled />
                                    <MenuItem label="Select All Occurrences" onClick={() => handleMenuAction('selectAllOccurrences')} disabled />
                                    <MenuSeparator />
                                    <MenuItem label="Switch to Ctrl+Click for Multi-Cursor" onClick={() => handleMenuAction('switchMultiCursor')} disabled />
                                    <MenuItem label="Column Selection Mode" onClick={() => handleMenuAction('columnSelectionMode')} disabled />
                                </div>
                            )}
                        </div>

                        {/* View Menu */}
                        <div style={{ position: 'relative', height: '100%' }}>
                            <button
                                onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
                                style={{
                                    ...menuButtonStyle,
                                    background: activeMenu === 'view' ? 'rgba(255,255,255,0.1)' : 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeMenu && activeMenu !== 'view') setActiveMenu('view');
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeMenu !== 'view') e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                View
                            </button>
                            
                            {activeMenu === 'view' && (
                                <div style={dropdownStyle}>
                                    <MenuItem label="Command Palette..." shortcut="Ctrl+Shift+P" onClick={() => handleMenuAction('commandPalette')} disabled />
                                    <MenuItem label="Open View..." onClick={() => handleMenuAction('openView')} disabled />
                                    <MenuSeparator />
                                    <MenuItem label="Appearance" hasSubmenu onClick={() => handleMenuAction('appearance')} disabled />
                                    <MenuItem label="Editor Layout" hasSubmenu onClick={() => handleMenuAction('editorLayout')} disabled />
                                    <MenuSeparator />
                                    <MenuItem label="Explorer" shortcut="Ctrl+Shift+E" onClick={() => handleMenuAction('viewExplorer')} />
                                    <MenuItem label="Search" shortcut="Ctrl+Shift+F" onClick={() => handleMenuAction('viewSearch')} />
                                    <MenuItem label="Source Control" shortcut="Ctrl+Shift+G" onClick={() => handleMenuAction('viewGit')} />
                                    <MenuItem label="Run" shortcut="Ctrl+Shift+D" onClick={() => handleMenuAction('viewRun')} />
                                    <MenuItem label="Extensions" shortcut="Ctrl+Shift+X" onClick={() => handleMenuAction('viewExtensions')} />
                                    <MenuSeparator />
                                    <MenuItem label="Problems" shortcut="Ctrl+Shift+M" onClick={() => handleMenuAction('viewProblems')} disabled />
                                    <MenuItem label="Output" shortcut="Ctrl+Shift+U" onClick={() => handleMenuAction('viewOutput')} disabled />
                                    <MenuItem label="Debug Console" shortcut="Ctrl+Shift+Y" onClick={() => handleMenuAction('viewDebugConsole')} disabled />
                                    <MenuItem label="Terminal" shortcut="Ctrl+ö" onClick={() => handleMenuAction('viewTerminal')} />
                                    <MenuSeparator />
                                    <MenuItem label="Word Wrap" shortcut="Alt+Z" onClick={() => handleMenuAction('toggleWordWrap')} />
                                </div>
                            )}
                        </div>

                        {/* Go Menu */}
                        <div style={{ position: 'relative', height: '100%' }}>
                            <button
                                onClick={() => setActiveMenu(activeMenu === 'go' ? null : 'go')}
                                style={{
                                    ...menuButtonStyle,
                                    background: activeMenu === 'go' ? 'rgba(255,255,255,0.1)' : 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeMenu && activeMenu !== 'go') setActiveMenu('go');
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeMenu !== 'go') e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                Go
                            </button>
                            
                            {activeMenu === 'go' && (
                                <div style={dropdownStyle}>
                                    <MenuItem label="Go to File..." shortcut="Ctrl+P" onClick={() => handleMenuAction('goToFile')} disabled />
                                    <MenuItem label="Go to Line..." shortcut="Ctrl+G" onClick={() => handleMenuAction('goToLine')} disabled />
                                </div>
                            )}
                        </div>

                        {/* Terminal Menu */}
                        <div style={{ position: 'relative', height: '100%' }}>
                            <button
                                onClick={() => setActiveMenu(activeMenu === 'terminal' ? null : 'terminal')}
                                style={{
                                    ...menuButtonStyle,
                                    background: activeMenu === 'terminal' ? 'rgba(255,255,255,0.1)' : 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeMenu && activeMenu !== 'terminal') setActiveMenu('terminal');
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeMenu !== 'terminal') e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                Terminal
                            </button>
                            
                            {activeMenu === 'terminal' && (
                                <div style={dropdownStyle}>
                                    <MenuItem label="New Terminal" shortcut="Ctrl+Shift+ö" onClick={() => handleMenuAction('newTerminal')} />
                                    <MenuItem label="Split Terminal" shortcut="Ctrl+Shift+5" onClick={() => handleMenuAction('splitTerminal')} disabled />
                                    
                                    <MenuSeparator />
                                    
                                    <MenuItem label="Run Task..." onClick={() => handleMenuAction('runTask')} disabled />
                                    <MenuItem label="Run Build Task..." shortcut="Ctrl+Shift+B" onClick={() => handleMenuAction('runBuildTask')} disabled />
                                    <MenuItem label="Run Active File" onClick={() => handleMenuAction('runActiveFile')} />
                                    <MenuItem label="Run Selected Text" onClick={() => handleMenuAction('runSelectedText')} disabled />
                                    
                                    <MenuSeparator />
                                    
                                    <MenuItem label="Show Running Tasks..." onClick={() => handleMenuAction('showRunningTasks')} disabled />
                                    <MenuItem label="Restart Running Task..." onClick={() => handleMenuAction('restartRunningTask')} disabled />
                                    <MenuItem label="Terminate Task..." onClick={() => handleMenuAction('terminateTask')} disabled />
                                    
                                    <MenuSeparator />
                                    
                                    <MenuItem label="Configure Tasks..." onClick={() => handleMenuAction('configureTasks')} disabled />
                                    <MenuItem label="Configure Default Build Task..." onClick={() => handleMenuAction('configureDefaultBuildTask')} disabled />
                                </div>
                            )}
                        </div>

                        {/* Help Menu */}
                        <div style={{ position: 'relative', height: '100%' }}>
                            <button
                                onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
                                style={{
                                    ...menuButtonStyle,
                                    background: activeMenu === 'help' ? 'rgba(255,255,255,0.1)' : 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeMenu && activeMenu !== 'help') setActiveMenu('help');
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (activeMenu !== 'help') e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                Help
                            </button>
                            
                            {activeMenu === 'help' && (
                                <div style={dropdownStyle}>
                                    <MenuItem label="About" onClick={() => handleMenuAction('about')} />
                                    <MenuItem label="Keyboard Shortcuts" shortcut="Ctrl+K Ctrl+S" onClick={() => handleMenuAction('shortcuts')} disabled />
                                </div>
                            )}
                        </div>


                    </>
                ) : (
                    <span style={{ fontWeight: 600, color: '#ececec' }}>OpenMind</span>
                )}
            </div>

            {/* Donation + Window Controls */}
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', paddingRight: '16px', gap: '12px', WebkitAppRegion: 'no-drag' }}>
                <DonationButton />
                
                {/* IDE Chat Toggle - only show in IDE mode */}
                {isIDEMode && (
                    <button
                        onClick={onToggleIDEChat}
                        style={{
                            ...buttonStyle,
                            background: showIDEChat ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                            color: showIDEChat ? '#6366f1' : '#ececec'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = showIDEChat ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = showIDEChat ? 'rgba(99, 102, 241, 0.2)' : 'transparent'}
                        title={showIDEChat ? 'Hide Chat' : 'Show Chat'}
                    >
                        <PanelRight size={16} />
                    </button>
                )}
                
                {/* Window Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                    onClick={handleMinimize}
                    style={buttonStyle}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Minus size={16} />
                </button>
                <button
                    onClick={handleMaximize}
                    style={buttonStyle}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Square size={14} />
                </button>
                <button
                    onClick={handleClose}
                    style={{ ...buttonStyle, ':hover': { background: '#e81123' } }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#c42b1c'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <X size={16} />
                </button>
                </div>
            </div>
        </div>
    );
};

const buttonStyle = {
    background: 'transparent',
    border: 'none',
    color: '#ececec',
    width: '32px',
    height: '24px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s'
};

const menuButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: '#ececec',
    padding: '0 10px',
    height: '100%',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'background 0.15s',
    WebkitAppRegion: 'no-drag'
};

const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    background: '#2d2d2d',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    padding: '4px 0',
    minWidth: '240px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    zIndex: 1000
};

export default TitleBar;
