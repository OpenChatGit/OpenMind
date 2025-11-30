import { memo, useMemo } from 'react';

// Seti UI color palette
const colors = {
  blue: '#519aba',
  grey: '#4d5a5e',
  'grey-light': '#6d8086',
  green: '#8dc149',
  orange: '#e37933',
  pink: '#f55385',
  purple: '#a074c4',
  red: '#cc3e44',
  white: '#d4d7d6',
  yellow: '#cbcb41',
  ignore: '#41535b',
};

// Extension to icon mapping based on Seti UI
const extensionMap = {
  // JavaScript
  'js': { icon: 'javascript', color: colors.yellow },
  'mjs': { icon: 'javascript', color: colors.yellow },
  'cjs': { icon: 'javascript', color: colors.yellow },
  'es6': { icon: 'javascript', color: colors.yellow },
  
  // TypeScript
  'ts': { icon: 'typescript', color: colors.blue },
  'd.ts': { icon: 'typescript', color: colors.blue },
  
  // React
  'jsx': { icon: 'react', color: colors.blue },
  'tsx': { icon: 'react', color: colors.blue },
  
  // HTML
  'html': { icon: 'html', color: colors.orange },
  'htm': { icon: 'html', color: colors.orange },
  
  // CSS
  'css': { icon: 'css', color: colors.blue },
  'scss': { icon: 'sass', color: colors.pink },
  'sass': { icon: 'sass', color: colors.pink },
  'less': { icon: 'less', color: colors.blue },
  'styl': { icon: 'stylus', color: colors.green },
  
  // JSON
  'json': { icon: 'json', color: colors.yellow },
  'cson': { icon: 'json', color: colors.yellow },
  
  // Markdown
  'md': { icon: 'markdown', color: colors.blue },
  'markdown': { icon: 'markdown', color: colors.blue },
  'mdx': { icon: 'markdown', color: colors.blue },
  
  // Python
  'py': { icon: 'python', color: colors.blue },
  'pyw': { icon: 'python', color: colors.blue },
  'pyx': { icon: 'python', color: colors.blue },
  
  // Ruby
  'rb': { icon: 'ruby', color: colors.red },
  'erb': { icon: 'html_erb', color: colors.red },
  
  // PHP
  'php': { icon: 'php', color: colors.purple },
  
  // Java
  'java': { icon: 'java', color: colors.red },
  'class': { icon: 'java', color: colors.blue },
  'jar': { icon: 'zip', color: colors.red },
  
  // C/C++
  'c': { icon: 'c', color: colors.blue },
  'h': { icon: 'c', color: colors.purple },
  'cpp': { icon: 'cpp', color: colors.blue },
  'cc': { icon: 'cpp', color: colors.blue },
  'cxx': { icon: 'cpp', color: colors.blue },
  'hpp': { icon: 'cpp', color: colors.purple },
  'hxx': { icon: 'cpp', color: colors.purple },
  
  // C#
  'cs': { icon: 'c-sharp', color: colors.blue },
  
  // Go
  'go': { icon: 'go2', color: colors.blue },
  
  // Rust
  'rs': { icon: 'rust', color: colors['grey-light'] },
  
  // Swift
  'swift': { icon: 'swift', color: colors.orange },
  
  // Kotlin
  'kt': { icon: 'kotlin', color: colors.orange },
  'kts': { icon: 'kotlin', color: colors.orange },
  
  // Scala
  'scala': { icon: 'scala', color: colors.red },
  
  // Dart
  'dart': { icon: 'dart', color: colors.blue },
  
  // Shell
  'sh': { icon: 'shell', color: colors.green },
  'bash': { icon: 'shell', color: colors.green },
  'zsh': { icon: 'shell', color: colors.green },
  'fish': { icon: 'shell', color: colors.green },
  
  // PowerShell
  'ps1': { icon: 'powershell', color: colors.blue },
  'psm1': { icon: 'powershell', color: colors.blue },
  'psd1': { icon: 'powershell', color: colors.blue },
  
  // Windows
  'bat': { icon: 'windows', color: colors.blue },
  'cmd': { icon: 'windows', color: colors.blue },
  
  // Config
  'yml': { icon: 'yml', color: colors.purple },
  'yaml': { icon: 'yml', color: colors.purple },
  'xml': { icon: 'xml', color: colors.orange },
  'toml': { icon: 'config', color: colors['grey-light'] },
  'ini': { icon: 'config', color: colors['grey-light'] },
  'conf': { icon: 'config', color: colors['grey-light'] },
  'config': { icon: 'config', color: colors['grey-light'] },
  
  // Database
  'sql': { icon: 'db', color: colors.pink },
  'sqlite': { icon: 'db', color: colors.pink },
  'prisma': { icon: 'prisma', color: colors.blue },
  
  // GraphQL
  'graphql': { icon: 'graphql', color: colors.pink },
  'gql': { icon: 'graphql', color: colors.pink },
  
  // Vue
  'vue': { icon: 'vue', color: colors.green },
  
  // Svelte
  'svelte': { icon: 'svelte', color: colors.red },
  
  // Templates
  'ejs': { icon: 'ejs', color: colors.yellow },
  'pug': { icon: 'pug', color: colors.red },
  'jade': { icon: 'jade', color: colors.red },
  'hbs': { icon: 'mustache', color: colors.orange },
  'handlebars': { icon: 'mustache', color: colors.orange },
  'mustache': { icon: 'mustache', color: colors.orange },
  'twig': { icon: 'twig', color: colors.green },
  'liquid': { icon: 'liquid', color: colors.green },
  'njk': { icon: 'nunjucks', color: colors.green },
  
  // Images
  'png': { icon: 'image', color: colors.purple },
  'jpg': { icon: 'image', color: colors.purple },
  'jpeg': { icon: 'image', color: colors.purple },
  'gif': { icon: 'image', color: colors.purple },
  'webp': { icon: 'image', color: colors.purple },
  'avif': { icon: 'image', color: colors.purple },
  'ico': { icon: 'favicon', color: colors.yellow },
  'svg': { icon: 'svg', color: colors.purple },
  
  // Fonts
  'ttf': { icon: 'font', color: colors.red },
  'otf': { icon: 'font', color: colors.red },
  'woff': { icon: 'font', color: colors.red },
  'woff2': { icon: 'font', color: colors.red },
  'eot': { icon: 'font', color: colors.red },
  
  // Audio
  'mp3': { icon: 'audio', color: colors.purple },
  'wav': { icon: 'audio', color: colors.purple },
  'ogg': { icon: 'audio', color: colors.purple },
  'flac': { icon: 'audio', color: colors.purple },
  
  // Video
  'mp4': { icon: 'video', color: colors.pink },
  'webm': { icon: 'video', color: colors.pink },
  'mov': { icon: 'video', color: colors.pink },
  'avi': { icon: 'video', color: colors.pink },
  'mkv': { icon: 'video', color: colors.pink },
  
  // Archives
  'zip': { icon: 'zip', color: colors['grey-light'] },
  'tar': { icon: 'zip', color: colors['grey-light'] },
  'gz': { icon: 'zip', color: colors['grey-light'] },
  'rar': { icon: 'zip', color: colors['grey-light'] },
  '7z': { icon: 'zip', color: colors['grey-light'] },
  
  // Documents
  'pdf': { icon: 'pdf', color: colors.red },
  'doc': { icon: 'word', color: colors.blue },
  'docx': { icon: 'word', color: colors.blue },
  'xls': { icon: 'xls', color: colors.green },
  'xlsx': { icon: 'xls', color: colors.green },
  'csv': { icon: 'csv', color: colors.green },
  
  // Adobe
  'psd': { icon: 'photoshop', color: colors.blue },
  'ai': { icon: 'illustrator', color: colors.yellow },
  
  // Git
  'gitignore': { icon: 'git', color: colors.ignore },
  'gitattributes': { icon: 'git', color: colors.ignore },
  'gitmodules': { icon: 'git', color: colors.ignore },
  
  // Misc
  'log': { icon: 'default', color: colors['grey-light'] },
  'txt': { icon: 'default', color: colors.white },
  'lock': { icon: 'lock', color: colors.green },
  
  // Elixir
  'ex': { icon: 'elixir', color: colors.purple },
  'exs': { icon: 'elixir_script', color: colors.purple },
  
  // Haskell
  'hs': { icon: 'haskell', color: colors.purple },
  'lhs': { icon: 'haskell', color: colors.purple },
  
  // Clojure
  'clj': { icon: 'clojure', color: colors.green },
  'cljs': { icon: 'clojure', color: colors.green },
  'cljc': { icon: 'clojure', color: colors.green },
  
  // Lua
  'lua': { icon: 'lua', color: colors.blue },
  
  // R
  'r': { icon: 'R', color: colors.blue },
  'rmd': { icon: 'R', color: colors.blue },
  
  // Julia
  'jl': { icon: 'julia', color: colors.purple },
  
  // Elm
  'elm': { icon: 'elm', color: colors.blue },
  
  // F#
  'fs': { icon: 'f-sharp', color: colors.blue },
  'fsx': { icon: 'f-sharp', color: colors.blue },
  
  // OCaml
  'ml': { icon: 'ocaml', color: colors.orange },
  'mli': { icon: 'ocaml', color: colors.orange },
  
  // Perl
  'pl': { icon: 'perl', color: colors.blue },
  'pm': { icon: 'perl', color: colors.blue },
  
  // Groovy
  'groovy': { icon: 'grails', color: colors.green },
  'gradle': { icon: 'gradle', color: colors.blue },
  
  // Terraform
  'tf': { icon: 'terraform', color: colors.purple },
  'tfvars': { icon: 'terraform', color: colors.purple },
  
  // Docker
  'dockerfile': { icon: 'docker', color: colors.blue },
  
  // Solidity
  'sol': { icon: 'ethereum', color: colors.blue },
  
  // WebAssembly
  'wasm': { icon: 'wasm', color: colors.purple },
  'wat': { icon: 'wat', color: colors.purple },
  
  // Zig
  'zig': { icon: 'zig', color: colors.orange },
  
  // Nim
  'nim': { icon: 'nim', color: colors.yellow },
  
  // Crystal
  'cr': { icon: 'crystal', color: colors.white },
  
  // D
  'd': { icon: 'd', color: colors.red },
  
  // Assembly
  'asm': { icon: 'asm', color: colors.red },
  's': { icon: 'asm', color: colors.red },
  
  // CUDA
  'cu': { icon: 'cu', color: colors.green },
  'cuh': { icon: 'cu', color: colors.purple },
};

