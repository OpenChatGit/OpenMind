import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';

// Embedded SVG icons matching VS Code style
const svgIcons = {
  // JavaScript
  'file_type_js.svg': '<svg viewBox="0 0 32 32"><rect fill="#f5de19" width="32" height="32"/><path d="M17.4,25.8c0,1.7-.9,2.5-2.3,2.5a2.4,2.4,0,0,1-2.3-1.4l1.3-.8a1.2,1.2,0,0,0,1.1.8c.5,0,.9-.2.9-.9V18.5h1.6v7.3Zm3.8,2.5a3.5,3.5,0,0,1-3.2-1.8l1.3-.7a2.1,2.1,0,0,0,1.9,1.2c.8,0,1.3-.4,1.3-.9s-.5-.9-1.4-1.3l-.5-.2c-1.4-.6-2.4-1.4-2.4-3s1.3-2.6,3.2-2.6a3.2,3.2,0,0,1,3,1.7l-1.2.8a1.5,1.5,0,0,0-1.4-.9,1,1,0,0,0-1.1.9c0,.6.4.9,1.3,1.3l.5.2c1.7.7,2.6,1.5,2.6,3.1S23.1,28.3,21.2,28.3Z"/></svg>',
  
  // JSX/React
  'file_type_reactjs.svg': '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="2.1" fill="#61dafb"/><g stroke="#61dafb" stroke-width="1" fill="none"><ellipse cx="16" cy="16" rx="10" ry="4"/><ellipse cx="16" cy="16" rx="10" ry="4" transform="rotate(60 16 16)"/><ellipse cx="16" cy="16" rx="10" ry="4" transform="rotate(120 16 16)"/></g></svg>',
  
  // TypeScript
  'file_type_typescript.svg': '<svg viewBox="0 0 32 32"><rect fill="#3178c6" width="32" height="32"/><path fill="#fff" d="M23.5,25.8v2.1a5.3,5.3,0,0,0,1.4.7,6.5,6.5,0,0,0,1.7.2,5.4,5.4,0,0,0,1.6-.2,3.4,3.4,0,0,0,1.2-.6,2.7,2.7,0,0,0,.8-1,3.2,3.2,0,0,0,.3-1.4,2.8,2.8,0,0,0-.2-1.2,2.9,2.9,0,0,0-.6-.9,4.4,4.4,0,0,0-.9-.7l-1.2-.6-1.3-.6a3.3,3.3,0,0,1-.7-.5,1.1,1.1,0,0,1-.3-.8.9.9,0,0,1,.4-.8,1.8,1.8,0,0,1,1.1-.3,3.6,3.6,0,0,1,1.3.2,4.8,4.8,0,0,1,1.2.6V18.3a6.2,6.2,0,0,0-1.2-.4,6.7,6.7,0,0,0-1.5-.1,5.1,5.1,0,0,0-1.6.2,3.5,3.5,0,0,0-1.2.6,2.7,2.7,0,0,0-.8,1,3.2,3.2,0,0,0-.3,1.3,2.6,2.6,0,0,0,.7,1.9,5.7,5.7,0,0,0,2.1,1.3l1.2.5a3.1,3.1,0,0,1,.8.6,1.1,1.1,0,0,1,.3.8,1,1,0,0,1-.4.8,2,2,0,0,1-1.2.3A4.1,4.1,0,0,1,23.5,25.8ZM18.5,20h2.7V18H13v2h2.7v9.8h2.8Z"/></svg>',
  
  // TSX
  'file_type_reactts.svg': '<svg viewBox="0 0 32 32"><rect fill="#3178c6" width="32" height="32" rx="2"/><circle cx="22" cy="22" r="1.5" fill="#61dafb"/><g stroke="#61dafb" stroke-width="0.7" fill="none"><ellipse cx="22" cy="22" rx="6" ry="2.3"/><ellipse cx="22" cy="22" rx="6" ry="2.3" transform="rotate(60 22 22)"/><ellipse cx="22" cy="22" rx="6" ry="2.3" transform="rotate(120 22 22)"/></g><path fill="#fff" d="M11,15h2.5v-2H6v2h2.5v8H11Z"/></svg>',
  
  // HTML
  'file_type_html.svg': '<svg viewBox="0 0 32 32"><path fill="#e44d26" d="M6,3,8,27l8,3,8-3,2-24Z"/><path fill="#f16529" d="M16,27l6-2,2-19H16Z"/><path fill="#ebebeb" d="M16,13H12l-.3-3H16V7H8l.9,10H16Zm0,7-4-1-.3-3H9l.5,6,6.5,2Z"/><path fill="#fff" d="M16,13v3h4l-.4,4-3.6,1v4l6-2,.1-1,.7-8,.1-1H16Zm0-6v3h7l.1-1,.2-2Z"/></svg>',
  
  // CSS
  'file_type_css.svg': '<svg viewBox="0 0 32 32"><path fill="#1572b6" d="M6,3,8,27l8,3,8-3,2-24Z"/><path fill="#33a9dc" d="M16,27l6-2,2-19H16Z"/><path fill="#ebebeb" d="M16,13H12l-.3-3H16V7H8l.9,10H16Zm0,7-4-1-.3-3H9l.5,6,6.5,2Z"/><path fill="#fff" d="M16,13v3h4l-.4,4-3.6,1v4l6-2,.1-1,.7-8,.1-1H16Zm0-6v3h7l.1-1,.2-2Z"/></svg>',
  
  // JSON
  'file_type_json.svg': '<svg viewBox="0 0 32 32"><path fill="#f5de19" d="M4,16.9V15.1a5.3,5.3,0,0,0,3.5-1.4,4.5,4.5,0,0,0,1-3.2V7.9A3.4,3.4,0,0,1,9.6,5.3,4.8,4.8,0,0,1,12.5,4.5h.8V6.3h-.5a2.4,2.4,0,0,0-1.7.5,2.1,2.1,0,0,0-.5,1.6v2.5a4.8,4.8,0,0,1-.8,2.9,3.6,3.6,0,0,1-2.3,1.3,3.6,3.6,0,0,1,2.3,1.3,4.8,4.8,0,0,1,.8,2.9v2.5a2.1,2.1,0,0,0,.5,1.6,2.4,2.4,0,0,0,1.7.5h.5v1.8h-.8a4.8,4.8,0,0,1-2.9-.8A3.4,3.4,0,0,1,8.5,22v-2.6a4.5,4.5,0,0,0-1-3.2A5.3,5.3,0,0,0,4,16.9Z"/><path fill="#f5de19" d="M28,15.1v1.8a5.3,5.3,0,0,0-3.5,1.4,4.5,4.5,0,0,0-1,3.2V24a3.4,3.4,0,0,1-1.1,2.6,4.8,4.8,0,0,1-2.9.8h-.8V25.7h.5a2.4,2.4,0,0,0,1.7-.5,2.1,2.1,0,0,0,.5-1.6V21.1a4.8,4.8,0,0,1,.8-2.9,3.6,3.6,0,0,1,2.3-1.3,3.6,3.6,0,0,1-2.3-1.3,4.8,4.8,0,0,1-.8-2.9V10.2a2.1,2.1,0,0,0-.5-1.6,2.4,2.4,0,0,0-1.7-.5h-.5V6.3h.8a4.8,4.8,0,0,1,2.9.8A3.4,3.4,0,0,1,23.5,9.7v2.6a4.5,4.5,0,0,0,1,3.2A5.3,5.3,0,0,0,28,15.1Z"/></svg>',
  
  // Python
  'file_type_python.svg': '<svg viewBox="0 0 32 32"><path fill="#366994" d="M15.9,3c-7.2,0-6.7,3.1-6.7,3.1v3.2h6.8v1H6.5S3,9.8,3,16.1s3.1,6.1,3.1,6.1h1.8v-2.9s-.1-3.1,3.1-3.1h5.3s3,0,3-2.9V7.1S19.8,3,15.9,3Zm-3.7,2.4a1.1,1.1,0,1,1-1.1,1.1A1.1,1.1,0,0,1,12.2,5.4Z"/><path fill="#ffc331" d="M16.1,29c7.2,0,6.7-3.1,6.7-3.1v-3.2h-6.8v-1h9.5s3.5.5,3.5-5.8-3.1-6.1-3.1-6.1h-1.8v2.9s.1,3.1-3.1,3.1h-5.3s-3,0-3,2.9v6.2S12.2,29,16.1,29Zm3.7-2.4a1.1,1.1,0,1,1,1.1-1.1A1.1,1.1,0,0,1,19.8,26.6Z"/></svg>',
  
  // Markdown
  'file_type_markdown.svg': '<svg viewBox="0 0 32 32"><rect fill="#083fa1" x="2" y="6" width="28" height="20" rx="2"/><path fill="#fff" d="M6,22V10h3l3,4,3-4h3V22H15V15l-3,4-3-4v7Zm16-6v6H19l4.5-6L28,22H25V16Z"/></svg>',
  
  // Git
  'file_type_git.svg': '<svg viewBox="0 0 32 32"><path fill="#f14e32" d="M29.5,15.3,16.7,2.5a1.6,1.6,0,0,0-2.2,0l-2.7,2.7,3.4,3.4a1.9,1.9,0,0,1,2.3.5,1.9,1.9,0,0,1,.5,2.3l3.3,3.3a1.9,1.9,0,0,1,2.3.5,1.9,1.9,0,1,1-3.2,0,1.9,1.9,0,0,1-.5-2.4l-3.1-3.1v8.1a1.9,1.9,0,0,1,.6.4,1.9,1.9,0,1,1-3.2,0,1.9,1.9,0,0,1,.8-.5V13.8a1.9,1.9,0,0,1-.8-.5,1.9,1.9,0,0,1-.5-2.4L10.4,7.6l-8,8a1.6,1.6,0,0,0,0,2.2L15.2,30.6a1.6,1.6,0,0,0,2.2,0L29.5,18.5A1.6,1.6,0,0,0,29.5,15.3Z"/></svg>',
  
  // ENV
  'file_type_dotenv.svg': '<svg viewBox="0 0 32 32"><rect fill="#ecd53f" x="4" y="4" width="24" height="24" rx="2"/><circle fill="#000" cx="10" cy="12" r="2"/><circle fill="#000" cx="16" cy="12" r="2"/><circle fill="#000" cx="22" cy="12" r="2"/><rect fill="#000" x="8" y="18" width="16" height="2" rx="1"/><rect fill="#000" x="8" y="22" width="10" height="2" rx="1"/></svg>',
  
  // SVG
  'file_type_svg.svg': '<svg viewBox="0 0 32 32"><rect fill="#ffb13b" x="4" y="4" width="24" height="24" rx="2"/><path fill="#fff" d="M10,20l4-8,3,5,2-3,3,6Z"/><circle fill="#fff" cx="20" cy="12" r="2"/></svg>',
  
  // Image
  'file_type_image.svg': '<svg viewBox="0 0 32 32"><rect fill="#a074c4" x="4" y="6" width="24" height="20" rx="2"/><path fill="#fff" fill-opacity="0.8" d="M8,22l5-7,4,5,3-3,4,5Z"/><circle fill="#fff" cx="22" cy="12" r="2.5"/></svg>',
  
  // Vite
  'file_type_vite.svg': '<svg viewBox="0 0 32 32"><path fill="#646cff" d="M28,8,16.5,28,5,8l11.5,3Z"/><path fill="#ffcc24" d="M22,4l-5.5,20L11,4l5.5,2Z"/></svg>',
  
  // ESLint
  'file_type_eslint.svg': '<svg viewBox="0 0 32 32"><path fill="#4b32c3" d="M16,3,4,10v12l12,7,12-7V10Z"/><path fill="#8080f2" d="M16,8l-8,4.5v9L16,26l8-4.5v-9Z"/><path fill="#fff" d="M16,13l-4,2.3v4.4l4,2.3,4-2.3v-4.4Z"/></svg>',
  
  // Package.json
  'file_type_npm.svg': '<svg viewBox="0 0 32 32"><rect fill="#cb3837" x="4" y="4" width="24" height="24" rx="2"/><path fill="#fff" d="M8,8h16v16H16V12H12v12H8Z"/></svg>',
  
  // Lock
  'file_type_lock.svg': '<svg viewBox="0 0 32 32"><rect fill="#888" x="8" y="14" width="16" height="12" rx="2"/><path stroke="#888" stroke-width="2" fill="none" d="M12,14v-3a4,4,0,0,1,8,0v3"/><circle fill="#fff" cx="16" cy="20" r="2"/></svg>',
  
  // Shell
  'file_type_shell.svg': '<svg viewBox="0 0 32 32"><rect fill="#1e1e1e" x="4" y="4" width="24" height="24" rx="2"/><text fill="#89e051" x="8" y="18" font-size="10" font-family="monospace">$_</text></svg>',
  
  // Docker
  'file_type_docker.svg': '<svg viewBox="0 0 32 32"><path fill="#2496ed" d="M18,12h3v3h-3Zm-4,0h3v3h-3Zm-4,0h3v3h-3Zm-4,0h3v3H6Zm4-4h3v3h-3Zm4,0h3v3h-3Zm4,0h3v3h-3Zm-4-4h3v3h-3Z"/><path fill="#2496ed" d="M28,14a3.5,3.5,0,0,0-2.5-.2,3.5,3.5,0,0,0-1.5-2.6l-.5-.4-.4.5a3.5,3.5,0,0,0-.6,2.2,2.5,2.5,0,0,0,.6,1.4,5.5,5.5,0,0,1-2.6.7H2l-.1.6a7.5,7.5,0,0,0,.5,3.5,5.5,5.5,0,0,0,2.4,2.8,11.5,11.5,0,0,0,5.4,1.1,15.5,15.5,0,0,0,3-.3,9.5,9.5,0,0,0,3.8-1.6,7.5,7.5,0,0,0,2.5-2.5,9.5,9.5,0,0,0,1.7-4.3h.3a3.5,3.5,0,0,0,2.6-1.1,2.5,2.5,0,0,0,.5-.8l.1-.4Z"/></svg>',
  
  // Default file
  'default_file.svg': '<svg viewBox="0 0 32 32"><path fill="#888" d="M8,4h10l8,8v16a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2V6A2,2,0,0,1,8,4Z"/><path fill="#666" d="M18,4v8h8"/></svg>',
  
  // Folders
  'default_folder.svg': '<svg viewBox="0 0 32 32"><path fill="#90a4ae" d="M4,8H14l2,2H28a2,2,0,0,1,2,2V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V10A2,2,0,0,1,4,8Z"/></svg>',
  'default_folder_opened.svg': '<svg viewBox="0 0 32 32"><path fill="#90a4ae" d="M4,8H14l2,2H28a2,2,0,0,1,2,2v2H4V10A2,2,0,0,1,4,8Z"/><path fill="#78909c" d="M2,14H30V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2Z"/></svg>',
  
  // Special folders
  'folder_type_src.svg': '<svg viewBox="0 0 32 32"><path fill="#42a5f5" d="M4,8H14l2,2H28a2,2,0,0,1,2,2V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V10A2,2,0,0,1,4,8Z"/></svg>',
  'folder_type_src_opened.svg': '<svg viewBox="0 0 32 32"><path fill="#42a5f5" d="M4,8H14l2,2H28a2,2,0,0,1,2,2v2H4V10A2,2,0,0,1,4,8Z"/><path fill="#1e88e5" d="M2,14H30V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2Z"/></svg>',
  'folder_type_component.svg': '<svg viewBox="0 0 32 32"><path fill="#7c4dff" d="M4,8H14l2,2H28a2,2,0,0,1,2,2V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V10A2,2,0,0,1,4,8Z"/></svg>',
  'folder_type_component_opened.svg': '<svg viewBox="0 0 32 32"><path fill="#7c4dff" d="M4,8H14l2,2H28a2,2,0,0,1,2,2v2H4V10A2,2,0,0,1,4,8Z"/><path fill="#651fff" d="M2,14H30V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2Z"/></svg>',
  'folder_type_node.svg': '<svg viewBox="0 0 32 32"><path fill="#689f38" d="M4,8H14l2,2H28a2,2,0,0,1,2,2V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V10A2,2,0,0,1,4,8Z"/></svg>',
  'folder_type_node_opened.svg': '<svg viewBox="0 0 32 32"><path fill="#689f38" d="M4,8H14l2,2H28a2,2,0,0,1,2,2v2H4V10A2,2,0,0,1,4,8Z"/><path fill="#558b2f" d="M2,14H30V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2Z"/></svg>',
  'folder_type_git.svg': '<svg viewBox="0 0 32 32"><path fill="#f14e32" d="M4,8H14l2,2H28a2,2,0,0,1,2,2V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V10A2,2,0,0,1,4,8Z"/></svg>',
  'folder_type_git_opened.svg': '<svg viewBox="0 0 32 32"><path fill="#f14e32" d="M4,8H14l2,2H28a2,2,0,0,1,2,2v2H4V10A2,2,0,0,1,4,8Z"/><path fill="#d32f2f" d="M2,14H30V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2Z"/></svg>',
  'folder_type_vscode.svg': '<svg viewBox="0 0 32 32"><path fill="#007acc" d="M4,8H14l2,2H28a2,2,0,0,1,2,2V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V10A2,2,0,0,1,4,8Z"/></svg>',
  'folder_type_vscode_opened.svg': '<svg viewBox="0 0 32 32"><path fill="#007acc" d="M4,8H14l2,2H28a2,2,0,0,1,2,2v2H4V10A2,2,0,0,1,4,8Z"/><path fill="#0065a9" d="M2,14H30V24a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2Z"/></svg>',
};

// Map icon names to our embedded SVGs
const getEmbeddedIcon = (iconName) => {
  if (!iconName) return null;
  return svgIcons[iconName] || null;
};

import { memo, useMemo } from 'react';

const FileIcon = memo(({ filename, isFolder = false, isOpen = false, size = 16 }) => {
  // Memoize icon computation
  const svgContent = useMemo(() => {
    let iconName;
    
    try {
      if (isFolder) {
        iconName = isOpen 
          ? getIconForOpenFolder(filename) 
          : getIconForFolder(filename);
      } else {
        iconName = getIconForFile(filename);
      }
    } catch (e) {
      iconName = null;
    }

    // Get embedded SVG or fallback
    let content = getEmbeddedIcon(iconName);
    
    if (!content) {
      // Use default icons
      if (isFolder) {
        content = isOpen ? svgIcons['default_folder_opened.svg'] : svgIcons['default_folder.svg'];
      } else {
        content = svgIcons['default_file.svg'];
      }
    }
    
    return content;
  }, [filename, isFolder, isOpen]);

  return (
    <span 
      style={{ 
        width: size, 
        height: size, 
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
});

FileIcon.displayName = 'FileIcon';

export default FileIcon;
