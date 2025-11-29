import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';

// Map file extensions to Prism language names
const getLanguage = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  const languageMap = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    mdx: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    dockerfile: 'docker',
    graphql: 'graphql',
    gql: 'graphql',
    vue: 'markup',
    svelte: 'markup',
  };
  return languageMap[ext] || 'plaintext';
};

const CodeEditor = ({ content, filename, onChange, highlight, onHighlightClear }) => {
  const language = getLanguage(filename);
  const [code, setCode] = useState(content || '');
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [searchHighlight, setSearchHighlight] = useState(null);

  // Sync content prop with internal state
  useEffect(() => {
    setCode(content || '');
  }, [content]);

  // Handle highlight from search
  useEffect(() => {
    if (highlight?.line && highlight?.query) {
      setHighlightedLine(highlight.line);
      setSearchHighlight(highlight.query);
      
      // Scroll to the highlighted line
      const lineHeight = 21;
      const scrollTop = (highlight.line - 1) * lineHeight - 100;
      if (textareaRef.current) {
        textareaRef.current.scrollTop = Math.max(0, scrollTop);
      }
      if (preRef.current) {
        preRef.current.scrollTop = Math.max(0, scrollTop);
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = Math.max(0, scrollTop);
      }
      
      // Clear highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedLine(null);
        if (onHighlightClear) onHighlightClear();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [highlight, onHighlightClear]);

  const handleChange = useCallback((e) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (onChange) {
      onChange(newCode);
    }
  }, [onChange]);

  const handleScroll = useCallback((e) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.target.scrollTop;
      preRef.current.scrollLeft = e.target.scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      setCode(prevCode => {
        const newCode = prevCode.substring(0, start) + '  ' + prevCode.substring(end);
        if (onChange) onChange(newCode);
        return newCode;
      });
      // Set cursor position after tab
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  }, [onChange]);

  const lines = code.split('\n');
  const lineCount = lines.length;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      background: '#1e1e1e',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Line Numbers */}
      <div 
        ref={lineNumbersRef}
        style={{
          width: '50px',
          background: '#1e1e1e',
          borderRight: '1px solid #333',
          padding: '12px 0',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px',
          lineHeight: '21px',
          color: '#858585',
          textAlign: 'right',
          userSelect: 'none',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => {
          const lineNum = i + 1;
          const isHighlighted = highlightedLine === lineNum;
          return (
            <div 
              key={i} 
              style={{ 
                paddingRight: '12px',
                background: isHighlighted ? 'rgba(255, 213, 0, 0.15)' : 'transparent',
                color: isHighlighted ? '#ffd500' : '#858585'
              }}
            >
              {lineNum}
            </div>
          );
        })}
      </div>

      {/* Editor Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Syntax Highlighted Background */}
        <Highlight
          theme={themes.vsDark}
          code={code}
          language={language}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              ref={preRef}
              className={className}
              style={{
                ...style,
                margin: 0,
                padding: '12px 12px',
                background: 'transparent',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '13px',
                lineHeight: '21px',
                overflow: 'auto',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                whiteSpace: 'pre'
              }}
            >
              {tokens.map((line, i) => {
                const lineNum = i + 1;
                const isHighlighted = highlightedLine === lineNum;
                
                return (
                  <div 
                    key={i} 
                    {...getLineProps({ line })} 
                    style={{ 
                      minHeight: '21px',
                      background: isHighlighted ? 'rgba(255, 213, 0, 0.15)' : 'transparent',
                      borderLeft: isHighlighted ? '2px solid #ffd500' : '2px solid transparent',
                      marginLeft: '-2px',
                      transition: 'background 0.3s'
                    }}
                  >
                    {line.map((token, key) => {
                      // Highlight search matches within the token
                      if (searchHighlight && isHighlighted) {
                        const tokenText = token.content;
                        const lowerToken = tokenText.toLowerCase();
                        const lowerQuery = searchHighlight.toLowerCase();
                        const matchIndex = lowerToken.indexOf(lowerQuery);
                        
                        if (matchIndex !== -1) {
                          const before = tokenText.substring(0, matchIndex);
                          const match = tokenText.substring(matchIndex, matchIndex + searchHighlight.length);
                          const after = tokenText.substring(matchIndex + searchHighlight.length);
                          
                          return (
                            <span key={key} {...getTokenProps({ token })}>
                              {before}
                              <span style={{ background: '#613214', color: '#f8d7a4', borderRadius: '2px' }}>{match}</span>
                              {after}
                            </span>
                          );
                        }
                      }
                      return <span key={key} {...getTokenProps({ token })} />;
                    })}
                    {line.length === 0 && ' '}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>

        {/* Editable Textarea (transparent overlay) */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            padding: '12px 12px',
            margin: 0,
            border: 'none',
            outline: 'none',
            resize: 'none',
            background: 'transparent',
            color: 'transparent',
            caretColor: '#fff',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '13px',
            lineHeight: '21px',
            whiteSpace: 'pre',
            overflow: 'auto'
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