// Special filename mappings
const filenameMap = {
  'package.json': { icon: 'npm', color: colors.red },
  'package-lock.json': { icon: 'npm', color: colors.red },
  '.npmrc': { icon: 'npm', color: colors.red },
  '.npmignore': { icon: 'npm', color: colors.red },
  'yarn.lock': { icon: 'yarn', color: colors.blue },
  '.yarnrc': { icon: 'yarn', color: colors.blue },
  'tsconfig.json': { icon: 'tsconfig', color: colors.blue },
  'jsconfig.json': { icon: 'json', color: colors.yellow },
  '.gitignore': { icon: 'git', color: colors.ignore },
  '.gitattributes': { icon: 'git', color: colors.ignore },
  '.gitmodules': { icon: 'git', color: colors.ignore },
  '.env': { icon: 'config', color: colors['grey-light'] },
  '.env.local': { icon: 'config', color: colors['grey-light'] },
  '.env.development': { icon: 'config', color: colors['grey-light'] },
  '.env.production': { icon: 'config', color: colors['grey-light'] },
  '.env.example': { icon: 'config', color: colors['grey-light'] },
  'dockerfile': { icon: 'docker', color: colors.blue },
  'docker-compose.yml': { icon: 'docker', color: colors.pink },
  'docker-compose.yaml': { icon: 'docker', color: colors.pink },
  '.dockerignore': { icon: 'docker', color: colors.grey },
  'vite.config.js': { icon: 'javascript', color: colors.yellow },
  'vite.config.ts': { icon: 'typescript', color: colors.blue },
  'webpack.config.js': { icon: 'webpack', color: colors.blue },
  'webpack.config.ts': { icon: 'webpack', color: colors.blue },
  'rollup.config.js': { icon: 'rollup', color: colors.red },
  'rollup.config.ts': { icon: 'rollup', color: colors.red },
  'eslint.config.js': { icon: 'eslint', color: colors.purple },
  'eslint.config.mjs': { icon: 'eslint', color: colors.purple },
  '.eslintrc': { icon: 'eslint', color: colors.purple },
  '.eslintrc.js': { icon: 'eslint', color: colors.purple },
  '.eslintrc.json': { icon: 'eslint', color: colors.purple },
  '.eslintignore': { icon: 'eslint', color: colors.grey },
  '.prettierrc': { icon: 'config', color: colors['grey-light'] },
  '.prettierrc.js': { icon: 'config', color: colors['grey-light'] },
  '.prettierrc.json': { icon: 'config', color: colors['grey-light'] },
  '.prettierignore': { icon: 'config', color: colors.grey },
  '.stylelintrc': { icon: 'stylelint', color: colors.white },
  '.stylelintrc.json': { icon: 'stylelint', color: colors.white },
  'stylelint.config.js': { icon: 'stylelint', color: colors.white },
  '.babelrc': { icon: 'babel', color: colors.yellow },
  '.babelrc.js': { icon: 'babel', color: colors.yellow },
  'babel.config.js': { icon: 'babel', color: colors.yellow },
  'babel.config.json': { icon: 'babel', color: colors.yellow },
  '.editorconfig': { icon: 'editorconfig', color: colors['grey-light'] },
  'readme.md': { icon: 'info', color: colors.blue },
  'readme.txt': { icon: 'info', color: colors.blue },
  'readme': { icon: 'info', color: colors.blue },
  'changelog.md': { icon: 'clock', color: colors.blue },
  'changelog.txt': { icon: 'clock', color: colors.blue },
  'changelog': { icon: 'clock', color: colors.blue },
  'license': { icon: 'license', color: colors.yellow },
  'license.md': { icon: 'license', color: colors.yellow },
  'license.txt': { icon: 'license', color: colors.yellow },
  'licence': { icon: 'license', color: colors.yellow },
  'copying': { icon: 'license', color: colors.yellow },
  'contributing.md': { icon: 'license', color: colors.red },
  'makefile': { icon: 'makefile', color: colors.orange },
  'cmakelists.txt': { icon: 'makefile', color: colors.blue },
  'gruntfile.js': { icon: 'grunt', color: colors.orange },
  'gulpfile.js': { icon: 'gulp', color: colors.red },
  'gulpfile.babel.js': { icon: 'gulp', color: colors.red },
  'jenkinsfile': { icon: 'jenkins', color: colors.red },
  'procfile': { icon: 'heroku', color: colors.purple },
  '.gitlab-ci.yml': { icon: 'gitlab', color: colors.orange },
  'firebase.json': { icon: 'firebase', color: colors.orange },
  '.firebaserc': { icon: 'firebase', color: colors.orange },
  'karma.conf.js': { icon: 'karma', color: colors.green },
  'todo.md': { icon: 'todo', color: colors.blue },
  'todo.txt': { icon: 'todo', color: colors.blue },
  'todo': { icon: 'todo', color: colors.blue },
  'pom.xml': { icon: 'maven', color: colors.red },
  'bower.json': { icon: 'bower', color: colors.orange },
  '.bowerrc': { icon: 'bower', color: colors.orange },
  'ionic.config.json': { icon: 'ionic', color: colors.blue },
  'platformio.ini': { icon: 'platformio', color: colors.orange },
  '.codeclimate.yml': { icon: 'code-climate', color: colors.green },
  'swagger.json': { icon: 'json', color: colors.green },
  'swagger.yml': { icon: 'json', color: colors.green },
  'swagger.yaml': { icon: 'json', color: colors.green },
};

