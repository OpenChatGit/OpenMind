import { useMemo } from 'react';

// Better markdown parser
const parseMarkdown = (text) => {
  if (!text) return '';

  const lines = text.split('\n');
  const result = [];
  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockLang = '';
  let inList = false;
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      result.push(`<ul class="md-list">${listItems.join('')}</ul>`);
      listItems = [];
      inList = false;
    }
  };

  const processInline = (line) => {
    return line
      // Escape HTML (but not already processed)
      .replace(/&(?!amp;|lt;|gt;)/g, '&amp;')
      // Images (before links)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img" />')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic (careful not to match list items)
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block start/end
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        result.push(`<pre class="md-code-block"><code>${codeBlockContent.join('\n')}</code></pre>`);
        inCodeBlock = false;
        codeBlockLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      result.push(`<h3>${processInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      result.push(`<h2>${processInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      result.push(`<h1>${processInline(line.slice(2))}</h1>`);
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      flushList();
      result.push('<hr />');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      result.push(`<blockquote>${processInline(line.slice(2))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (line.match(/^[\*\-] /)) {
      inList = true;
      listItems.push(`<li>${processInline(line.slice(2))}</li>`);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      inList = true;
      const content = line.replace(/^\d+\. /, '');
      listItems.push(`<li>${processInline(content)}</li>`);
      continue;
    }

    // Regular paragraph
    flushList();
    result.push(`<p>${processInline(line)}</p>`);
  }

  // Flush remaining list
  flushList();

  return result.join('\n');
};

const MarkdownPreview = ({ content, filename, isDark = true }) => {
  const htmlContent = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: isDark ? '#1e1e1e' : '#ffffff',
      overflow: 'hidden'
    }}>
      <div 
        className={`md-preview ${isDark ? 'md-dark' : 'md-light'}`}
        style={{
          flex: 1,
          padding: '24px 32px',
          overflowY: 'auto',
          color: isDark ? '#d4d4d4' : '#24292e',
          fontSize: '0.9rem',
          lineHeight: '1.6'
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      
      <style>{`
        .md-preview h1 {
          font-size: 1.8rem;
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #333;
          color: #ececec;
          font-weight: 600;
        }
        .md-preview h2 {
          font-size: 1.4rem;
          margin: 24px 0 12px 0;
          color: #ececec;
          font-weight: 600;
        }
        .md-preview h3 {
          font-size: 1.1rem;
          margin: 20px 0 8px 0;
          color: #ececec;
          font-weight: 600;
        }
        .md-preview p {
          margin: 0 0 12px 0;
        }
        .md-preview a {
          color: #8ab4f8;
          text-decoration: none;
        }
        .md-preview a:hover {
          text-decoration: underline;
        }
        .md-preview strong {
          color: #ececec;
          font-weight: 600;
        }
        .md-preview .md-code-block {
          background: #2d2d2d;
          border-radius: 6px;
          padding: 12px 16px;
          overflow-x: auto;
          margin: 12px 0;
          font-family: Consolas, Monaco, "Courier New", monospace;
          font-size: 0.85rem;
          line-height: 1.5;
        }
        .md-preview .md-inline-code {
          background: #2d2d2d;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: Consolas, Monaco, "Courier New", monospace;
          font-size: 0.85em;
        }
        .md-preview .md-list {
          margin: 0 0 12px 0;
          padding-left: 24px;
          list-style-type: disc;
        }
        .md-preview .md-list li {
          margin: 4px 0;
          padding-left: 4px;
        }
        .md-preview blockquote {
          border-left: 3px solid #555;
          padding-left: 16px;
          margin: 12px 0;
          color: #888;
        }
        .md-preview hr {
          border: none;
          border-top: 1px solid #333;
          margin: 20px 0;
        }
        .md-preview .md-img {
          max-width: 100%;
          border-radius: 6px;
          margin: 8px 0;
        }
        
        /* Light mode overrides */
        .md-preview.md-light h1,
        .md-preview.md-light h2,
        .md-preview.md-light h3 {
          color: #1a1a1a;
        }
        .md-preview.md-light h1 {
          border-bottom-color: #d0d7de;
        }
        .md-preview.md-light strong {
          color: #1a1a1a;
        }
        .md-preview.md-light a {
          color: #0969da;
        }
        .md-preview.md-light .md-code-block {
          background: #f6f8fa;
          border: 1px solid #d0d7de;
        }
        .md-preview.md-light .md-inline-code {
          background: #f6f8fa;
          color: #1a1a1a;
        }
        .md-preview.md-light blockquote {
          border-left-color: #d0d7de;
          color: #57606a;
        }
        .md-preview.md-light hr {
          border-top-color: #d0d7de;
        }
      `}</style>
    </div>
  );
};

export default MarkdownPreview;
