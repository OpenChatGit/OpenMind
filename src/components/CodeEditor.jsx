import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useTheme } from '../contexts/ThemeContext';

// Map file extensions to Monaco language IDs
const getLanguage = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  const languageMap = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', java: 'java', c: 'c', cpp: 'cpp', cs: 'csharp',
    go: 'go', rs: 'rust', php: 'php', swift: 'swift', kt: 'kotlin', scala: 'scala',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'scss', less: 'less',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', mdx: 'markdown', sql: 'sql',
    sh: 'shell', bash: 'shell', zsh: 'shell', ps1: 'powershell',
    dockerfile: 'dockerfile', graphql: 'graphql', gql: 'graphql',
    vue: 'html', svelte: 'html',
  };
  return languageMap[ext] || 'plaintext';
};

// Map our theme names to Monaco themes
const getMonacoTheme = (theme, isDark) => {
  if (!isDark) return 'light';
  const themeMap = {
    'dark-plus': 'vs-dark',
    'github-dark': 'vs-dark',
    'monokai': 'vs-dark',
    'nord': 'vs-dark',
    'one-dark-pro': 'vs-dark',
    'dracula': 'vs-dark',
    'github-light': 'light',
    'light-plus': 'light',
    'solarized-light': 'light',
  };
  return themeMap[theme] || 'vs-dark';
};