// Folder icon mappings
const folderMap = {
  'src': colors.blue,
  'source': colors.blue,
  'lib': colors.blue,
  'dist': colors.yellow,
  'build': colors.yellow,
  'out': colors.yellow,
  'public': colors.green,
  'static': colors.green,
  'assets': colors.purple,
  'images': colors.purple,
  'img': colors.purple,
  'icons': colors.purple,
  'fonts': colors.red,
  'styles': colors.pink,
  'css': colors.pink,
  'scss': colors.pink,
  'components': colors.blue,
  'pages': colors.green,
  'views': colors.green,
  'layouts': colors.orange,
  'templates': colors.orange,
  'utils': colors['grey-light'],
  'helpers': colors['grey-light'],
  'hooks': colors.blue,
  'contexts': colors.purple,
  'services': colors.yellow,
  'api': colors.green,
  'routes': colors.orange,
  'middleware': colors.red,
  'models': colors.red,
  'controllers': colors.blue,
  'config': colors['grey-light'],
  'configs': colors['grey-light'],
  'settings': colors['grey-light'],
  'test': colors.orange,
  'tests': colors.orange,
  '__tests__': colors.orange,
  'spec': colors.orange,
  'specs': colors.orange,
  'node_modules': colors.green,
  '.git': colors.red,
  '.github': colors.white,
  '.vscode': colors.blue,
  '.idea': colors.blue,
  'vendor': colors['grey-light'],
  'packages': colors.blue,
  'docs': colors.blue,
  'documentation': colors.blue,
  'scripts': colors.yellow,
  'bin': colors.yellow,
  'data': colors.green,
  'database': colors.pink,
  'db': colors.pink,
  'migrations': colors.orange,
  'seeds': colors.green,
  'logs': colors['grey-light'],
  'tmp': colors['grey-light'],
  'temp': colors['grey-light'],
  'cache': colors['grey-light'],
  '.cache': colors['grey-light'],
  'types': colors.blue,
  '@types': colors.blue,
  'typings': colors.blue,
  'interfaces': colors.blue,
  'locales': colors.purple,
  'i18n': colors.purple,
  'translations': colors.purple,
  'plugins': colors.green,
  'modules': colors.blue,
  'features': colors.purple,
  'store': colors.purple,
  'redux': colors.purple,
  'state': colors.purple,
  'actions': colors.orange,
  'reducers': colors.blue,
  'selectors': colors.green,
  'sagas': colors.red,
  'effects': colors.yellow,
  'graphql': colors.pink,
  'queries': colors.pink,
  'mutations': colors.pink,
  'subscriptions': colors.pink,
  'resolvers': colors.purple,
  'schema': colors.blue,
  'schemas': colors.blue,
  'electron': colors.blue,
  'native': colors.green,
  'android': colors.green,
  'ios': colors['grey-light'],
  'web': colors.blue,
  'mobile': colors.purple,
  'desktop': colors.blue,
  'server': colors.green,
  'client': colors.blue,
  'shared': colors.purple,
  'common': colors.purple,
  'core': colors.red,
  'base': colors.orange,
  'abstract': colors.purple,
  'entities': colors.blue,
  'domain': colors.purple,
  'infrastructure': colors.orange,
  'application': colors.green,
  'presentation': colors.blue,
  'ui': colors.blue,
  'widgets': colors.purple,
  'elements': colors.blue,
  'atoms': colors.green,
  'molecules': colors.blue,
  'organisms': colors.purple,
  'mcp-tools': colors.green,
  'python': colors.blue,
  'projects': colors.purple,
  'models': colors.red,
};

