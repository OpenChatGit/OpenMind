import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../contexts/ThemeContext';

// Files that should be treated as plaintext (no validation)
const plaintextFiles = new Set([
  'license', 'licence', 'copying', 'readme', 'changelog', 'changes',
  'authors', 'contributors', 'todo', 'notes', 'history', 'news',
  'makefile', 'gemfile', 'procfile', 'vagrantfile', 'brewfile',
  '.gitignore', '.gitattributes', '.gitmodules', '.npmignore', '.dockerignore',
  '.env', '.env.local', '.env.development', '.env.production', '.env.example',
  '.editorconfig', '.prettierignore', '.eslintignore', '.stylelintignore'
]);

// Map file extensions to Monaco language IDs
const getLanguage = (filename) => {
  if (!filename) return 'plaintext';
  
  const lowerName = filename.toLowerCase();
  
  // Check for special filenames first
  if (plaintextFiles.has(lowerName)) return 'plaintext';
  
  // Check for dotfiles without extension
  if (lowerName.startsWith('.') && !lowerName.includes('.', 1)) return 'plaintext';
  
  const ext = lowerName.split('.').pop();
  
  // Text files without code
  if (['txt', 'log', 'text', 'lst'].includes(ext)) return 'plaintext';
  
  const languageMap = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
    py: 'python', pyw: 'python', pyx: 'python',
    rb: 'ruby', java: 'java', c: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
    h: 'c', hpp: 'cpp', hxx: 'cpp', cs: 'csharp',
    go: 'go', rs: 'rust', php: 'php', swift: 'swift', kt: 'kotlin', scala: 'scala',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'scss', less: 'less',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini',
    md: 'markdown', mdx: 'markdown', sql: 'sql',
    sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell', ps1: 'powershell',
    dockerfile: 'dockerfile', graphql: 'graphql', gql: 'graphql',
    vue: 'html', svelte: 'html',
    lua: 'lua', r: 'r', pl: 'perl', pm: 'perl',
    ex: 'elixir', exs: 'elixir', erl: 'erlang',
    hs: 'haskell', clj: 'clojure', cljs: 'clojure',
    elm: 'elm', fs: 'fsharp', fsx: 'fsharp',
    dart: 'dart', groovy: 'groovy', gradle: 'groovy',
  };
  return languageMap[ext] || 'plaintext';
};

// Check if language should have validation
const shouldValidate = (language) => {
  // Only validate languages that Monaco can properly check
  return ['javascript', 'typescript', 'json', 'html', 'css'].includes(language);
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
    
    // Disable validation for non-code files
    if (!shouldValidate(language)) {
      // Disable all diagnostics for this model
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelMarkers(model, 'owner', []);
      }
      
      // Disable JavaScript/TypeScript validation
      monaco.languages.typescript?.javascriptDefaults?.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
      });
      monaco.languages.typescript?.typescriptDefaults?.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
      });
    }
    
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
    
    // Skip validation for non-code files
    if (!shouldValidate(language)) {
      // Clear any existing diagnostics
      if (lastMarkersSignatureRef.current !== '') {
        lastMarkersSignatureRef.current = '';
        onMonacoDiagnostics([]);
      }
      return;
    }
    
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
  }, [onMonacoDiagnostics, language]);

  // Memoize editor options to prevent unnecessary re-renders
  const editorOptions = useMemo(() => ({
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
    smoothScrolling: false, // Disable for better performance
    cursorBlinking: 'blink', // Simpler cursor animation
    cursorSmoothCaretAnimation: 'off', // Disable for better performance
    padding: { top: 12, bottom: 12 },
    folding: true,
    foldingHighlight: true,
    showFoldingControls: 'mouseover',
    matchBrackets: 'always',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoIndent: 'full',
    formatOnPaste: false, // Disable for better performance
    formatOnType: false, // Disable for better performance
    suggestOnTriggerCharacters: true,
    quickSuggestions: { other: true, comments: false, strings: false },
    parameterHints: { enabled: true },
    hover: { enabled: true, delay: 500 }, // Increased delay
    links: true,
    colorDecorators: true,
    renderLineHighlight: 'line', // Changed from 'all' for better performance
    occurrencesHighlight: 'off', // Disable for better performance
    selectionHighlight: false, // Disable for better performance
    contextmenu: true,
    mouseWheelZoom: true,
    dragAndDrop: true,
    linkedEditing: false, // Disable for better performance
    // Performance optimizations
    largeFileOptimizations: true,
    maxTokenizationLineLength: 10000, // Reduced for better performance
    stopRenderingLineAfter: 10000,
    renderValidationDecorations: 'editable',
    fastScrollSensitivity: 5,
    scrollPredominantAxis: true
  }), [wordWrap]);

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
        options={editorOptions}
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