const CodeEditor = forwardRef(({ 
  content, 
  filename, 
  onChange, 
  highlight, 
  onHighlightClear, 
  wordWrap = false, 
  theme = 'dark-plus',
  diagnostics = [], // Array of { line, column, endLine, endColumn, message, severity }
  onMonacoDiagnostics, // Callback for Monaco's built-in diagnostics
  onCursorChange // Callback for cursor position changes { line, column }
}, ref) => {
  const { isDark } = useTheme();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const mountedRef = useRef(true);
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  const language = getLanguage(filename);
  const monacoTheme = getMonacoTheme(theme, isDark);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor, monaco) => {
    if (!mountedRef.current) return;
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);
    
    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange && mountedRef.current) {
        onCursorChange({
          line: e.position.lineNumber,
          column: e.position.column
        });
      }
    });
    
    // Initial cursor position
    if (onCursorChange) {
      const pos = editor.getPosition();
      if (pos) {
        onCursorChange({ line: pos.lineNumber, column: pos.column });
      }
    }
    
    // Focus editor after a small delay to avoid race conditions
    setTimeout(() => {
      if (mountedRef.current && editor) {
        editor.focus();
      }
    }, 100);
  }, [onCursorChange]);

  // Update diagnostics/markers when they change
  useEffect(() => {
    if (!monacoRef.current || !editorRef.current) return;
    
    const model = editorRef.current.getModel();
    if (!model) return;

    const markers = diagnostics.map(d => ({
      severity: d.severity === 'error' 
        ? monacoRef.current.MarkerSeverity.Error 
        : d.severity === 'warning'
        ? monacoRef.current.MarkerSeverity.Warning
        : monacoRef.current.MarkerSeverity.Info,
      startLineNumber: d.line || 1,
      startColumn: d.column || 1,
      endLineNumber: d.endLine || d.line || 1,
      endColumn: d.endColumn || d.column || 1,
      message: d.message,
      source: 'Code Analyzer'
    }));

    monacoRef.current.editor.setModelMarkers(model, 'codeAnalyzer', markers);
  }, [diagnostics, isEditorReady]);

  // Handle highlight from search
  useEffect(() => {
    if (!editorRef.current || !highlight?.line) return;
    
    const editor = editorRef.current;
    
    // Scroll to line
    editor.revealLineInCenter(highlight.line);
    
    // Highlight the line
    const decorations = editor.deltaDecorations([], [{
      range: new monacoRef.current.Range(highlight.line, 1, highlight.line, 1),
      options: {
        isWholeLine: true,
        className: 'highlighted-line',
        glyphMarginClassName: 'highlighted-glyph'
      }
    }]);

    // Clear highlight after 3 seconds
    const timer = setTimeout(() => {
      editor.deltaDecorations(decorations, []);
      if (onHighlightClear) onHighlightClear();
    }, 3000);

    return () => clearTimeout(timer);
  }, [highlight, onHighlightClear, isEditorReady]);

  // Expose editor actions via ref
  useImperativeHandle(ref, () => ({
    undo: () => editorRef.current?.trigger('keyboard', 'undo'),
    redo: () => editorRef.current?.trigger('keyboard', 'redo'),
    cut: () => {
      editorRef.current?.focus();
      document.execCommand('cut');
    },
    copy: () => {
      editorRef.current?.focus();
      document.execCommand('copy');
    },
    paste: () => {
      editorRef.current?.focus();
      document.execCommand('paste');
    },
    selectAll: () => editorRef.current?.trigger('keyboard', 'editor.action.selectAll'),
    copyLineUp: () => editorRef.current?.trigger('keyboard', 'editor.action.copyLinesUpAction'),
    copyLineDown: () => editorRef.current?.trigger('keyboard', 'editor.action.copyLinesDownAction'),
    moveLineUp: () => editorRef.current?.trigger('keyboard', 'editor.action.moveLinesUpAction'),
    moveLineDown: () => editorRef.current?.trigger('keyboard', 'editor.action.moveLinesDownAction'),
    duplicateSelection: () => editorRef.current?.trigger('keyboard', 'editor.action.duplicateSelection'),
    toggleLineComment: () => editorRef.current?.trigger('keyboard', 'editor.action.commentLine'),
    toggleBlockComment: () => editorRef.current?.trigger('keyboard', 'editor.action.blockComment'),
    focus: () => editorRef.current?.focus(),
    // Additional Monaco features
    format: () => editorRef.current?.trigger('keyboard', 'editor.action.formatDocument'),
    goToLine: (line) => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
      }
    },
    getEditor: () => editorRef.current,
    getMonaco: () => monacoRef.current
  }), []);

  // Handle content changes
  const handleChange = useCallback((value) => {
    if (!mountedRef.current) return;
    if (onChange) onChange(value || '');
  }, [onChange]);

  // Track last markers signature to prevent duplicate updates
  const lastMarkersSignatureRef = useRef('');
  
  // Handle Monaco validation - forward to parent only when changed
  const handleValidate = useCallback((markers) => {
    if (!onMonacoDiagnostics || !mountedRef.current) return;
    
    // Create signature to detect changes
    const signature = markers.map(m => `${m.startLineNumber}:${m.startColumn}:${m.message}`).join('|');
    if (signature === lastMarkersSignatureRef.current) return; // No change
    lastMarkersSignatureRef.current = signature;
    
    // Convert Monaco markers to our diagnostic format
    const diagnostics = markers.map(marker => ({
      line: marker.startLineNumber,
      column: marker.startColumn,
      endLine: marker.endLineNumber,
      endColumn: marker.endColumn,
      message: marker.message,
      severity: marker.severity === 8 ? 'error' : marker.severity === 4 ? 'warning' : 'info',
      source: 'Monaco'
    }));
    
    onMonacoDiagnostics(diagnostics);
  }, [onMonacoDiagnostics]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme={monacoTheme}
        value={content || ''}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        onValidate={handleValidate}
        keepCurrentModel={true}
        options={{
          fontSize: 13,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          lineHeight: 21,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          wordWrap: wordWrap ? 'on' : 'off',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true
          },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 12, bottom: 12 },
          folding: true,
          foldingHighlight: true,
          showFoldingControls: 'mouseover',
          matchBrackets: 'always',
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          parameterHints: { enabled: true },
          hover: { enabled: true, delay: 300 },
          links: true,
          colorDecorators: true,
          renderLineHighlight: 'all',
          occurrencesHighlight: 'singleFile',
          selectionHighlight: true,
          contextmenu: true,
          mouseWheelZoom: true,
          dragAndDrop: true,
          linkedEditing: true,
          // Performance
          largeFileOptimizations: true,
          maxTokenizationLineLength: 20000
        }}
        loading={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#888'
          }}>
            Loading editor...
          </div>
        }
      />
      <style>{`
        .highlighted-line {
          background: rgba(255, 213, 0, 0.15) !important;
          border-left: 2px solid #ffd500 !important;
        }
        .highlighted-glyph {
          background: #ffd500;
        }
      `}</style>
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