// SVG cache
const svgCache = new Map();

// Load SVG from seti-ui package
const loadSvg = async (iconName) => {
  if (svgCache.has(iconName)) {
    return svgCache.get(iconName);
  }
  
  try {
    // Dynamic import for Vite
    const svgModule = await import(`../../node_modules/seti-ui/icons/${iconName}.svg?raw`);
    const svgContent = svgModule.default;
    svgCache.set(iconName, svgContent);
    return svgContent;
  } catch {
    // Fallback to default icon
    if (iconName !== 'default') {
      return loadSvg('default');
    }
    return null;
  }
};

// Get icon info for a file
const getFileIconInfo = (filename) => {
  if (!filename) return { icon: 'default', color: colors.white };
  
  const lowerName = filename.toLowerCase();
  
  // Check special filenames first
  if (filenameMap[lowerName]) {
    return filenameMap[lowerName];
  }
  
  // Check for d.ts files
  if (lowerName.endsWith('.d.ts')) {
    return { icon: 'typescript', color: colors.blue };
  }
  
  // Check for test files
  if (lowerName.includes('.spec.') || lowerName.includes('.test.')) {
    const ext = lowerName.split('.').pop();
    if (ext === 'ts' || ext === 'tsx') {
      return { icon: 'typescript', color: colors.orange };
    }
    if (ext === 'js' || ext === 'jsx') {
      return { icon: 'javascript', color: colors.orange };
    }
  }
  
  // Get extension
  const ext = lowerName.split('.').pop();
  if (extensionMap[ext]) {
    return extensionMap[ext];
  }
  
  return { icon: 'default', color: colors.white };
};

// Get folder color
const getFolderColor = (foldername) => {
  if (!foldername) return colors['grey-light'];
  const lowerName = foldername.toLowerCase();
  return folderMap[lowerName] || colors['grey-light'];
};

// Preloaded SVGs for common icons (inline for instant rendering)
const inlineSvgs = {
  'default': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M20.414,2H5V30H27V8.586ZM7,28V4H19v6h6V28Z"/></svg>',
  'folder': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M28.8 6.9H16.1V5.7c0-1.4-1.1-2.5-2.5-2.5H.6v25.6h30.6V9.4c.1-1.4-1-2.5-2.4-2.5z"/></svg>',
  'folder-open': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M28.8 6.9H16.1V5.7c0-1.4-1.1-2.5-2.5-2.5H.6v25.6h30.6V9.4c.1-1.4-1-2.5-2.4-2.5z"/><path d="M.6 28.8V12h30.6v16.8z" opacity="0.5"/></svg>',
};

import { useState, useEffect } from 'react';

const FileIcon = memo(({ filename, isFolder = false, isOpen = false, size = 16 }) => {
  const [svgContent, setSvgContent] = useState(null);
  
  const iconInfo = useMemo(() => {
    if (isFolder) {
      return { icon: 'folder', color: getFolderColor(filename) };
    }
    return getFileIconInfo(filename);
  }, [filename, isFolder]);

  useEffect(() => {
    let mounted = true;
    
    const loadIcon = async () => {
      const iconName = isFolder ? (isOpen ? 'folder' : 'folder') : iconInfo.icon;
      const svg = await loadSvg(iconName);
      if (mounted && svg) {
        setSvgContent(svg);
      }
    };
    
    loadIcon();
    
    return () => {
      mounted = false;
    };
  }, [iconInfo.icon, isFolder, isOpen]);

  // Use inline SVG as fallback while loading
  const displaySvg = svgContent || (isFolder ? inlineSvgs.folder : inlineSvgs.default);
  
  // Apply color only to folder icons and icons without fill
  // File icons from Seti UI already have their colors baked in
  let coloredSvg = displaySvg;
  
  if (isFolder) {
    // Folders need coloring
    if (displaySvg.includes('fill="')) {
      coloredSvg = displaySvg.replace(/fill="[^"]*"/g, `fill="${iconInfo.color}"`);
    } else {
      coloredSvg = displaySvg.replace(/<path/g, `<path fill="${iconInfo.color}"`);
    }
  } else if (!displaySvg.includes('fill="')) {
    // Only add fill if SVG doesn't have one (like default.svg)
    coloredSvg = displaySvg.replace(/<path/g, `<path fill="${iconInfo.color}"`);
  }
  // Otherwise keep original Seti UI colors

  // Normalize SVG to ensure consistent sizing
  // Add viewBox if missing and remove fixed width/height
  let normalizedSvg = coloredSvg
    .replace(/width="[^"]*"/g, '')
    .replace(/height="[^"]*"/g, '')
    .replace(/<svg/, `<svg width="${size}" height="${size}" style="display:block"`);
  
  // Add viewBox if not present
  if (!normalizedSvg.includes('viewBox')) {
    normalizedSvg = normalizedSvg.replace(/<svg/, '<svg viewBox="0 0 32 32"');
  }

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
      dangerouslySetInnerHTML={{ __html: normalizedSvg }}
    />
  );
});

FileIcon.displayName = 'FileIcon';

export default FileIcon;
